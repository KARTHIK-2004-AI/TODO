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
