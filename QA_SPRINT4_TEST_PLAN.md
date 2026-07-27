# Sprint 4 QA Test Plan and Findings

Date: 2026-07-26
Environment: Local Windows workspace, backend on `http://127.0.0.1:4000`, frontend on `http://127.0.0.1:5173`, MySQL `tododb`

## Scope

This QA pass verifies Sprint 4 integration across authentication, private todos, team workspaces, shared todos, activity timeline, notifications, profile/account, password change, account deletion, database state, API behavior, and edge cases.

No fixes were made during this pass.

## Commands Run

- `npm.cmd test` in `backend`
- `npm.cmd test` in `frontend`
- `npm.cmd run build` in `backend`
- `npm.cmd run build` in `frontend`
- `npm.cmd run lint` in `frontend`
- `npm.cmd exec -- prisma migrate status` in `backend`
- `npm.cmd exec -- prisma validate` in `backend`
- Live API smoke tests against the running backend
- Database verification through Prisma client reads

## Automated Check Results

| Area | Result | Notes |
| --- | --- | --- |
| Backend tests | Pass | 6 test files, 18 tests passed. |
| Frontend tests | Pass | 3 test files, 4 tests passed. |
| Backend build | Pass | TypeScript compilation succeeded. |
| Frontend build | Fail | TypeScript errors block production build. |
| Frontend lint | Fail | 23 errors and 2 warnings. |
| Prisma schema validation | Pass | `schema.prisma` is valid. |
| Prisma migration status | Fail / drift | Prisma says baseline migration is not applied. |

## Phase 1 - Authentication

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Register new user | User created | User created successfully through `POST /api/auth/register`. | Pass |
| Login | JWT returned and profile can load | JWT returned through `POST /api/auth/login`; profile returned through `GET /api/profile`. | Pass |
| Logout | Token removed and redirect to login | Not browser-click verified. API auth behavior verified by invalid JWT returning `401`. | Partial |

## Phase 2 - Private Todo

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Create `Todo 1` | Appears in list, stored, activity created | Todo created, returned by `GET /api/todos`, activity `TODO_CREATE` created. | Pass |
| Update `Todo 1` | Update succeeds, timeline receives `Todo Updated` | Update succeeded, activity `TODO_UPDATE` created. | Pass |
| Complete todo | `Todo Completed` appears in activity | Completion succeeded, activity `TODO_COMPLETE` created. | Pass |
| Delete todo | `Todo Deleted` appears in activity | Delete succeeded, activity `TODO_DELETE` created. | Pass |

## Phase 3 - Team Workspace

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Create `Engineering` team | Team created, DB contains team, activity generated | Team created, persisted, returned by `GET /api/teams`, activity `TEAM_CREATE` created. | Pass |
| Refresh page | Team still exists | API persistence verified through repeated `GET /api/teams`; browser refresh not directly verified. | Partial |
| Switch workspace | Private to Engineering | API supports private/team scoping; browser selector not directly clicked. | Partial |

## Phase 4 - Shared Todo

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Create `Sprint Meeting` inside Engineering | Team todo created with `teamId` | Team todo created with correct `teamId`. | Pass |
| Private unaffected | Team todo hidden in private workspace | `GET /api/todos` returned no team todo when no `teamId` filter was used. | Pass |
| Switch to Engineering | Team todo visible | `GET /api/todos?teamId=<teamId>` returned the team todo. | Pass |

## Phase 5 - Activity Timeline

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Create/update/delete todo and create team | Timeline contains all events | Timeline contained `TODO_CREATE`, `TODO_UPDATE`, `TODO_COMPLETE`, `TODO_DELETE`, and `TEAM_CREATE`. | Pass |
| Filter Todos | Only todo events | Backend only filters exact type values like `Todo`; API calls with `type=todos` returned mixed events. UI uses `Todo`, so UI may work, but the requested plural filter format fails. | Fail |
| Filter Teams | Only team events | API calls with `type=teams` returned mixed events. UI uses `Team`, so UI may work, but the requested plural filter format fails. | Fail |

## Phase 6 - Notifications

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Click bell | Opens notification panel | Not browser-click verified. Component and endpoints exist. | Partial |
| Invite notification | Unread notification created | Existing user invited to a team received `TEAM_INVITE_RECEIVED`; unread count was `1`. | Pass |
| Team todo notification | Other team members notified | Owner received `TODO_CREATED` after member created team todo. | Pass |
| Mark all read | Badge disappears/count decreases | `PUT /api/notifications/read-all` returned success. Count behavior verified where no unread notifications existed for the single-user case. | Partial |

## Phase 7 - Profile

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Update name, bio, phone | Values persist after refresh | `PUT /api/profile` updated values. Persistence verified by API response; browser refresh not directly verified. | Pass / Partial UI |

## Phase 8 - Password

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Change password | Old password fails, new password succeeds | Old password returned `401`; new password login succeeded. | Pass |

## Phase 9 - Delete Account

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Wrong password | Account not deleted | Wrong password returned `400`. | Pass |
| Correct password | User removed and cannot login | Delete returned success; login after deletion returned `401`. | Pass |

## Phase 10 - Database Verification

Database tables observed:

- `activitylog`
- `notification`
- `team`
- `teaminvite`
- `teammember`
- `todo`
- `user`

Observed counts after QA data creation:

