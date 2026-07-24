# Database Architecture & Migration Strategy

## Overview

As of **Sprint 3**, this project runs exclusively on **MySQL**. SQLite has been permanently retired.

- **ORM**: Prisma (`@prisma/client` v5.12.1)
- **Database Engine**: MySQL 8.0 (Containerized via Docker Compose or local instance)
- **Database Connection URL**: `mysql://root:password@localhost:3306/tododb`
- **Schema File**: [schema.prisma](./backend/prisma/schema.prisma)

---

## Migration History Reset Strategy

Prisma migration history is provider-specific. Because SQLite DDL syntax (e.g. `PRAGMA foreign_keys`, SQLite types) cannot be replayed against MySQL, the previous SQLite migration history was archived (located at [backend/prisma/migrations_sqlite_archive](./backend/prisma/migrations_sqlite_archive)).

A fresh, provider-native MySQL baseline migration was generated:
- **`20260728000000_init_mysql_baseline`**: Initial MySQL schema defining `User`, `Team`, `TeamMember`, `TeamInvite`, and `Todo` tables along with native MySQL `ENUM` types and foreign key constraints.

---

## Data Models

### `User`
Represents an authenticated user account.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Unique user UUID |
| `email` | String | `@unique` | User login email |
| `password` | String | | Bcrypt password hash |
| `name` | String | | Display name |
| `bio` | String | `@default("")` | Biography |
| `phoneNumber` | String | `@default("")` | Contact phone number |
| `avatarUrl` | String | `@default("")` | Profile image URL |
| `timezone` | String | `@default("UTC")` | User timezone preference |
| `preferences` | String | `@default("...") @db.Text` | JSON string for user preferences |
| `createdAt` | DateTime | `@default(now())` | Account creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Account modification timestamp |

---

### `Team`
Represents a shared workspace team.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Unique team UUID |
| `name` | String | | Team name |
| `ownerId` | String | FK -> `User.id` | Foreign key referencing team creator (`User.id`) |
| `createdAt` | DateTime | `@default(now())` | Team creation timestamp |

---

### `TeamMember`
Represents user membership within a team with role-based permissions.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Unique membership UUID |
| `teamId` | String | FK -> `Team.id` | Foreign key referencing `Team.id` |
| `userId` | String | FK -> `User.id` | Foreign key referencing `User.id` |
| `role` | Enum | `OWNER`, `ADMIN`, `MEMBER` | Member permission role |
| `joinedAt` | DateTime | `@default(now())` | Timestamp member joined |

*Constraint*: `@@unique([teamId, userId])` prevents duplicate memberships.

---

### `TeamInvite`
Represents a team invitation sent to an email address.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Unique invite UUID |
| `teamId` | String | FK -> `Team.id` | Target team |
| `email` | String | | Invitee email |
| `invitedByUserId` | String | FK -> `User.id` | User who sent the invite |
| `token` | String | `@unique` | Secure token for accepting invite |
| `status` | Enum | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED` | Invite lifecycle status |
| `createdAt` | DateTime | `@default(now())` | Invite creation timestamp |
| `expiresAt` | DateTime | | 7-day expiration timestamp |

---

### `Todo`
Represents a task. A todo with `teamId = null` is private to its creator. A todo with a non-null `teamId` is a shared team task.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(uuid())` | Unique todo UUID |
| `title` | String | | Task title |
| `description` | String | `@default("") @db.Text` | Task description |
| `completed` | Boolean | `@default(false)` | Completion status |
| `userId` | String | FK -> `User.id` | Task creator ID |
| `teamId` | String? | FK -> `Team.id`, Nullable | Team ID if shared, `null` if private |
| `createdAt` | DateTime | `@default(now())` | Task creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Task modification timestamp |

---

## Team Deletion Behavior (Non-Destructive Detach)

When a team is deleted via `DELETE /api/teams/:teamId`:
1. All todos belonging to that team have `teamId` set to `null` (`onDelete: SetNull`).
2. Todos are **never deleted**. They revert to private todos owned by their original creator (`userId`).
3. `TeamMember` and `TeamInvite` records for the team are deleted.
4. The operations run in a single atomic database transaction.

---

## Local Development MySQL Setup

### 1. Start Containerized MySQL Server
Run Docker Compose from the root workspace directory:
```bash
docker-compose up -d
```

### 2. Configure Environment File
Ensure `backend/.env` is set:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/tododb"
JWT_SECRET="dev-jwt-secret-key-for-testing-12345"
```

### 3. Apply Migrations & Generate Prisma Client
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Seed Database (Optional)
```bash
cd backend
npx prisma db seed
```
