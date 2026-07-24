# API Contracts

All endpoints return JSON responses. Authentication requires a JWT token passed in the `Authorization: Bearer <token>` header.

## Database

**As of Sprint 3, this project runs on MySQL.** SQLite has been fully
retired. The previous SQLite migration history was archived (not
replayed) because Prisma migration history is provider-specific — see
DATABASE.md for the full explanation and local setup instructions.

---

## Teams & Shared Workspaces

### Permission Table

| Action                        | OWNER | ADMIN | MEMBER |
|-------------------------------|:-----:|:-----:|:------:|
| Rename team                   |  ✅   |  ❌   |   ❌   |
| Delete team                   |  ✅   |  ❌   |   ❌   |
| Invite member                 |  ✅   |  ✅   |   ❌   |
| Revoke invite                 |  ✅   |  ✅   |   ❌   |
| Remove MEMBER                 |  ✅   |  ✅   |   ❌   |
| Remove ADMIN                  |  ✅   |  ❌   |   ❌   |
| Remove OWNER                  |  ❌   |  ❌   |   ❌   |
| Change member role            |  ✅   |  ❌   |   ❌   |
| View shared todos             |  ✅   |  ✅   |   ✅   |
| Create/edit shared todos      |  ✅   |  ✅   |   ✅   |

### Todo Visibility Rule
A todo with `teamId = null` is private and visible only to its
creator. A todo with a non-null `teamId` is visible and editable by
any current member of that team, regardless of who created it.

### Team Deletion Behavior (explicit — do not assume otherwise)
Deleting a team is a **non-destructive detach**, not a cascade delete:
- All todos with `teamId` equal to the deleted team's id have
  `teamId` set to `null`.
- These todos are NOT deleted. They immediately become private todos
  again, owned by their original `creatorId`/`userId`.
- `TeamMember` and `TeamInvite` rows for that team ARE deleted.
- This operation is atomic (single transaction) — it cannot leave the
  database in a state where todos are orphaned but membership rows
  still exist, or vice versa.

### Error Codes
| Code | Meaning                                      |
|------|-----------------------------------------------|
| 403  | NOT_TEAM_MEMBER — requester isn't in this team |
| 403  | INSUFFICIENT_ROLE — role lacks permission      |
| 404  | TEAM_NOT_FOUND                                 |
| 410  | INVITE_EXPIRED_OR_REVOKED                      |

---

## Public Endpoints

### POST /api/auth/register
Registers a new user.

**Request**
```json
{
  "email": "user@example.com",
  "password": "strongpassword123",
  "name": "Jane Doe"
}
```

**Response (201 Created)**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

---

### POST /api/auth/login
Authenticates a user and returns an access token.

**Request**
```json
{
  "email": "user@example.com",
  "password": "strongpassword123"
}
```

**Response (200 OK)**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

---

## Authenticated Endpoints (Requires Bearer Token)

### GET /api/todos
Retrieves todos. By default, returns private todos (`teamId = null`) owned by the authenticated user. If `teamId` query parameter is provided, retrieves shared team todos (requester must be a member of `teamId`).

**Query Parameters**
- `completed` (boolean, optional): Filter by completed status.
- `search` (string, optional): Filter by title/description search keyword.
- `teamId` (string, optional): Filter by team ID to fetch shared team todos.

**Response (200 OK)**
```json
[
  {
    "id": "todo-uuid-456",
    "title": "Complete backend setup",
    "description": "Initialize express and database schema",
    "completed": false,
    "userId": "user-uuid-123",
    "teamId": null,
    "createdAt": "2026-07-19T12:00:00.000Z",
    "updatedAt": "2026-07-19T12:00:00.000Z"
  }
]
```

**Errors**
- `403 Forbidden`: `NOT_TEAM_MEMBER` if `teamId` is specified and requester is not a member of that team.

---

### POST /api/todos
Creates a new todo. If `teamId` is provided in the body, creates a shared team todo (requester must be a member of `teamId`). If `teamId` is omitted or null, creates a private todo for the authenticated user.

**Request**
```json
{
  "title": "Complete backend setup",
  "description": "Initialize express and database schema",
  "teamId": "team-uuid-789"
}
```

**Response (201 Created)**
```json
{
  "id": "todo-uuid-456",
  "title": "Complete backend setup",
  "description": "Initialize express and database schema",
  "completed": false,
  "userId": "user-uuid-123",
  "teamId": "team-uuid-789",
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:00:00.000Z"
}
```

**Errors**
- `403 Forbidden`: `NOT_TEAM_MEMBER` if `teamId` is specified and requester is not a member of that team.

