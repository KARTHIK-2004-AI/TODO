# Sprint 5 Audit Report - Project Execution Engine

**Date**: 2026-07-28  
**Audit Type**: Read-only project health and deployment readiness review  
**Scope**: Sprint 5 backend, frontend integration, Prisma schema/migrations, tests, API docs, and deployment risk  
**Code Changes Made During Audit**: None

---

## Executive Summary

Sprint 5 has a strong feature foundation. The project has moved beyond a simple todo app into a project execution workflow with task lifecycle states, priority, dates, estimated effort, comments, attachment metadata, audit history, assignment, role-based permissions, and a frontend task details drawer.

However, Sprint 5 is **not production-ready yet**. The most important blockers are:

1. Backend tests are not fully passing.
2. Assignment notifications are duplicated.
3. Prisma schema and checked-in MySQL migrations are out of sync.
4. Attachments are currently metadata/simulated downloads, not real upload/storage.
5. Production security hardening is still incomplete.

**Deployment recommendation**: Do not deploy Sprint 5 to production until the critical blockers below are fixed and verified.

---

## Verification Results

### Backend

Command:

```powershell
npm.cmd test
```

Result:

- 8 backend test files executed.
- 27 tests passed.
- 1 test failed.

Failure:

- File: `backend/services/__tests__/eventRefactoring.test.ts`
- Test: `verifies that task assignment triggers exactly one activity event and one notification`
- Expected: 1 notification
- Actual: 2 notifications

Command:

```powershell
npm.cmd run build
```

Result:

- Backend TypeScript build passed.

### Frontend

Command:

```powershell
npm.cmd test
```

Result:

- 3 frontend test files passed.
- 4 tests passed.

Command:

```powershell
npm.cmd run build
```

Result:

- Frontend TypeScript and Vite production build passed.
- Vite warning: `src/api.ts` is dynamically imported by `src/App.tsx` but also statically imported elsewhere, so dynamic import will not split that module into a separate chunk.

---

## What Is Working Well

### 1. Sprint 5 Backend Is Real Implementation

The backend now has real service-level functionality for:

- Task priority.
- Task lifecycle status.
- Start date and due date validation.
- Estimated hours.
- Assignment and unassignment.
- Task comments.
- Attachment metadata.
- Task audit history.
- Review approval and rejection events.

Main reference:

- `backend/services/taskService.ts`

### 2. Role-Based Permission Rules Are Mostly Strong

Good protections are present:

- Non-team members cannot access team tasks.
- Members can only update tasks assigned to them.
- Members cannot assign tasks to other users.
- Members cannot directly move tasks to `DONE`.
- Attachment upload is limited to owners/admins or the assigned member.
- Attachment deletion is limited to uploader or owners/admins.

Main reference:

- `backend/services/taskService.ts`

### 3. Audit History Is Valuable

The system records useful task history events:

- `TASK_CREATED`
- `TASK_ASSIGNED`
- `STATUS_CHANGED`
- `COMMENT_ADDED`
- `ATTACHMENT_UPLOADED`
- `PRIORITY_CHANGED`
- `DUE_DATE_CHANGED`
- `ESTIMATED_HOURS_CHANGED`
- `REVIEW_APPROVED`
- `REVIEW_REJECTED`

This is a good base for future activity timelines, compliance views, user accountability, and debugging.

### 4. Frontend Sprint 5 UX Exists

The frontend includes:

- Task details drawer.
- Status selector.
- Priority selector.
- Assignee selector.
- Start/due date controls.
- Estimated effort input.
- Comments/discussion thread.
- Attachment list and download link.
- Audit history timeline.
- List and Kanban board views.
- Filters for search, completion, priority, status, assignee, and due date.

Main references:

- `frontend/src/components/TaskDetailsDrawer.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/hooks/useTodos.ts`

---

## Critical Problems

### P0 - Backend Test Failure: Duplicate Assignment Notifications

Current backend tests fail because assignment creates two notifications for the assigned user when the test expects exactly one.

Risk:

- Users may receive duplicate notifications.
- Activity/notification counts become unreliable.
- This can get worse as more event handlers are added.
- It blocks a clean release because the test suite is red.

Evidence:

- `backend/services/__tests__/eventRefactoring.test.ts`
- Failed assertion: expected notification count `1`, received `2`.

Likely area to inspect:

- `backend/services/eventService.ts`
- `backend/services/taskService.ts`
- Any direct notification creation plus event-driven notification creation for the same assignment.

Recommended fix:

- Ensure task assignment has exactly one source of notification truth.
- Keep activity logging and notification creation centralized in the event listener, or keep it in service logic, but not both.
- Re-run backend tests after fixing.

---

### P0 - Prisma Schema and Migration Drift

