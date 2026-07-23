# Backend Work Summary

This document details the backend architecture and components developed for the TODO application.

---

## 🛠️ Tech Stack & Overview
- **Runtime & Language**: Node.js & TypeScript
- **Framework**: Express.js
- **Database & ORM**: MySQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt password hashing
- **Validation**: Zod schema validation
- **Logging**: Winston logger middleware

---

## 📂 Backend Architecture & Components Handled

### 1. Database Schema & Data Modeling (`prisma/schema.prisma`)
- **`User` Model**:
  - UUID `id` (primary key)
  - Unique `email`, hashed `password`, and `name`
  - Extended fields: `bio`, `phoneNumber`, `avatarUrl`, `timezone`, and `preferences` (stored as JSON string)
  - One-to-many relationship with `Todo` (`onDelete: Cascade`)
  - Automatic `createdAt` and `updatedAt` timestamps
- **`Todo` Model**:
  - UUID `id` (primary key)
  - `title`, optional `description`, and `completed` status flag
  - Foreign key relation to `userId`
  - Timestamps tracking creation and modifications

---

### 2. Authentication & Authorization System
- **Services (`services/authService.ts`)**:
  - Secure user registration with password hashing using `bcrypt`
  - Credential verification & JWT token generation (`jsonwebtoken`)
- **API Endpoints (`api/authRouter.ts`)**:
  - `POST /api/auth/register`: Validates user details via Zod and creates account
  - `POST /api/auth/login`: Authenticates user credentials and returns JWT access token
- **Middleware (`middleware/auth.ts`)**:
  - Bearer token verification middleware enforcing authentication on protected routes and attaching user payload to requests.

---

### 3. User Profile & Account Management (Sprint 2)
- **Services (`services/userService.ts`)**:
  - `getProfile`: Retrieves user profile fields.
  - `updateProfile`: Updates name, bio, phone number, avatar URL, and timezone.
  - `changePassword`: Verifies current password and hashes new password with Bcrypt.
  - `getSettings` & `updateSettings`: Manages preference configuration (theme, notifications, language).
  - `deleteAccount`: Securely deletes user account with cascading deletion of associated todos.
- **API Endpoints**:
  - `GET /api/profile`: Retrieve user profile (`api/profileRouter.ts`)
  - `PUT /api/profile`: Update profile info (`api/profileRouter.ts`)
  - `PUT /api/change-password`: Secure password change (`api/profileRouter.ts`, `index.ts`)
  - `GET /api/account/settings`: Retrieve preferences (`api/accountRouter.ts`)
  - `PUT /api/account/settings`: Update preferences (`api/accountRouter.ts`)
  - `DELETE /api/account`: Remove account securely (`api/accountRouter.ts`)

---

### 4. Todo Core Features & REST API
- **Services (`services/todoService.ts`)**:
  - Business logic layer for creating, retrieving, updating, and deleting user tasks.
- **API Endpoints (`api/todoRouter.ts`)**:
  - `GET /api/todos`: Fetch user todos with filtering options (`completed=true/false`) and keyword search
  - `GET /api/todos/:id`: Retrieve single todo by ID
  - `POST /api/todos`: Create a new todo item
  - `PUT /api/todos/:id`: Update todo details or mark complete/incomplete
  - `DELETE /api/todos/:id`: Remove a todo item with owner validation

---

### 5. Middleware & Utility Infrastructure
- **Request Validation (`middleware/validation.ts`)**:
  - Reusable schema validator for request body, query parameters, and URL parameters using Zod schemas.
- **Error Handling (`middleware/errorHandler.ts`)**:
  - Centralized global error handler returning clean JSON error responses with appropriate HTTP status codes (400, 401, 404, 500).
- **Logging System (`middleware/logging.ts`)**:
  - HTTP request logging with Winston recording method, route, response status, and request duration.
- **Server Entrypoint (`index.ts`)**:
  - Express app initialization, CORS middleware configuration, environment variable loading via `dotenv`, health check endpoint (`GET /api/health`), route registration, and 404 fallback handler.

---

## 📝 Summary of Handled Work
- Implemented complete backend data persistence, business logic, authentication, schema validation, profile/account management, and REST API endpoints.
- Maintained strict backend boundaries within `/backend`, `database/`, `shared/`, and `project-management/`.

