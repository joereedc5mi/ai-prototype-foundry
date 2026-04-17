import os
import json
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, computed_field

app = FastAPI(title="Blocked Work Visibility")

# --- Persistence ---
DATA_FILE = "data/items.json"

def save_to_disk():
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        # Convert UUIDs and Datetimes to strings for JSON
        json_data = [item.model_dump(mode='json') for item in items]
        json.dump(json_data, f)

# --- Models ---

class Status(str, Enum):
    BLOCKED = "blocked"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class UpdateNote(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    text: str

class BlockedItem(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    waiting_on: str
    owner: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: Status = Status.BLOCKED
    resolved_at: Optional[datetime] = None
    warning_threshold_days: int = 3
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    update_notes: List[UpdateNote] = Field(default_factory=list)

    @computed_field
    @property
    def days_blocked(self) -> int:
        if self.status == Status.RESOLVED and self.resolved_at:
            delta = self.resolved_at - self.created_at
        else:
            delta = datetime.now(timezone.utc) - self.created_at
        return delta.days

    @computed_field
    @property
    def age_display(self) -> str:
        if self.status == Status.RESOLVED and self.resolved_at:
            delta = self.resolved_at - self.created_at
        else:
            delta = datetime.now(timezone.utc) - self.created_at
            
        days = delta.days
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        
        parts = []
        if days > 0:
            parts.append(f"{days} day{'s' if days != 1 else ''}")
        if hours > 0 or days > 0:
            parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
        
        return ", ".join(parts)

    @computed_field
    @property
    def days_since_update(self) -> int:
        if self.status == Status.RESOLVED:
            return 0
        delta = datetime.now(timezone.utc) - self.last_updated_at
        return delta.days

    @computed_field
    @property
    def is_overdue(self) -> bool:
        if self.status == Status.RESOLVED:
            return False
        return self.days_blocked >= self.warning_threshold_days

    @computed_field
    @property
    def is_stale(self) -> bool:
        if self.status in [Status.RESOLVED, Status.IN_PROGRESS]:
            return False
        return self.days_since_update >= 2

def load_from_disk():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                return [BlockedItem(**item) for item in data]
        except (json.JSONDecodeError, KeyError, ValueError):
            return []
    return []

class BlockedItemCreate(BaseModel):
    title: str
    description: str
    waiting_on: str
    owner: str
    warning_threshold_days: Optional[int] = 3

class BlockedItemUpdate(BaseModel):
    note: str

class BlockedItemStatusUpdate(BaseModel):
    status: Status
    reason: str

class BlockedItemResponse(BlockedItem):
    model_config = {
        "from_attributes": True
    }

# --- In-memory storage ---
items: List[BlockedItem] = load_from_disk()

def make_response(item: BlockedItem) -> BlockedItemResponse:
    return BlockedItemResponse.model_validate(item)

# --- API Routes ---

@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": os.getenv("APP_ENV", "local"),
        "app": "online",
    }

@app.post("/api/blocked", response_model=BlockedItemResponse)
def create_item(item_in: BlockedItemCreate, background_tasks: BackgroundTasks):
    new_item = BlockedItem(**item_in.model_dump())
    items.append(new_item)
    background_tasks.add_task(save_to_disk)
    return make_response(new_item)

@app.get("/api/blocked", response_model=List[BlockedItemResponse])
def get_items():
    return [make_response(item) for item in items]

@app.post("/api/blocked/{item_id}/updates", response_model=BlockedItemResponse)
def add_update(item_id: UUID, update_in: BlockedItemUpdate, background_tasks: BackgroundTasks):
    for item in items:
        if item.id == item_id:
            if item.status == Status.RESOLVED:
                raise HTTPException(status_code=400, detail="Cannot update resolved item")
            item.update_notes.append(UpdateNote(text=update_in.note))
            item.last_updated_at = datetime.now(timezone.utc)
            background_tasks.add_task(save_to_disk)
            return make_response(item)
    raise HTTPException(status_code=404, detail="Item not found")

@app.patch("/api/blocked/{item_id}", response_model=BlockedItemResponse)
def update_item_status(item_id: UUID, update_in: BlockedItemStatusUpdate, background_tasks: BackgroundTasks):
    for item in items:
        if item.id == item_id:
            if item.status == update_in.status:
                raise HTTPException(status_code=400, detail=f"Item already {update_in.status.value}")
            
            item.status = update_in.status
            item.last_updated_at = datetime.now(timezone.utc)
            
            if update_in.status == Status.RESOLVED:
                item.resolved_at = datetime.now(timezone.utc)
                item.update_notes.append(UpdateNote(text=f"Resolved: {update_in.reason}"))
            elif update_in.status == Status.BLOCKED:
                item.resolved_at = None
                item.update_notes.append(UpdateNote(text=f"Re-blocked: {update_in.reason}"))
            elif update_in.status == Status.IN_PROGRESS:
                item.resolved_at = None
                item.update_notes.append(UpdateNote(text=f"In Progress: {update_in.reason}"))
                
            background_tasks.add_task(save_to_disk)
            return make_response(item)
    raise HTTPException(status_code=404, detail="Item not found")

# --- Static File Serving ---
# Mount this LAST so it doesn't override /api or /health routes
static_path = "static"
if not os.path.exists(static_path):
    os.makedirs(static_path)

app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
