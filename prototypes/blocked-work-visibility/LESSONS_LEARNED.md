# Lessons Learned - Blocked Work Visibility Prototype

## Architecture Decisions

### 1. SQLite over In-Memory/JSON
Initially, the prototype used an in-memory list which was unsuitable for stateless environments like GCP Cloud Run. Transitioning to **SQLite (via SQLModel)** provided several benefits:
- **Persistence**: Data survives container restarts and local dev reloads.
- **Relational Integrity**: Using `Relationship` in SQLModel made managing `UpdateNotes` cleaner than manual list manipulation.
- **Production Path**: SQLModel makes it trivial to swap SQLite for PostgreSQL on Cloud SQL by simply changing the connection string.

### 2. React + Tailwind CSS v4
Moving from vanilla HTML/JS to **React and Tailwind CSS v4** significantly improved development speed and UI quality:
- **Component Logic**: Managing complex state (like filtering and sorting) is much more predictable in React than with manual DOM manipulation.
- **Utility-First Styling**: Tailwind CSS v4 allowed for a polished, modern look with very little custom CSS. Utility classes like `border-l-4` for highlighting overdue/stale items proved very effective.

### 3. Unified Container Serving
Serving the React build through FastAPI's `StaticFiles` continues to be a winning pattern for prototypes:
- **Zero CORS issues**: Frontend and API share the same origin.
- **Single Deployment Unit**: One container to build, test, and deploy.

## Technical Tips

- **SQLModel & Pydantic v2**: Ensure you are using the latest versions to take advantage of improved validation and performance.
- **Playwright for E2E**: Even for small prototypes, E2E tests are invaluable for verifying that the "Log Blocker -> View -> Update" flow remains unbroken across refactors.
- **Statelessness**: Always design with the assumption that the local filesystem is ephemeral, except for designated volumes (like the SQLite database path).

## Future Considerations

- **Authentication**: For a real tool, adding Google OAuth via FastAPI would be the next logical step.
- **Webhooks**: Integrating with Slack or Teams to notify owners when an item becomes "Overdue" or "Stale".
