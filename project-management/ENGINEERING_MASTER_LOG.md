# Engineering Master Log

This document serves as the master engineering log for the TODO Enterprise Application repository, tracking the evolution of the database, core systems, API contracts, and frontend features.

---

## Technical Overview

- **Backend Stack**: Node.js, Express, TypeScript, Zod, JWT, Winston, Vitest
- **Frontend Stack**: React, TypeScript, Vite, Vanilla CSS
- **Database ORM**: Prisma ORM
- **Database Engine**: MySQL 8.0 (Retired SQLite in Sprint 3)

---

## Sprints & Milestone Summary

### Sprint 1: Setup & Core Workspace
- **Deliverables**: Express boilerplate, auth schemas, registration/login handlers, private Todo CRUD (scoped to `userId`), and initial react layout dashboard.
- **Milestone Date**: 2026-07-19

### Sprint 2: Profiles & Account Hardening
- **Deliverables**: Extended `User` model, change password endpoints, user profile updates (bio, phone, avatar), account preferences (theme, language), and account deletion triggers.
- **Milestone Date**: 2026-07-23

### Sprint 2.1: Platform Cleanup & Hardening
- **Deliverables**: Cleared committed secrets, standardized `.env.example`, moved SQLite history to archives, setup MySQL containerization guide, and established clean build pipelines.
- **Milestone Date**: 2026-07-23

### Sprint 3: Team Collaboration & Shared Workspaces
- **Deliverables**: Prisma models for `Team`, `TeamMember`, and `TeamInvite`. Added membership validations, invite tokens, role-based controls (Owner, Admin, Member), and atomic team teardown handling.
- **Milestone Date**: 2026-07-24

### Sprint 3.1: Frontend API Synchronization
- **Deliverables**: Aligned frontend types, models, client APIs, routers, and selectors to consume backend team membership capabilities sequentially.
- **Milestone Date**: 2026-07-24

### Sprint 4: Notification Center & Activity Timeline (Current)
- **Deliverables**: Introduced a global pub-sub system. Added service event emitters, async listeners, notification storage & REST controls, paginated activity tracking, unread badges, and filters.
- **Milestone Date**: 2026-07-26

---

## Active Schema Entities

### `User`
- Scopes accounts, auth, preferences, profile, and team membership associations.

### `Team`
- Represents a workspace shared by users. Deletion detaches shared tasks back to private state.

### `TeamMember`
- Maps users to team spaces with OWNER, ADMIN, or MEMBER roles.

### `TeamInvite`
- Handles invitation tokens to onboard new users.

### `Todo`
- Private tasks (`teamId = null`) or team-shared tasks.

### `Notification`
- Unread/read status notifications dispatched to recipients.

### `ActivityLog`
- Historical timeline log of user-driven workspace operations.
