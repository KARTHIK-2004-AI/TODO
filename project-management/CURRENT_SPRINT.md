# Sprint 5: Project Execution Engine

**Status**: Active / Backend Complete  
**Owner**: Senior Backend Engineer  
**Sprint Type**: Major Backend Engine Sprint  
**Sprint Goal**: Transform the workspace into a project execution engine by introducing task extensions (priority, status lifecycle, dates, estimatedHours), discussions comments, attachment metadata, audit trails, and role-based validation constraints.

---

## 📋 Task Delivery Progress

### Task 1 — Database Schema & ORM
- [x] Defined `TaskPriority` and `TaskStatus` enums.
- [x] Extended `Todo` model with planning and state columns (`priority`, `status`, `dueDate`, `startDate`, `estimatedHours`, `completedAt`).
- [x] Defined `TaskComment`, `TaskAttachment`, and `TaskHistory` models in `schema.prisma`.
- [x] Pushed schema updates to development and test databases.
- [x] Generated the custom Prisma Client.

### Task 2 — Service Layer Architecture
- [x] Extended `TaskService` with role permissions checking (determining if the actor is OWNER, ADMIN, or MEMBER).
- [x] Enforced strict allowed status transitions (TODO -> IN_PROGRESS -> IN_REVIEW) and blocked direct DONE transitions for regular members.
- [x] Implemented discussion comments CRUD (creating comments, updating own comments, deleting own comments).
- [x] Implemented attachment metadata logging and deletion.
- [x] Integrated automated `TaskHistory` audit logger.

### Task 3 — API Endpoints
- [x] Configured `todoRouter.ts` to mount interchangeably on both `/api/todos` and `/api/tasks`.
- [x] Added task comments CRUD endpoints.
- [x] Added task attachment logging and standalone deletion endpoints.
- [x] Implemented assign/unassign helper triggers.
- [x] Mounted standalone `/api/comments` and `/api/attachments` endpoints in the entrypoint `index.ts`.

### Task 4 — QA and Automated Tests
- [x] Created `taskSprint5.test.ts` integration suite verifying transition limits, range bounds, comment rules, and histories.
- [x] Refactored `teamService.test.ts` properties assertions.
- [x] Created `eventRefactoring.test.ts` to assert that one task save generates exactly one timeline record, check notifications on assignments, and verify the attachment download permissions.
- [x] Verified 100% test completion (28/28 backend integration tests passing).
- [x] Resolved Prisma migration drift by adding the `20260728120000_sprint_5_models` migration script.
- [x] Confirmed backend compiler production builds and development server startup.
