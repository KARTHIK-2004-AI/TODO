# Changelog

All notable changes to the TODO Application Backend will be documented in this file.

## [1.1.2] - 2026-07-24

### Added
- **Sprint 3.1 Frontend Sync**: Synchronized the React frontend with the Sprint 3 backend API contract for todos, profile, account management, and team collaboration.
- **Team API Integration**: Added frontend support for team creation, listing, detail fetching, renaming, deletion, invites, invite acceptance, role updates, and member removal.
- **Todo Compatibility**: Extended todo list and creation flows to support the backend's `completed`, `search`, `teamId`, and optional team-scoped todo creation behavior.

### Updated
- **Frontend Types**: Updated Team, TeamMember, TeamInvite, InviteStatus, TeamRole, and AcceptInviteResponse to reflect backend payloads and nested user objects.
- **Documentation**: Updated project status documentation to reflect completed Sprint 3.1 frontend synchronization.

## [1.1.1] - 2026-07-23

### Changed / Hardened (Sprint 2.1 — Engineering Cleanup)
- **Repository Hygiene**: Created root `.gitignore` excluding temporary files, build outputs (`dist`, `.vite`), virtual environments, runtime databases, and secrets.
- **Security**: Removed committed `.env` files and created `.env.example` templates for root and backend.
- **Database Documentation**: Created `DATABASE.md` documenting Prisma ORM + SQLite architecture, schema models, migration sequence, and production database roadmap.
- **Repository Cleanup**: Removed temporary/scratch scripts (`powershell.cmd`, `run-migrate.js`, `run-prisma-cli.js`, `test-sprint2.ts`, `test_sprint2.py`), redundant work files, and duplicate database directories.
- **Documentation**: Created comprehensive root `README.md` with step-by-step developer onboarding and project startup guides.

## [1.1.0] - 2026-07-23

### Added
- **User Profile Management**:
  - `GET /api/profile`: Retrieve user profile details.
  - `PUT /api/profile`: Update user profile (name, bio, phoneNumber, avatarUrl, timezone).
- **Account Settings & Preferences**:
  - `GET /api/account/settings`: Retrieve user preferences (theme, notifications, language).
  - `PUT /api/account/settings`: Update user preferences.
- **Security & Password Management**:
  - `PUT /api/change-password`: Secure password update with current password validation and Bcrypt hashing.
- **Account Deletion**:
  - `DELETE /api/account`: Secure account deletion with cascading cleanup of user tasks.
- **Database Schema**:
  - Migration `add_user_profile_and_settings` adding `bio`, `phoneNumber`, `avatarUrl`, `timezone`, and `preferences` to `User` model.

### Updated
- `shared/API.md`: Updated with full API contract specifications for Sprint 2 profile & account endpoints.
- `shared/STATUS.md`: Marked Phase 6 (User Profile & Account Management) as complete.
- `shared/BLOCKERS.md`: Resolved all Sprint 2 backend blockers.

---

## [1.0.0] - 2026-07-19

### Added
- Express TypeScript backend setup with Prisma ORM and SQLite database.
- `POST /api/auth/register` and `POST /api/auth/login` authentication endpoints.
- CRUD REST API endpoints for user task management (`/api/todos`).
- JWT authentication middleware, Zod request validation, Winston logger, and global error handling.