The Prisma schema contains Sprint 5 models and columns, but the checked-in MySQL migration does not create them.

Schema includes:

- `Todo.priority`
- `Todo.status`
- `Todo.dueDate`
- `Todo.startDate`
- `Todo.estimatedHours`
- `Todo.completedAt`
- `TaskComment`
- `TaskAttachment`
- `TaskHistory`
- `TaskPriority`
- `TaskStatus`

Migration currently appears to create an older baseline and does not include the Sprint 5 structures.

Risk:

- A fresh production database deploy may start with missing tables/columns.
- Runtime Prisma queries may fail.
- CI/CD deploys using migrations may not match local development state.
- Future developers may not be able to reproduce the database correctly.

Main references:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260728000000_init_mysql_baseline/migration.sql`

Recommended fix:

- Generate and commit a proper migration for Sprint 5 schema changes.
- Test against a fresh database using migrations only.
- Avoid relying on `prisma db push` as the production source of truth.

---

### P0 - Attachments Are Not Real File Uploads

The frontend currently creates attachment metadata from a selected file, but it does not upload the actual file content.

Observed behavior:

- Frontend sends metadata with `storagePath: /uploads/<fileName>`.
- Backend stores metadata.
- Download endpoint either downloads from the path if it exists, or generates simulated content.

Risk:

- Users will believe files are attached, but actual files may not exist.
- Production data can contain attachment records that cannot be recovered.
- Download behavior is misleading.
- Real file size/content may not match stored metadata.

Main references:

- `frontend/src/components/TaskDetailsDrawer.tsx`
- `backend/index.ts`
- `backend/api/todoRouter.ts`

Recommended fix:

- Either implement real upload storage before release, or clearly mark attachments as metadata-only and remove/disable download.
- Add upload validation, file size limits, allowed MIME types, storage path normalization, and secure download logic.

---

## High-Risk Problems

### P1 - Attachment Download Path Safety

The backend resolves the stored `storagePath` and downloads from it if the file exists.

Risk:

- If unsafe storage paths enter the database, this can become an arbitrary file download risk.
- Relative paths are resolved from process working directory.
- There is no obvious enforced uploads root.

Recommended fix:

- Store files under a controlled uploads directory.
- Store only server-generated object keys/relative IDs, not raw paths.
- Reject absolute paths from client input.
- Normalize paths and ensure resolved paths stay inside the upload root.

---

### P1 - Production Security Defaults Are Too Open

Current concerns:

- `cors()` is open to all origins.
- JWT auth has a hardcoded fallback secret.
- Production startup does not appear to fail when `JWT_SECRET` is missing or placeholder.

Risk:

- Unsafe cross-origin access in production.
- Token signing may use weak/default secret if environment is misconfigured.

Main references:

- `backend/index.ts`
- `backend/services/authService.ts`
- `backend/middleware/auth.ts`

Recommended fix:

- Configure explicit CORS origin allowlist.
- Fail fast in production if `JWT_SECRET` is missing or placeholder.
- Add environment validation on server startup.

---

### P1 - Documentation Has False/Outdated Statements

The Sprint status document says backend tests are fully passing, but the current backend test run fails.

The API docs still say any team member can edit/delete shared todos, which conflicts with Sprint 5 role and assignment rules.

Risk:

- Developers may implement frontend/API clients against wrong behavior.
- QA may validate the wrong permission model.
- Project managers may believe Sprint 5 is more complete than it is.

Main references:

- `project-management/CURRENT_SPRINT.md`
- `shared/API.md`

Recommended fix:

- Update Sprint 5 status after fixes.
- Update API permissions to match current backend behavior.
- Add a dedicated permission matrix table.

---

## Medium-Risk Problems

### P2 - Task Drawer Saves Too Aggressively

Some fields trigger API updates immediately on change:

- Title.
- Status.
- Priority.
- Estimated hours.

Risk:

- Too many API calls.
- Accidental partial saves.
- Race conditions if users change fields quickly.
- Poor UX on slow networks.

Recommended fix:

- Use local draft state with explicit Save/Cancel, or debounce field updates.
- Keep status transitions explicit because they have workflow meaning.

---

### P2 - Completion Boolean and Status Lifecycle Can Drift

The app still has legacy `completed` behavior while Sprint 5 adds `status`.

Current mapping:

- `completed: true` maps to `DONE`.
- `completed: false` maps to `TODO`.

Risk:

- A task in `IN_PROGRESS` or `IN_REVIEW` can be collapsed back to `TODO` through old toggle behavior.
- List filters may conflict with lifecycle status.
- Users may not understand why "complete" and "status" behave differently.

Recommended fix:

- Decide whether `completed` remains public API or becomes derived from `status`.
- Prefer treating `status` as the source of truth.
- Update frontend toggle behavior to respect the lifecycle.

---

### P2 - Tests Depend on Running HTTP Server

The event refactoring test uses live fetch calls to `http://127.0.0.1:4000`.

