# Blocked Work Visibility Prototype

A lightweight application for logging and managing blocked work items to improve visibility and resolution speed.

## Features

- **Log Blockers**: Capture titles, descriptions, and owners.
- **Dashboard**: High-level statistics of work status.
- **Status Lifecycle**: Track items through Blocked, In Progress, and Resolved states.
- **Auto-Highlighting**: Visual cues for "Overdue" (blocked > 3 days) and "Stale" (no update > 2 days) items.
- **History**: Full audit trail of updates and status changes.
- **Filter & Sort**: Easily find items by status or duration.

## Tech Stack

- **Backend**: FastAPI (Python 3.12)
- **Database**: SQLite (via SQLModel)
- **Frontend**: React (Vite) + Tailwind CSS v4
- **Testing**: Pytest (Backend), Playwright (E2E)

## Getting Started

### Local Development

1. **Install Backend Dependencies**:
   ```bash
   cd app
   pip install -r requirements.txt
   ```

2. **Run Backend**:
   ```bash
   python main.py
   ```
   *Note: If the `dist` folder is missing (it should be in `../frontend/dist` or `./frontend/dist`), it will fallback to a legacy static view.*

3. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Build Frontend**:
   ```bash
   npm run build
   ```

### Docker

Build and run the entire stack with one command:

```bash
docker-compose up --build
```

## Testing

### Backend Tests
```bash
cd app
pytest
```

### E2E Tests
```bash
npx playwright test
```

## Deployment

Designed for **GCP Cloud Run**. Ensure a persistent volume is mounted to `/app/data` to preserve the SQLite database, or swap for Cloud SQL (PostgreSQL).
