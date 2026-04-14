# Blocked Work Visibility Prototype: Requirements

This document outlines the features and technical requirements for the Blocked Work Visibility Prototype.

## Project Goal
A lightweight application for logging and managing blocked work items to improve visibility and resolution speed.

## Core Features
- [ ] Log a blocked work item with title, description, and status.
- [ ] List all blocked items with filtering and sorting options.
- [ ] Update the status of a blocked item (e.g., Blocked, In Progress, Resolved).
- [ ] Dashboard view showing summary statistics of blocked work.

## Technical Requirements
- **Frontend:** React or Angular with Vanilla CSS.
- **Backend:** Node.js (Express) or Python (FastAPI).
- **Database:** Cloud SQL (PostgreSQL) for production, local container for dev.
- **Deployment:** GCP Cloud Run via `gcp-infra-simple` pattern.
- **Local Validation:** Docker Compose.
