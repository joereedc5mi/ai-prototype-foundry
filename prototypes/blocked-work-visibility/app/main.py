import os
from datetime import datetime, timezone
from enum import Enum
from contextlib import asynccontextmanager
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SQLField, create_engine, Session, select, Relationship

# --- Database ---
DB_MODE = os.getenv("DB_MODE", "persistent") # "persistent" or "memory"

if DB_MODE == "memory":
    sqlite_url = "sqlite://" # In-memory SQLite
    print("Running in MEMORY mode (Data will be lost on exit)")
else:
    sqlite_file_name = "data/database.db"
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    print(f"Running in PERSISTENT mode (Data saved to {sqlite_file_name})")

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    if DB_MODE == "persistent":
        os.makedirs("data", exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# --- Models ---

class Status(str, Enum):
    BLOCKED = "blocked"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class UpdateNote(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    timestamp: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))
    text: str
    item_id: UUID = SQLField(foreign_key="blockeditem.id")
    item: "BlockedItem" = Relationship(back_populates="update_notes")

class BlockedItem(SQLModel, table=True):
    id: UUID = SQLField(default_factory=uuid4, primary_key=True)
    title: str
    description: str
    waiting_on: str
    owner: str
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))
    status: str = SQLField(default=Status.BLOCKED)
    resolved_at: Optional[datetime] = SQLField(default=None)
    warning_threshold_days: int = SQLField(default=3)
    last_updated_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))

    update_notes: List[UpdateNote] = Relationship(back_populates="item", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    @property
    def days_blocked(self) -> int:
        created_at = self.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        if self.status == Status.RESOLVED and self.resolved_at:
            resolved_at = self.resolved_at
            if resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=timezone.utc)
            delta = resolved_at - created_at
        else:
            delta = datetime.now(timezone.utc) - created_at
        return delta.days

    @property
    def age_display(self) -> str:
        created_at = self.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        if self.status == Status.RESOLVED and self.resolved_at:
            resolved_at = self.resolved_at
            if resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=timezone.utc)
            delta = resolved_at - created_at
        else:
            delta = datetime.now(timezone.utc) - created_at
            
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

    @property
    def is_overdue(self) -> bool:
        if self.status == Status.RESOLVED:
            return False
        return self.days_blocked >= self.warning_threshold_days

    @property
    def is_stale(self) -> bool:
        if self.status in [Status.RESOLVED, Status.IN_PROGRESS]:
            return False
        last_updated_at = self.last_updated_at
        if last_updated_at.tzinfo is None:
            last_updated_at = last_updated_at.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - last_updated_at
        return delta.days >= 2

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

class UpdateNoteRead(BaseModel):
    timestamp: datetime
    text: str

class BlockedItemRead(BaseModel):
    id: UUID
    title: str
    description: str
    waiting_on: str
    owner: str
    created_at: datetime
    status: Status
    resolved_at: Optional[datetime]
    warning_threshold_days: int
    last_updated_at: datetime
    update_notes: List[UpdateNoteRead]
    days_blocked: int
    age_display: str
    is_overdue: bool
    is_stale: bool

# --- App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="Blocked Work Visibility", lifespan=lifespan)

# --- API Routes ---

@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": os.getenv("APP_ENV", "local"),
        "app": "online",
    }

@app.post("/api/blocked", response_model=BlockedItemRead)
def create_item(item_in: BlockedItemCreate, session: Session = Depends(get_session)):
    new_item = BlockedItem(**item_in.model_dump())
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@app.get("/api/blocked", response_model=List[BlockedItemRead])
def get_items(session: Session = Depends(get_session)):
    items = session.exec(select(BlockedItem)).all()
    return items

@app.post("/api/blocked/{item_id}/updates", response_model=BlockedItemRead)
def add_update(item_id: UUID, update_in: BlockedItemUpdate, session: Session = Depends(get_session)):
    item = session.get(BlockedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status == Status.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot update resolved item")

    note = UpdateNote(text=update_in.note, item_id=item_id)
    item.update_notes.append(note)
    item.last_updated_at = datetime.now(timezone.utc)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.patch("/api/blocked/{item_id}", response_model=BlockedItemRead)
def update_item_status(item_id: UUID, update_in: BlockedItemStatusUpdate, session: Session = Depends(get_session)):
    item = session.get(BlockedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status == update_in.status:
        raise HTTPException(status_code=400, detail=f"Item already {update_in.status.value}")

    item.status = update_in.status
    item.last_updated_at = datetime.now(timezone.utc)

    if update_in.status == Status.RESOLVED:
        item.resolved_at = datetime.now(timezone.utc)
        note_text = f"Resolved: {update_in.reason}"
    elif update_in.status == Status.BLOCKED:
        item.resolved_at = None
        note_text = f"Re-blocked: {update_in.reason}"
    elif update_in.status == Status.IN_PROGRESS:
        item.resolved_at = None
        note_text = f"In Progress: {update_in.reason}"

    note = UpdateNote(text=note_text, item_id=item_id)
    item.update_notes.append(note)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item

# --- Static File Serving ---
# Try to find the React build first, then fall back to the static folder
base_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(base_dir, "frontend/dist") # For Docker multi-stage
if not os.path.exists(static_path):
    static_path = os.path.join(base_dir, "../frontend/dist") # For local dev
if not os.path.exists(static_path):
    static_path = os.path.join(base_dir, "static")
    if not os.path.exists(static_path):
        os.makedirs(static_path)

app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