Risk:

- Tests may fail in CI if the backend server is not already running.
- Port conflicts can create flaky results.
- The test suite is less self-contained.

Recommended fix:

- Use Supertest or direct Express app testing.
- Avoid depending on an external running server for integration tests.

---

### P2 - Generated Prisma Client Appears in Repo Tree

The repository has `backend/prisma/client` generated output, and `.gitignore` excludes it.

Risk:

- Generated artifacts may accidentally drift from schema.
- Large binary engine files increase local clutter.
- Developers may unknowingly use stale generated client files.

Recommended fix:

- Confirm generated client files are not committed.
- Regenerate client during install/build.
- Keep generated output out of source control.

---

## Lower-Risk Issues / Polish

### P3 - Mojibake / Encoding Problems in Docs and UI Text

Some text displays as corrupted characters such as `ðŸ...`, `Â·`, and similar artifacts.

Risk:

- Unprofessional appearance.
- Confusing documentation.
- UI looks broken even if logic works.

Recommended fix:

- Normalize affected Markdown and TSX files to UTF-8.
- Replace corrupted icon text with proper text or stable icons.

---

### P3 - Vite Dynamic Import Warning

Vite warns that `src/api.ts` is both dynamically and statically imported.

Risk:

- Not a functional blocker.
- Bundle splitting expectation is ineffective.

Recommended fix:

- Either remove the dynamic import or avoid static imports if code splitting is intended.

---

## Feature Status Matrix

| Feature | Status | Notes |
|---|---|---|
| Task priority | Working | Backend and frontend present. |
| Task status lifecycle | Mostly working | Needs better `completed` compatibility handling. |
| Role-based task updates | Mostly working | Tests cover important cases. |
| Review approval/rejection | Working base | Needs UX and notification verification. |
| Comments | Working | CRUD and ownership checks present. |
| Attachment metadata | Partially working | Metadata works; real file upload does not. |
| Attachment download | Not production-ready | Simulated fallback and path safety risk. |
| Audit history | Working base | Good foundation for traceability. |
| Kanban board | Working base | No drag/drop workflow yet. |
| Advanced filters | Mostly working | Due filter is frontend-only. |
| Notifications | Buggy | Duplicate assignment notification. |
| Prisma migration readiness | Blocked | Migration does not match schema. |
| Production security | Not ready | CORS and JWT defaults need hardening. |

---

## Recommended Fix Order

### Release Blockers

1. Fix duplicate assignment notifications.
2. Add/repair Prisma migrations for Sprint 5 schema.
3. Verify fresh database setup from migrations.
4. Decide attachment release behavior:
   - implement real upload/storage, or
   - mark as metadata-only and disable download.
5. Harden JWT and CORS for production.
6. Re-run backend tests, frontend tests, backend build, and frontend build.

### Before QA Sign-Off

1. Update `CURRENT_SPRINT.md` with accurate test status.
2. Update `shared/API.md` permission rules.
3. Add a permission matrix for task actions.
4. Test owner/admin/member flows manually.
5. Test private task and team task behavior separately.
6. Test assignment, unassignment, status review, comments, attachments, and audit timeline.

### Before Production

1. Add environment validation.
2. Add real upload size/type restrictions if attachments ship.
3. Add rate limiting or request size protections.
4. Confirm `.env` files and generated clients are not committed.
5. Run production-like smoke test on a fresh database.

---

## Suggested Acceptance Criteria for Sprint 5 Completion

Sprint 5 should be marked complete only when:

- Backend tests pass 100%.
- Frontend tests pass 100%.
- Backend build passes.
- Frontend build passes.
- Prisma migrations reproduce the current schema on a fresh database.
- Assignment creates exactly one notification.
- Attachment behavior is honest and production-safe.
- API docs match actual permissions.
- Production startup refuses unsafe missing secrets.
- CORS is configured for known frontend origins.

---

## Final Assessment

Sprint 5 is a strong functional sprint, but it is currently a **feature-complete draft**, not a deployable release.

The biggest future tragedy would be deploying with migration drift: the app may work locally because the database was pushed manually, but a fresh production environment could fail immediately due to missing tables and columns.

The second biggest issue is attachment behavior. Users will trust that files are stored, but the current implementation only stores metadata and can generate fake download content. That should not ship without either a real storage implementation or clear product limitations.

Once the duplicate notification bug, migration drift, attachment behavior, and security defaults are fixed, Sprint 5 will be in a much healthier position for QA and deployment.
