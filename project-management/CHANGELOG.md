# Changelog

All notable changes to the TODO Application Backend will be documented in this file.

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
