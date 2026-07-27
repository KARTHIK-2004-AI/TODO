# TODO ENTERPRISE PROJECT
# ENGINEERING MASTER SPRINT PLANNER — v2.0 (CORRECTED)
# ============================================================

Version: 2.0
Audited: 2026-07-24 — verified directly against repository contents
Owner: Engineering Director
Project: TODO Enterprise
Methodology: Incremental Agile Sprint Development
Architecture: Backend First → Frontend Integration → Engineering Review

---

# CHANGE LOG FROM v1.0

This document was audited against the actual repository on 2026-07-24. The
previous version (v1.0) stated Sprints 4–9 as "Expected" without flagging
that **zero code exists for them**. This revision:

- Confirms Sprints 1, 2, 2.1, 3, 3.1 as genuinely complete (verified in code)
- Inserts a new **Sprint 3.2 — Frontend Refactor & Test Infrastructure**,
  which is now required before Sprint 4. Building five more feature sprints
  on top of a single 1,230-line `App.tsx` with no test suite is a build risk,
  not a style preference.
- Replaces vague "Expected" scaffolding for Sprints 4–9 with concrete
  schema, endpoint, and component specs tied to the actual codebase, so
  Antigravity has an unambiguous build target and Codex has something
  real to debug against.
- Rewrites Sprint 10 as a genuine release-hardening sprint, not a
  restatement of "make it good."

---

# PROJECT PHASES

Phase 1 — Foundation: Sprint 1, Sprint 2, Sprint 2.1 → **DONE**
Phase 2 — Collaboration: Sprint 3, Sprint 3.1, **Sprint 3.2 (NEW)** → DONE / DONE / TODO
Phase 3 — Productivity: Sprint 4, Sprint 5, Sprint 6 → TODO
Phase 4 — Enterprise: Sprint 7, Sprint 8 → TODO
Phase 5 — Production: Sprint 9, Sprint 10 → TODO

---

# ============================================================
# SPRINTS 1 – 3.1 — VERIFIED COMPLETE
# ============================================================

## Sprint 1 — Authentication & Personal Todo Workspace
**Status: ✅ Completed & Verified**
Confirmed in code: `backend/api/authRouter.ts`, `backend/services/authService.ts`,
`backend/api/todoRouter.ts`, `backend/services/todoService.ts`, JWT auth via
`backend/middleware/auth.ts`, bcrypt password hashing, full Todo CRUD scoped
to `userId`. Frontend auth flows and dashboard live in `frontend/src/App.tsx`.

## Sprint 2 — Profile & Account Management
**Status: ✅ Completed & Verified**
Confirmed: `backend/api/profileRouter.ts`, `backend/api/accountRouter.ts`,
`backend/services/userService.ts`. `User` model extended with `bio`,
`phoneNumber`, `avatarUrl`, `timezone`, `preferences`. All 6 REST endpoints
(profile GET/PUT, change-password, account settings GET/PUT, delete account)
implemented with Zod validation.

## Sprint 2.1 — Engineering Cleanup
**Status: ✅ Completed & Verified**
Confirmed: root `.gitignore`, `README.md`, `DATABASE.md` present and accurate.
No secrets committed — only `.env.example` files tracked.

## Sprint 3 — Teams & Shared Workspace
**Status: ✅ Backend Complete & Verified / ⚠️ Frontend Functional but Unstructured**
Confirmed: `Team`, `TeamMember`, `TeamInvite` Prisma models; `backend/services/teamService.ts`
(10.6KB — largest service in the codebase); `backend/api/teamRouter.ts`,
`backend/api/inviteRouter.ts`. Role enum (`OWNER`/`ADMIN`/`MEMBER`) and
invite status enum implemented.
**Caveat:** Frontend team functionality exists but is folded into the same
monolithic `App.tsx` as everything else — not a separate concern. This is
addressed in Sprint 3.2 below.

