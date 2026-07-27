# Sprint 4: Notification Center & Activity Timeline

**Status**: Complete  
**Owner**: Full Stack Engineer  
**Sprint Type**: Major Feature Sprint  
**Sprint Goal**: Introduce an event-driven architecture to automatically log user/team activity events and generate corresponding real-time notification records. Deliver user-friendly frontend components for displaying notifications and tracking activity history.

---

## 📋 Completed Tasks

### Task 1 — Database Schema & ORM
- [x] Defined `Notification` and `ActivityLog` Prisma models in `schema.prisma`.
- [x] Pushed schema changes to MySQL dev and test databases.
- [x] Generated updated Prisma client.

### Task 2 — Event-Driven Core Layer
- [x] Created `EventService` utilizing Node's `EventEmitter` to process mutations asynchronously.
- [x] Configured listeners for Todo events (`todo.created`, `todo.completed`, etc.) and Team events (`team.created`, `team.renamed`, `team.deleted`, `team.invited`, etc.).
- [x] Registered handlers to create activity logs and notifications for team members.

### Task 3 — Backend Services & Routers
- [x] Created `NotificationService` for managing CRUD operations on notifications.
- [x] Created `ActivityService` supporting paginated and filtered activity queries.
- [x] Added `notificationRouter` and `activityRouter` REST APIs.
- [x] Implemented a `GET /api/teams/:teamId/activity` endpoint inside `teamRouter`.

### Task 4 — Backend Automated Tests
- [x] Added `notificationService.test.ts` integration tests.
- [x] Added `activityService.test.ts` integration tests.
- [x] Standardized `vitest.config.ts` to sequential execution and verified that all 18 backend tests pass cleanly.

### Task 5 — Frontend Integration & UI
- [x] Defined TypeScript models for Notification and ActivityLog in `types.ts`.
- [x] Implemented API client helper methods for fetching notifications and activities.
- [x] Created `NotificationCenter` dropdown component with custom bell animation and unread counts.
- [x] Created `ActivityTimeline` page supporting workspace dropdown switching, category tabs, and pagination.
- [x] Wired navigation and routing for the timeline page in `App.tsx` and header `Layout.tsx`.

### Task 6 — Documentation
- [x] Updated `shared/API.md` with REST API specs for Notifications and Timelines.
- [x] Updated `shared/STATUS.md`, `shared/BLOCKERS.md`, and `DATABASE.md`.
- [x] Logged changes in `project-management/CHANGELOG.md`.