---

### GET /api/todos/:id
Retrieves a specific todo by ID.

**Response (200 OK)**
```json
{
  "id": "todo-uuid-456",
  "title": "Complete backend setup",
  "description": "Initialize express and database schema",
  "completed": false,
  "userId": "user-uuid-123",
  "teamId": null,
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:00:00.000Z"
}
```

---

### PUT /api/todos/:id
Updates a specific todo by ID. (For shared team todos, any member of the team can edit).

**Request**
```json
{
  "title": "Complete backend setup (updated)",
  "description": "Done setting up files",
  "completed": true
}
```

**Response (200 OK)**
```json
{
  "id": "todo-uuid-456",
  "title": "Complete backend setup (updated)",
  "description": "Done setting up files",
  "completed": true,
  "userId": "user-uuid-123",
  "teamId": "team-uuid-789",
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:05:00.000Z"
}
```

---

### DELETE /api/todos/:id
Deletes a specific todo by ID. (For shared team todos, any member of the team can delete).

**Response (200 OK)**
```json
{
  "message": "Todo deleted successfully"
}
```

---

## Teams Endpoints (Requires Bearer Token)

### POST /api/teams
Creates a new team. Creator is assigned as `OWNER`.

**Request**
```json
{
  "name": "Engineering Team"
}
```

**Response (201 Created)**
```json
{
  "id": "team-uuid-789",
  "name": "Engineering Team",
  "ownerId": "user-uuid-123",
  "createdAt": "2026-07-28T00:00:00.000Z",
  "members": [
    {
      "id": "member-uuid-1",
      "teamId": "team-uuid-789",
      "userId": "user-uuid-123",
      "role": "OWNER",
      "joinedAt": "2026-07-28T00:00:00.000Z",
      "user": {
        "id": "user-uuid-123",
        "email": "user@example.com",
        "name": "Jane Doe",
        "avatarUrl": ""
      }
    }
  ]
}
```

---

### GET /api/teams
Lists all teams the authenticated user is a member of.

**Response (200 OK)**
```json
[
  {
    "id": "team-uuid-789",
    "name": "Engineering Team",
    "ownerId": "user-uuid-123",
    "createdAt": "2026-07-28T00:00:00.000Z",
    "myRole": "OWNER",
    "joinedAt": "2026-07-28T00:00:00.000Z",
    "memberCount": 1
  }
]
```

---

### GET /api/teams/:teamId
Retrieves details and member list for a specific team. Requester MUST be a team member.

**Response (200 OK)**
```json
{
  "id": "team-uuid-789",
  "name": "Engineering Team",
  "ownerId": "user-uuid-123",
  "createdAt": "2026-07-28T00:00:00.000Z",
  "members": [
    {
      "id": "member-uuid-1",
      "teamId": "team-uuid-789",
      "userId": "user-uuid-123",
      "role": "OWNER",
      "joinedAt": "2026-07-28T00:00:00.000Z",
      "user": {
        "id": "user-uuid-123",
        "email": "user@example.com",
        "name": "Jane Doe",
        "avatarUrl": ""
      }
    }
  ]
}
```

**Errors**
- `403 Forbidden`: `NOT_TEAM_MEMBER` if requester is not in this team.
- `404 Not Found`: `TEAM_NOT_FOUND` if team does not exist.

---

### PUT /api/teams/:teamId
Renames a team. Requester MUST be `OWNER`.

**Request**
```json
{
  "name": "Platform Engineering"
}
```

**Response (200 OK)**
```json
{
  "id": "team-uuid-789",
  "name": "Platform Engineering",
  "ownerId": "user-uuid-123",
  "createdAt": "2026-07-28T00:00:00.000Z"
}
```

**Errors**
- `403 Forbidden`: `INSUFFICIENT_ROLE` if requester is not OWNER.

---

### DELETE /api/teams/:teamId
Deletes a team (OWNER only). Performs atomic non-destructive detach of all shared todos (sets `teamId = null`), and removes `TeamMember` and `TeamInvite` rows.

**Response (200 OK)**
```json
{
  "message": "Team deleted successfully"
}
```

**Errors**
- `403 Forbidden`: `INSUFFICIENT_ROLE` if requester is not OWNER.

---

### POST /api/teams/:teamId/invites
Invites a user to a team by email. Requester MUST be `OWNER` or `ADMIN`.

**Request**
```json
{
  "email": "colleague@example.com"
}
```