## Sprint 3.1 — Frontend API Synchronization
**Status: ✅ Completed & Verified**
Confirmed: `frontend/src/api.ts` and `frontend/src/types.ts` match backend
response shapes for Team, TeamMember, TeamInvite, InviteStatus, TeamRole.

---

# ============================================================
# SPRINT 3.2 — FRONTEND REFACTOR & TEST INFRASTRUCTURE (NEW)
# ============================================================

Objective
Make the codebase safe to keep extending. This is technical debt payoff,
not a feature sprint — but skipping it means every future sprint compounds
risk in a single 1,200+ line file with zero automated tests.

Why this is required now
- `frontend/src/App.tsx` is 1,230 lines and contains auth, todos, profile,
  account, and teams UI in one component tree. Adding notifications,
  attachments, search/filter UI, and an admin dashboard on top of this
  will make the file unmaintainable and unreviewable.
- The only backend test artifact, `backend/test-sprint3.ts`, is a manual
  script that requires a live database and is run by hand — it cannot run
  in CI and doesn't isolate failures.
- There is currently no `.github/workflows`, no Dockerfile for the app
  itself (only `docker-compose.yml` for local MySQL), and no lint/test
  gate before merge.

Backend Tasks
- Add Jest (or Vitest) with a test database strategy (dockerized MySQL or
  SQLite for test isolation)
- Convert `test-sprint3.ts` into real `*.test.ts` files under a `__tests__`
  or co-located pattern, per service (`authService`, `todoService`,
  `teamService`, `userService`)
- Add `npm test` script wired to the new framework

Frontend Tasks
- Split `App.tsx` into: `pages/` (Login, Register, Dashboard, Profile,
  Settings, Teams), `components/` (TodoItem, TodoForm, TeamCard,
  InviteModal, etc.), `hooks/` (useAuth, useTodos, useTeams)
- Introduce a routing library (React Router) instead of manual view-state
  switching, if not already present
- Add Vitest + React Testing Library, with at least smoke tests per page
- Extract API calls already in `api.ts` into typed hooks per domain

Deliverables
✓ App.tsx reduced to a thin shell/router
✓ Backend and frontend both have a real `npm test` that runs headless
✓ No behavior change — this sprint must not alter functionality, only
  structure, so regression risk stays low

Acceptance Criteria
- All existing manual verification in `test-sprint3.ts` has an automated
  equivalent
- `npm run build` and `npm test` both pass in both `backend/` and `frontend/`
- No single frontend file exceeds ~300 lines

---

# ============================================================
# SPRINT 4 — NOTIFICATIONS & ACTIVITY TIMELINE
# ============================================================

Objective
Real-time collaboration awareness — currently 0% built.

Backend Tasks
- Add `Notification` model to `schema.prisma`: `id, userId, type, message,
  relatedEntityId, relatedEntityType, read (Boolean), createdAt`
- Add `ActivityLog` model: `id, teamId, actorUserId, action, entityType,
  entityId, metadata (JSON string), createdAt`
- New `backend/services/notificationService.ts` — create notifications on
  key events (todo assigned, team invite, role change, invite accepted)
- New `backend/services/activityService.ts` — write activity log entries
  from the same trigger points
- New `backend/api/notificationRouter.ts`: `GET /notifications`,
  `PUT /notifications/:id/read`, `PUT /notifications/read-all`
- New `backend/api/activityRouter.ts`: `GET /teams/:teamId/activity`
  (paginated)
- Hook notification/activity writes into existing `teamService` and
  `todoService` methods (invite sent, invite accepted, member role
  changed, todo created/completed on a shared team)

Frontend Tasks
- `NotificationPanel` component (bell icon + dropdown/panel, unread count)
- `ActivityTimeline` component on the team dashboard page
- Read/unread visual state, "mark all read" action
- Poll `GET /notifications` on an interval (WebSockets are out of scope
  for this sprint — flag as future enhancement, not required for v1.0)

