# API Contracts

All endpoints return JSON responses. Authentication requires a JWT token passed in the `Authorization: Bearer <token>` header.

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
Authenticates a user and returns a access token.

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
Retrieves all todos for the authenticated user. Supports optional query parameters.

**Query Parameters**
- `completed` (boolean, optional): Filter by completed status.
- `search` (string, optional): Filter by title search keyword.

**Response (200 OK)**
```json
[
  {
    "id": "todo-uuid-456",
    "title": "Complete backend setup",
    "description": "Initialize express and database schema",
    "completed": false,
    "createdAt": "2026-07-19T12:00:00.000Z",
    "updatedAt": "2026-07-19T12:00:00.000Z"
  }
]
```

---

### POST /api/todos
Creates a new todo for the authenticated user.

**Request**
```json
{
  "title": "Complete backend setup",
  "description": "Initialize express and database schema"
}
```

**Response (201 Created)**
```json
{
  "id": "todo-uuid-456",
  "title": "Complete backend setup",
  "description": "Initialize express and database schema",
  "completed": false,
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:00:00.000Z"
}
```

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
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:00:00.000Z"
}
```

---

### PUT /api/todos/:id
Updates a specific todo by ID.

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
  "createdAt": "2026-07-19T12:00:00.000Z",
  "updatedAt": "2026-07-19T12:05:00.000Z"
}
```

---

### DELETE /api/todos/:id
Deletes a specific todo by ID.

**Response (200 OK)**
```json
{
  "message": "Todo deleted successfully"
}
```

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

**Errors**
- `401 Unauthorized`: Token missing or invalid.
- `404 Not Found`: User profile not found.

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

**Errors**
- `400 Bad Request`: Validation failure (e.g. invalid avatar URL format).
- `401 Unauthorized`: Token missing or invalid.

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

**Errors**
- `400 Bad Request`: Incorrect current password or password length less than 6 characters.
- `401 Unauthorized`: Token missing or invalid.

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

**Errors**
- `401 Unauthorized`: Token missing or invalid.

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

**Errors**
- `400 Bad Request`: Invalid theme value or body structure.
- `401 Unauthorized`: Token missing or invalid.

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

**Errors**
- `400 Bad Request`: Incorrect password confirmation.
- `401 Unauthorized`: Token missing or invalid.