**Response (201 Created)**
```json
{
  "id": "invite-uuid-001",
  "teamId": "team-uuid-789",
  "email": "colleague@example.com",
  "invitedByUserId": "user-uuid-123",
  "token": "64-char-hex-token",
  "status": "PENDING",
  "createdAt": "2026-07-28T00:00:00.000Z",
  "expiresAt": "2026-08-04T00:00:00.000Z"
}
```

**Errors**
- `403 Forbidden`: `INSUFFICIENT_ROLE` if requester is a regular MEMBER.

---

### DELETE /api/teams/:teamId/invites/:id
Revokes a pending invite. Requester MUST be `OWNER` or `ADMIN`.

**Response (200 OK)**
```json
{
  "message": "Invite revoked successfully"
}
```

---

### POST /api/invites/:token/accept
Accepts a team invite using a token. Authenticated user becomes a `MEMBER` of the team.

**Response (200 OK)**
```json
{
  "message": "Invite accepted successfully",
  "teamMember": {
    "id": "member-uuid-2",
    "teamId": "team-uuid-789",
    "userId": "user-uuid-456",
    "role": "MEMBER",
    "joinedAt": "2026-07-28T00:05:00.000Z"
  }
}
```

**Errors**
- `410 Gone`: `INVITE_EXPIRED_OR_REVOKED` if token is invalid, expired, or revoked.

---

### PUT /api/teams/:teamId/members/:userId/role
Changes a team member's role. Requester MUST be `OWNER`.

**Request**
```json
{
  "role": "ADMIN"
}
```

**Response (200 OK)**
```json
{
  "id": "member-uuid-2",
  "teamId": "team-uuid-789",
  "userId": "user-uuid-456",
  "role": "ADMIN",
  "joinedAt": "2026-07-28T00:05:00.000Z"
}
```

**Errors**
- `403 Forbidden`: `INSUFFICIENT_ROLE` if requester is not OWNER.

---

### DELETE /api/teams/:teamId/members/:userId
Removes a member from the team. Per permissions matrix:
- OWNER can remove ADMIN or MEMBER.
- ADMIN can remove MEMBER.
- No one can remove OWNER.

**Response (200 OK)**
```json
{
  "message": "Member removed successfully"
}
```

**Errors**
- `403 Forbidden`: `INSUFFICIENT_ROLE` if permission check fails.

---

## Profile Management Endpoints (Requires Bearer Token)

### GET /api/profile
Retrieves profile information for the authenticated user.

**Response (200 OK)**
```json
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "bio": "Senior Backend Software Engineer",
  "phoneNumber": "+1-555-0199",
  "avatarUrl": "https://example.com/avatar.png",
  "timezone": "America/New_York",
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-23T01:00:00.000Z"
}
```

---

### PUT /api/profile
Updates user profile information. All fields are optional in the request body.

**Request**
```json
{
  "name": "Jane Smith",
  "bio": "Senior Backend Architect",
  "phoneNumber": "+1-555-0199",
  "avatarUrl": "https://example.com/new-avatar.png",
  "timezone": "America/New_York"
}
```

**Response (200 OK)**
```json
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "name": "Jane Smith",
  "bio": "Senior Backend Architect",
  "phoneNumber": "+1-555-0199",
  "avatarUrl": "https://example.com/new-avatar.png",
  "timezone": "America/New_York",
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-23T01:10:00.000Z"
}
```

---

### PUT /api/change-password
Securely updates user password after verifying current password. (Also accessible via `PUT /api/profile/change-password`).

**Request**
```json
{
  "currentPassword": "strongpassword123",
  "newPassword": "newstrongpassword456"
}
```

**Response (200 OK)**
```json
{
  "message": "Password updated successfully"
}
```

---

## Account Management Endpoints (Requires Bearer Token)

### GET /api/account/settings
Retrieves user preferences and application settings.

**Response (200 OK)**
```json
{
  "theme": "dark",
  "notifications": true,
  "emailAlerts": true,
  "language": "en"
}
```

---

### PUT /api/account/settings
Updates user preferences. Accepts any valid key-value preference object.

**Request**
```json
{
  "theme": "dark",
  "notifications": false,
  "emailAlerts": true,
  "language": "en-US"
}
```

**Response (200 OK)**
```json
{
  "theme": "dark",
  "notifications": false,
  "emailAlerts": true,
  "language": "en-US"
}
```

---

### DELETE /api/account
Permanently removes user account and cascades deletion to all user tasks.

**Request (Optional)**
```json
{
  "password": "newstrongpassword456"
}
```

**Response (200 OK)**
```json
{
  "message": "Account deleted successfully"
}
```