Deliverables
✓ Notification Center
✓ Activity Timeline
✓ Both wired into the componentized frontend from Sprint 3.2

Dependencies
Sprint 3.2 complete (needs component structure to slot into cleanly)

---

# ============================================================
# SPRINT 5 — ATTACHMENTS & RICH TODO CONTENT
# ============================================================

Objective
Support files on todos — currently 0% built.

Backend Tasks
- Add `Attachment` model: `id, todoId, fileName, fileUrl, fileType,
  fileSizeBytes, uploadedByUserId, createdAt`
- Storage decision needed before build starts (see Decision Point below)
- Add `multer` (or equivalent) middleware for multipart upload handling
- New `backend/api/attachmentRouter.ts`: `POST /todos/:id/attachments`,
  `GET /todos/:id/attachments`, `DELETE /attachments/:id`
- Validation: file size limit, allowed MIME types, per-user storage quota
  (recommend starting with images + PDFs only, expand later)

**Decision Point (needs your input before this sprint starts):** local disk
storage (simplest, fine for v1.0 self-hosted) vs. S3-compatible object
storage (better for real production deploy, adds a dependency/cost).
Recommend local disk with a clearly abstracted storage interface so it can
be swapped for S3 later without rewriting callers.

Frontend Tasks
- Upload UI (drag-and-drop or file picker) in the todo detail view
- Attachment list with type-appropriate preview (image thumbnail, file icon
  + name for others)
- Download and remove actions

Deliverables
✓ Attachments
✓ Image Preview
✓ File Management

Dependencies
Sprint 3.2 complete

---

# ============================================================
# SPRINT 6 — SEARCH, FILTERS & PRODUCTIVITY
# ============================================================

Objective
Currently 0% built — the `Todo` model has no `priority`, `dueDate`, or
label support at all today.

Backend Tasks
- Extend `Todo` model: `priority (enum: LOW/MEDIUM/HIGH/URGENT), dueDate
  (DateTime?, nullable)`
- Add `Label` model + join table `TodoLabel` (many-to-many, scoped per
  user or per team)
- Extend `GET /todos` with query params: `search` (title/description
  match), `priority`, `labelIds`, `dueBefore`/`dueAfter`, `completed`,
  `page`, `pageSize`, `sortBy`
- Add DB indexes on `Todo.userId`, `Todo.teamId`, `Todo.dueDate`,
  `Todo.priority` to support this once Sprint 8 performance work lands
  (flag now, index in Sprint 8 to avoid redundant migrations)

Frontend Tasks
- Search bar with debounced input
- Filter panel (priority, labels, due date range, completed toggle)
- Pagination controls
- Calendar view (month grid showing todos by `dueDate`)
- Priority color coding on todo cards

Deliverables
✓ Search
✓ Pagination
✓ Labels, priority, due dates
✓ Calendar view

Dependencies
Sprint 3.2 complete

---

# ============================================================
# SPRINT 7 — ENTERPRISE ADMINISTRATION
# ============================================================

Objective
Currently 0% built — no organization concept exists; `Team` is the largest
unit of grouping today.

Backend Tasks
- Add `Organization` model: `id, name, ownerId, createdAt`
- Add `OrganizationMember` model with roles (`OWNER/ADMIN/MEMBER`), similar
  pattern to `TeamMember`
- Decide relationship: does a `Team` belong to an `Organization`
  (recommended: yes, `Team.organizationId` optional FK for backward
  compatibility with existing teams)
- New `backend/api/organizationRouter.ts`: CRUD for orgs, member
  management, role assignment
- Audit log endpoint reusing the `ActivityLog` model from Sprint 4,
  scoped to org-level actions (member added/removed, role changed, team
  created under org)
- Admin-only middleware guard (`requireOrgAdmin`)

Frontend Tasks
- Admin Dashboard page (org overview, member count, team count)
- User Management table (list, search, role assignment, remove)
- Basic analytics: todos created/completed over time, active users
  (simple aggregate queries, not a full analytics pipeline)