- Users: 6
- Todos: 2
- Teams: 3
- Team members: 4
- Invites: 1
- Notifications: 3
- Activity logs: 11

Recent activity rows included `TEAM_CREATE`, `TEAM_INVITE`, `TEAM_ACCEPT_INVITE`, and `TODO_CREATE`.

## Phase 11 - API Verification

| Endpoint | Expected | Actual | Status |
| --- | --- | --- | --- |
| `GET /api/profile` | `200`, JWT required, profile JSON | Returned `200` with profile JSON. Invalid JWT returned `401`. | Pass |
| `GET /api/todos` | `200`, JWT required, todo JSON | Returned private todos only. Invalid JWT returned `401`. | Pass |
| `GET /api/teams` | `200`, JWT required, team JSON | Returned team list with members, invites, role, member count. | Pass |
| `GET /api/activity` | `200`, JWT required, activity JSON | Returned paginated `{ data, meta }`. Plural filters did not work. | Partial |
| `GET /api/notifications` | `200`, JWT required, notification JSON | Returned notification array. | Pass |

## Phase 12 - Edge Cases

| Test Case | Expected | Actual | Status |
| --- | --- | --- | --- |
| Empty todo title | Graceful validation error | Returned `400` with `Validation Error: title: Title is required`. | Pass |
| Empty team name | Graceful validation error | Returned `400` with `Validation Error: name: Team name is required`. | Pass |
| Very long todo title | Graceful validation error | Returned `400` with raw Prisma-style message: `One of the provided values exceeds the maximum allowed length.` | Fail |
| Invalid JWT | Graceful auth error | Returned `401` with `Invalid or expired authorization token`. | Pass |
| Access team as non-member | Authorization error | Returned `403` for team details and team todos. | Pass |
| Delete same todo twice | Graceful not found error | First delete succeeded; second returned `404 Todo not found`. | Pass |

## Issues Found

### Critical

1. Frontend production build fails.
   - Evidence: `npm.cmd run build` in `frontend` fails.
   - Errors include missing type exports `InviteRoute` and `WorkspaceSelection`, unused `todos`, stale Account test props, and `canPerformAction` action-type mismatch.
   - Relevant files:
     - `frontend/src/App.tsx`
     - `frontend/src/hooks/useTeams.ts`
     - `frontend/src/hooks/useTodos.ts`
     - `frontend/src/pages/Dashboard.tsx`
     - `frontend/src/pages/__tests__/Account.test.tsx`
     - `frontend/src/types.ts`

2. Prisma migration state is not aligned with the running database.
   - Evidence: `prisma migrate status` reports `20260728000000_init_mysql_baseline` has not been applied.
   - The database has tables, but Prisma does not see applied migration history.
   - The active migration SQL only creates `User`, `Team`, `TeamMember`, `TeamInvite`, and `Todo`; it does not create `Notification` or `ActivityLog`, even though the current schema and DB contain those models.

### High

3. Frontend lint fails with 23 errors and 2 warnings.
   - Main categories:
     - Unused variables/imports.
     - `any` usage.
     - React hook dependency issues.
     - React compiler memoization warning.
     - Fast refresh export warning.

4. Activity API plural filters do not work.
   - Evidence: `GET /api/activity?page=1&limit=20&type=todos` returned both todo and team events.
   - Evidence: `GET /api/activity?page=1&limit=20&type=teams` returned both todo and team events.
   - Backend only handles exact singular values like `Todo` and `Team`.

5. Long todo titles are not validated before hitting the database.
   - Evidence: creating a 1000-character todo title returned a generic max-length database error.
   - `backend/api/todoRouter.ts` validates min length but has no max length.

### Medium

6. Frontend tests pass despite production build failure.
   - This means the test suite is not catching type-level integration breakage.

7. README appears stale.
   - It references `npm run test:sprint3`, but backend `package.json` only exposes `test`.
   - It does not reflect the current Sprint 4 activity/notification endpoints in the quick script list.

8. Logout was not verified through UI click.
   - API auth failures were verified, but browser localStorage and redirect behavior still need manual/browser verification.

9. Browser-level refresh persistence was not directly verified.
   - Persistence was verified through repeated API/database reads, but not by reloading the Vite UI in a browser session.

10. Notification mark-read badge behavior was only partially verified.
   - Notification generation and unread counts work.
   - `read-all` endpoint returns success.
   - UI badge disappearance and single notification mark-read click were not browser-verified.

## Things That Worked

- Backend server health endpoint returned `200`.
- Frontend dev server served HTML.
- Registration, login, JWT-protected profile, invalid JWT handling worked.
- Private todo create/update/complete/delete worked.
- Private vs team todo API scoping worked.
- Team creation and team listing worked.
- Invite notification for an existing user worked.
- Invite acceptance worked.
- Team todo notifications to other members worked.
- Activity logs were created for todo, team, invite, and member events.
- Profile update worked.
- Password change worked.
- Account deletion worked.
- Unauthorized access to another team was blocked.

## Not Fully Verified

- Actual browser UI interactions, including clicking the notification bell, logout button, account form, team selector, and activity dropdowns.
- Visual layout, responsive behavior, and accessibility states.
- Post-refresh UI state restoration.
- Expired invite flow.
- Expired JWT flow specifically; invalid JWT was verified.
- Post-account-deletion cascade details for a user with owned teams and todos.
