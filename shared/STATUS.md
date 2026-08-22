# Project Status

## Current Milestones

- **Phase 1: Setup & Architecture**: Complete (Sprints 1, 2, 2.1)
- **Phase 2: Database Schema**: Complete (Extended schema with User, Team, TeamMember, TeamInvite, Todo, Notification, ActivityLog, ChatMessage, CommentReadStatus, and EmailQueue models; migrated to MySQL in Sprint 3)
- **Phase 3: Middlewares & Auth**: Complete (CORS, JWT auth, input validation, error handling)
- **Phase 4: API Endpoints & Routes**: Complete (Auth, todos, profile, accounts, teams, invites, comments, attachments, chat, notifications, and activity timeline routes)
- **Phase 5: Integration & Testing**: Complete (Frontend proxy configured; Jest/Vitest automated testing suites set up for backend and frontend)
- **Phase 6: User Profile & Account Management**: Complete (Settings, bio, change-password, preferences, account deletion with cascading cleanups)
- **Phase 7: Notification Center & Activity Timeline**: Complete (Sprint 4 completed: Event-driven architecture, Notification Service, Activity Logs service, and unread badges)
- **Phase 8: Project Execution Engine**: Complete (Sprint 5 completed: Task priority, status lifecycle, start/due dates, estimated hours, comment CRUD, attachment metadata, audit history timeline, and TaskDetailsDrawer)
- **Phase 9: Real-Time & Communications Engine**: In Progress (Sprint 6 active: WebSockets integration, Workspace General Chat with @mentions, typing indicators, Shared Files panel, and background email queue worker for verification, resets, invites, and task due/overdue reminders)
- **Phase 10: Enterprise & Production Hardening**: Planned (Sprints 7, 8, 9, 10 roadmap)

## Status Summary

- **Sprint 1 — Core Auth & Workspace**: Node.js + Express + TypeScript backend with Prisma ORM (SQLite). Auth and todo CRUD endpoints working. React frontend with basic auth/dashboard flows.
- **Sprint 2 — Profile & Account Management**: Added profile fields (bio, phone, avatar, timezone) and endpoints (GET/PUT `/profile`, PUT `/change-password`, GET/PUT `/account/settings`, and secure DELETE `/account`).
- **Sprint 2.1 — Engineering Cleanup**: Removed committed credentials, normalized `.env.example`, created root `.gitignore`, and set up MySQL dev guidelines.
- **Sprint 3 — Teams & Shared Workspace**: Added `Team`, `TeamMember`, and `TeamInvite` tables. Implemented owner/admin/member roles and invite acceptance/rejection backend logic. Migrated from SQLite to MySQL 8.0.
- **Sprint 3.1 — Frontend Sync**: Connected the frontend client to team APIs (create, list, invite, accept, rename, change role, and remove member) and aligned types.
- **Sprint 3.2 — Test Infrastructure & Refactoring**: Split monolithic frontend components into pages, custom hooks, and layout shells. Configured Vitest automated testing suites for backend and frontend.
- **Sprint 4 — Notification Center & Activity Timeline**: Decoupled core logic from timeline logging and notifications using Node's `EventEmitter`. Added frontend Notification dropdown, unread badges, and Activity Timeline filters.
- **Sprint 5 — Project Execution Engine**: Implemented task status workflow (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE`), priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), effort estimates, start/due date constraints, comments CRUD, attachments metadata logging, and audit trail ledger. Integrated UI into `TaskDetailsDrawer`.
- **Sprint 6 — Real-time Collaboration & Notifications (In-Progress)**:
  - **Real-Time WebSockets**: Set up `/socket` gateway mapping connections to user workspaces, task drawers, comment typing statuses, and heartbeats (online/away).
  - **Workspace Chat**: Added team generalized chat room component with custom search, page scrolls, and inline @mentions list of team members.
  - **Shared Files Panel**: Grouped files by name to display version history, size breakdowns, and total storage limits.
  - **Email Service**: Added database-driven `EmailQueue` background processor executing sweeps every 10s. Sends verification links, password reset codes, workspace invites, and task due/overdue notifications.
  - *Current Focus*: Resolving compilation and integration issues in both servers and fixing test failures.

## Architecture

- **Backend**: http://localhost:4000 (Express server with WebSocket support on `/socket`)
- **Frontend**: http://localhost:5173 (React/Vite app proxying `/api` and `/socket` to local backend)
- **ORM / Database**: Prisma ORM with MySQL 8.0 (`mysql://root:password@localhost:3306/tododb`)
- **Notification Bus**: Node.js `EventEmitter` for local async pub/sub
- **Email Worker**: Periodic background sweeps polling database `EmailQueue` (saves email HTML files to `backend/emails_log/` in development)

## Upcoming Roadmap (To Build)

### Sprint 7 — Enterprise Administration (Planned)
- Introduce `Organization` and `OrganizationMember` models (Owner, Admin, Member roles).
- Support organizational scoping (teams belonging optionally to an organization).
- Implement admin management UI (User Management tables, member invite/revoke/role changes, and organizational activity logging).

### Sprint 8 — Performance & Reliability (Planned)
- Database indexing on key fields (`Todo.userId`, `Todo.teamId`, `Todo.dueDate`, `Todo.priority`, `Notification.userId`).
- Query caching layer (in-memory LRU cache) for read-heavy operations.
- API rate limiting (express-rate-limit) on authentication and auth router endpoints.
- Route-based code splitting (`React.lazy` + `Suspense`) and frontend long-list virtualization.

### Sprint 9 — Production Infrastructure (Planned)
- Containerization: Multi-stage `Dockerfile` configurations for both backend and frontend.
- Hardening: CORS origin allowlist configurations, helmet integration, and strict server startup validations refusing to launch on default/unsafe secrets.
- CI/CD Pipelines: GitHub Actions workflows verifying `lint`, `test`, and `build` on pull requests.

### Sprint 10 — Release Candidate & Version 1.0 (Planned)
- Complete end-to-end regression testing across the entire system.
- Formal security audit validating JWT rotation, password hashing, and role checks on all routes.
- Performance profiling and benchmarking under load (larger seeded database).
- Accessibility (a11y) pass on notifications, Kanban board, timeline, and color indicators.
- Final documentation and version tag `v1.0.0` release.