Deliverables
✓ Enterprise Administration
✓ Organization Management

Dependencies
Sprint 4 complete (reuses ActivityLog), Sprint 3.2 complete

---

# ============================================================
# SPRINT 8 — PERFORMANCE & RELIABILITY
# ============================================================

Objective
Currently 0% built — no caching layer, no explicit indexes beyond Prisma
defaults (primary keys and unique constraints only).

Backend Tasks
- Add DB indexes: `Todo(userId, completed)`, `Todo(teamId)`,
  `Todo(dueDate)`, `Notification(userId, read)`, `TeamMember(userId)`
- Add query result caching for read-heavy endpoints (in-memory LRU is
  sufficient for v1.0 single-instance deploy; Redis only if you plan to
  run multiple backend instances)
- Add `backend/middleware/rateLimiter.ts` (e.g. `express-rate-limit`) on
  auth endpoints at minimum
- Basic performance logging: request duration in `requestLogger`
  middleware, flag slow queries (>500ms) in logs

Frontend Tasks
- Route-based code splitting (`React.lazy` + `Suspense`) now that Sprint
  3.2 has real routes
- Virtualize long todo lists if list rendering becomes a bottleneck
- Run a production build and check bundle size; address anything
  unexpectedly large

Deliverables
✓ Faster Application
✓ Optimized Database
✓ Better UX under load

Dependencies
Sprint 3.2 (routing/components to split), Sprint 6 (indexes target the
fields introduced there)

---

# ============================================================
# SPRINT 9 — PRODUCTION INFRASTRUCTURE
# ============================================================

Objective
Currently ~15% built. `docker-compose.yml` only provisions a local MySQL
container. There is no Dockerfile for the app, no CI/CD, and open CORS.

Backend Tasks
- `backend/Dockerfile` — multi-stage build (build TypeScript → slim
  runtime image)
- Harden `index.ts`: replace `cors()` with an explicit origin allowlist
  driven by env var; add `helmet`; confirm `/health` endpoint (already
  exists) is used by container orchestration
- Real secret management: document that `JWT_SECRET` and
  `DATABASE_URL` must be injected via environment/secret store in
  production, never committed — `.env.example` stays a template only
- Structured production logging via existing Winston setup, confirm log
  level is configurable via `NODE_ENV`

Frontend Tasks
- `frontend/Dockerfile` (or static build served via Nginx) producing the
  `vite build` output
- Environment-specific config for API base URL (currently relies on Vite
  dev proxy — production needs a real API URL or reverse-proxy setup)
- Custom error pages (404, 500-equivalent client-side states)

Infrastructure Tasks
- `.github/workflows/ci.yml`: on PR — install, lint, build, test (backend
  + frontend) using the suite added in Sprint 3.2
- `.github/workflows/release.yml` (or extend ci.yml): on tag/merge to
  main — build and publish Docker images
- Update root `docker-compose.yml` (or add `docker-compose.prod.yml`) to
  include the app containers, not just MySQL

Deliverables
✓ Production-ready Docker images for backend and frontend
✓ CI pipeline that blocks merges on failing lint/build/test
✓ Documented, real deployment path

Dependencies
Sprint 3.2 (tests must exist for CI to run)

---

# ============================================================
# SPRINT 10 — RELEASE CANDIDATE & VERSION 1.0
# ============================================================

Objective
Finalize the product for real production use, once Sprints 4–9 are
actually built (not just planned).

Tasks
- **Full regression testing** — run the automated suite from Sprint 3.2
  across every feature area (auth, todos, profile, teams, notifications,
  attachments, search/filters, admin, performance)
- **Security audit**
  - Confirm JWT secret rotation strategy and expiry handling
  - Confirm password hashing, rate limiting, and CORS allowlist from
    Sprint 9 are actually enforced in the deployed config
  - Check attachment upload validation (file type/size) can't be
    bypassed
  - Check org/team role checks are enforced on every admin-guarded
    route, not just the UI
- **Performance audit** — re-check the indexes and caching from Sprint 8
  under realistic data volume (seed a larger dataset and check p95
  response times on `GET /todos` with filters)
- **Accessibility review** — keyboard navigation, form labels, color
  contrast on priority indicators from Sprint 6, screen-reader pass on
  the notification panel
- **Documentation review** — `README.md`, `DATABASE.md`, `shared/API.md`
  all reflect the final feature set; deployment runbook written and
  tested by literally following it on a clean machine
- **Final code cleanup** — remove any leftover mock data, TODO comments,
  console.log debugging, unused dependencies
- **Version tagging** — tag `v1.0.0`, write `CHANGELOG.md` entry
  summarizing all 10 sprints

Deliverables
✓ Stable Release
✓ Documentation Complete
✓ Production Release
✓ Version 1.0

Acceptance Criteria (all must pass before tagging v1.0)
- CI green on `main`
- Zero critical/high severity items open from the security audit
- Deployment runbook successfully followed start-to-finish by someone
  who didn't write the code
- No known data-loss or auth-bypass bugs

---

# ENGINEERING RULES

Every Sprint MUST follow:

Planning → Backend Development → Frontend Development → Integration →
Testing → Engineering Review → Documentation → Approval → Release

No sprint skips any stage. Sprint 3.2 is not optional — it is a
prerequisite for every sprint after it being buildable and debuggable by
an agent (Antigravity/Codex) without full codebase context each time.

---

# QUALITY GATES

Every sprint must satisfy:

✓ Backend Complete
✓ Frontend Complete
✓ APIs Integrated
✓ Automated Tests Passing (as of Sprint 3.2 onward — this replaces the
  old "manual verification script" pattern)
✓ Documentation Updated
✓ Build Successful
✓ Repository Clean
✓ Security Reviewed
✓ Sprint Report Generated
✓ Master Log Updated
✓ Technical Debt Updated

Failure of any item blocks the next sprint.

---

# KNOWN ISSUES LOG (as of 2026-07-24 audit)

Resolved (verified in code)
✓ Profile API mismatch (phoneNumber vs phone)
✓ Account settings key mismatches
✓ Account endpoint error masking
✓ Account deletion password confirmation
✓ Password min-length discrepancy
✓ Database connection/credentials config
✓ Repository cleanup, .gitignore, secret removal

Current / Open
• No automated test suite (blocks CI) — addressed in Sprint 3.2
• `App.tsx` monolith (1,230 lines, no component split) — addressed in
  Sprint 3.2
• Open CORS policy (`cors()` with no origin allowlist) — addressed in
  Sprint 9
• No Dockerfile for the application itself — addressed in Sprint 9
• No CI/CD — addressed in Sprint 9
• `JWT_SECRET` in `.env.example` is a placeholder, not enforced elsewhere
  as a "must be overridden" requirement — addressed in Sprint 9

Future Technical Debt (post-v1.0)
• WebSocket-based real-time notifications (Sprint 4 ships polling only)
• S3-compatible storage for attachments (Sprint 5 ships local disk)
• Redis-based caching if scaling beyond a single backend instance
  (Sprint 8 ships in-memory caching)
• Full analytics pipeline beyond basic aggregates (Sprint 7 ships basics
  only)

---

# SUCCESS METRICS

The project is considered Version 1.0 only when:

✓ Sprints 1 through 10 are all genuinely complete (verified in code, not
  just documented)
✓ No Critical Bugs
✓ Documentation Complete and accurate to the shipped feature set
✓ Security Reviewed
✓ Performance Benchmarked
✓ CI/CD Operational
✓ Production Deployable — proven via a real deployment, not just a
  written runbook
✓ Engineering Director Approval

========================================================
END OF ENGINEERING MASTER SPRINT PLAN v2.0
========================================================
