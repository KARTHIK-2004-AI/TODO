# Comprehensive Project Documentation & Status Report

> **Project Name**: Collaborative Workspace & Task Execution Platform (TODO)  
> **Current Date**: August 22, 2026  
> **Repository Root**: `d:\TODO`  

---

## 1. Executive Summary & Overview

This project is an enterprise-grade **Collaborative Task & Project Execution Engine** built with a **Node.js/Express/TypeScript** backend, **Prisma ORM with MySQL 8.0**, real-time **WebSockets**, and a modern **React (Vite) + TypeScript** single-page application frontend.

The application allows individual users to maintain private task lists and seamlessly collaborate within shared team workspaces. It features role-based access control (Owner, Admin, Member), task status lifecycles, priority levels, estimated effort tracking, discussion threads, attachment file management, activity timelines, real-time workspace chat with inline `@mentions`, automated background email queues, and live synchronization over WebSockets.

---

## 2. Current Project Stage & Progress Roadmap

### Current Stage: **Phase 9 / Sprint 6 — Real-Time Collaboration & Engine Sync (Active)**

```mermaid
gantt
    title Development Sprint Lifecycle
    dateFormat  YYYY-MM-DD
    section Completed Sprints
    Sprint 1 : Core Auth & Todo CRUD           :done,    des1, 2026-07-01, 2026-07-07
    Sprint 2 : Profile & Account Settings      :done,    des2, 2026-07-08, 2026-07-14
    Sprint 2.1: Dev Cleanup & Env Config      :done,    des3, 2026-07-15, 2026-07-17
    Sprint 3 : Teams, Invites & MySQL Shift   :done,    des4, 2026-07-18, 2026-07-24
    Sprint 3.1: Frontend Team UI Sync          :done,    des5, 2026-07-25, 2026-07-27
    Sprint 3.2: Modularization & Vitest Suite  :done,    des6, 2026-07-28, 2026-07-31
    Sprint 4 : Notification Bus & Activity Log :done,    des7, 2026-08-01, 2026-08-07
    Sprint 5 : Task Execution Engine & Drawer  :done,    des8, 2026-08-08, 2026-08-15
    section Current Active Sprint
    Sprint 6 : Real-Time WebSockets & Chat    :active,  des9, 2026-08-16, 2026-08-23
    section Upcoming Roadmap
    Sprint 7 : Enterprise Organizations (RBAC) :         des10, 2026-08-24, 2026-08-31
    Sprint 8 : Caching & Rate Limiting        :         des11, 2026-09-01, 2026-09-07
    Sprint 9 : Dockerization & Security Audit  :         des12, 2026-09-08, 2026-09-14
    Sprint 10: Release Candidate 1.0           :         des13, 2026-09-15, 2026-09-22
```

### Stage Detailed Breakdown

| Phase / Sprint | Focus Area | Deliverables Completed / Status |
| :--- | :--- | :--- |
| **Sprint 1** | Core Auth & Workspace | Node.js + Express + TypeScript backend with Prisma. JWT Auth & Todo CRUD endpoints. Basic React client. |
| **Sprint 2** | Profile & Account | User profile fields (`bio`, `phone`, `avatarUrl`, `timezone`), settings (`theme`, `notifications`), password change, account deletion. |
| **Sprint 2.1** | Infrastructure Cleanup | Removed committed credentials, normalized `.env.example`, created root `.gitignore`, MySQL dev guidelines. |
| **Sprint 3** | Teams & MySQL Migration | `Team`, `TeamMember`, `TeamInvite` tables. Owner/Admin/Member RBAC matrix. Full migration from SQLite to MySQL 8.0. |
| **Sprint 3.1** | Frontend Sync | Team UI components (creation, member lists, invite acceptance, role changes, member removal). |
| **Sprint 3.2** | Architecture Refactor | Split monolithic React components into modular pages, custom hooks, and layout shells. Added Vitest test suites. |
| **Sprint 4** | Notifications & Timeline | Event-driven architecture with Node's `EventEmitter`. Notification Service, Activity Log ledger, unread badges. |
| **Sprint 5** | Project Execution Engine | Extended tasks (`priority`, `status`, `startDate`, `dueDate`, `estimatedHours`), discussion comments CRUD, attachments metadata, history audit trail, `TaskDetailsDrawer`. |
| **Sprint 6 (Current)** | Real-Time & Communications | WebSockets server (`/socket`), Workspace General Chat with inline `@mentions`, Shared Files panel with storage tracking, background Email Queue worker sweeps. |
| **Sprints 7-10 (Planned)** | Enterprise & RC 1.0 | Organization models, Redis query caching, API rate limiting, Docker containerization, security hardening, release candidate tag `v1.0.0`. |

---

## 3. High-Level Architecture & Tech Stack

### System Stack Summary

- **Backend Framework**: Express.js with TypeScript (`backend/index.ts`) running on Node.js.
- **Database & ORM**: MySQL 8.0 accessed via **Prisma ORM** (`backend/prisma/schema.prisma`).
- **Real-Time Gateway**: `ws` WebSocket server mounted on `/socket` HTTP upgrade path.
- **Pub/Sub Bus**: Native Node.js `EventEmitter` (`eventService.ts`) for decoupled internal notification generation.
- **Background Workers**: `EmailQueue` processor performing background sweeps every 10 seconds.
- **Frontend Framework**: React 18 with TypeScript bundled using **Vite**.
- **State & Custom Hooks**: Custom React hooks (`useAuth`, `useTodos`, `useTeams`, `useWebSocket`).
- **Styling & Design System**: Modern CSS with dark/light theme CSS custom properties (`App.css`, `index.css`).

### Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend Client React SPA
        UI[React UI Components]
        Hooks[Custom Hooks: useAuth, useTodos, useTeams, useWebSocket]
        APIClient[Axios/Fetch API Client api.ts]
        UI --> Hooks
        Hooks --> APIClient
    end

    subgraph Backend Server Express & Node.js
        Index[Entrypoint index.ts]
        Middleware[Middlewares: auth, logging, errorHandler, validation]
        Routers[API Routers: auth, todo, team, profile, account, notification, activity, chat, invite]
        Services[Service Layer: task, team, user, auth, chat, collaboration, notification, activity, invite, email, websocket]
        EventBus[EventEmitter Engine eventService.ts]
        WSGateway[WebSocket Gateway websocketService.ts]
        EmailWorker[Email Queue Worker emailService.ts]
        
        Index --> Middleware
        Middleware --> Routers
        Routers --> Services
        Services --> EventBus
        Services --> WSGateway
        EmailWorker --> Services
    end

    subgraph Persistence Layer
        Prisma[Prisma ORM Client]
        MySQL[(MySQL 8.0 Database)]
        LocalStorage[(Local Email Storage /uploads & /emails_log)]
        
        Services --> Prisma
        Prisma --> MySQL
        EmailWorker --> LocalStorage
    end

    APIClient -- HTTP REST Requests --> Routers
    Hooks -- WebSockets /socket --> WSGateway
```

---

## 4. Backend Architecture & Complete Reference

### 4.1 Database Schema & Models (`schema.prisma`)

The database consists of **13 interconnected models** and **4 enums**:

- **Enums**:
  - `Role`: `OWNER`, `ADMIN`, `MEMBER`
  - `InviteStatus`: `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`, `REJECTED`
  - `TaskPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
  - `TaskStatus`: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`

- **Models**:
  1. `User`: Core user account storing `email`, `password` (bcrypt hash), `name`, `bio`, `phoneNumber`, `avatarUrl`, `timezone`, `preferences` (JSON string), verification and reset tokens.
  2. `Team`: Workspace entity storing `name`, `ownerId`, `description`, `purpose`.
  3. `TeamMember`: Unique pair of `teamId` + `userId` storing member `role` and `lastReadChatTime`.
  4. `TeamInvite`: Pending invitation storing target `email`, `token`, `status`, `expiresAt`.
  5. `Todo`: Task model extended with `priority`, `status`, `dueDate`, `startDate`, `estimatedHours`, `completedAt`, `archived`, `teamId` (nullable for private tasks), `assignedToUserId`.
  6. `TaskComment`: Discussion comment linked to a task storing message text.
  7. `TaskAttachment`: Uploaded file metadata linked to a task (`fileName`, `fileType`, `fileSize`, `storagePath`, `isImportant`).
  8. `TaskHistory`: Immutable audit log ledger for task mutations (`action`, `previousValue`, `newValue`, `performedBy`).
  9. `Notification`: In-app notification for a user (`title`, `message`, `type`, `isRead`, `metadata`).
  10. `ActivityLog`: System-wide audit timeline record (`teamId`, `userId`, `action`, `entityType`, `entityId`, `metadata`).
  11. `CommentReadStatus`: Read status receipt mapping `commentId` + `userId`.
  12. `ChatMessage`: Workspace chat message storing text content and `@mentions` JSON metadata.
  13. `EmailQueue`: Outbox email queue for asynchronous email delivery (`to`, `subject`, `html`, `status`, `error`).

---

### 4.2 Middleware Layer (`backend/middleware/`)

1. **`auth.ts`**:
   - `authenticateToken(req, res, next)`: Validates JWT tokens passed in `Authorization: Bearer <token>` headers and attaches `req.user` payload (`id`, `email`, `name`).
2. **`errorHandler.ts`**:
   - `errorHandler(err, req, res, next)`: Global error interceptor formatting unexpected failures into standardized JSON responses `{ error: string }`.
3. **`logging.ts`**:
   - `requestLogger(req, res, next)`: Logs incoming HTTP request method, URL, status code, and response latency.
   - `logger`: Winston/Console wrapper for application log formatting.
4. **`validation.ts`**:
   - `validateBody(schema)`: Enforces payload validation on request bodies using validation rules.
   - `validateQuery(schema)`: Validates HTTP query parameters.

---

### 4.3 Service Layer Reference (`backend/services/`)

Each service encapsulates specific business logic, database queries, permission assertions, and event triggers.

| Service File | Function Name | Description & Parameters |
| :--- | :--- | :--- |
| **`authService.ts`** | `registerUser(data)` | Hashes password with bcrypt, creates `User` record, generates JWT access token. |
| | `loginUser(email, password)` | Validates credentials against database, verifies bcrypt hash, returns JWT token and user info. |
| **`userService.ts`** | `getUserProfile(userId)` | Returns public user profile attributes (`name`, `bio`, `phoneNumber`, `avatarUrl`, `timezone`). |
| | `updateUserProfile(userId, data)` | Updates user profile fields in database. |
| | `changePassword(userId, current, new)` | Verifies current password and updates to hashed new password. |
| | `getUserSettings(userId)` | Parses JSON string in `preferences` field and returns user preferences object. |
| | `updateUserSettings(userId, prefs)` | Merges updated preferences and saves as JSON string in database. |
| | `deleteUserAccount(userId)` | Performs cascading cleanup of user tasks, team memberships, and deletes `User` row. |
| **`taskService.ts`** | `getTodos(userId, filters)` | Fetches tasks filtered by completion status, team ID, search term, priority, status, or assignee. |
| | `createTodo(userId, data)` | Creates private task or team task (verifying team membership), fires `todo:created` event. |
| | `getTodoById(taskId, userId)` | Retrieves full task details including comments, attachments, and history, verifying read access. |
| | `updateTodo(taskId, userId, data)` | Enforces transition rules (`TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE`), checks RBAC role limits, appends `TaskHistory`, fires `todo:updated` event. |
| | `deleteTodo(taskId, userId)` | Deletes task if requester is creator or team Owner/Admin, fires `todo:deleted` event. |
| | `assignTask(taskId, assignerId, targetId)` | Assigns target user to task, records history entry, fires `task:assigned` event. |
| | `unassignTask(taskId, userId)` | Clears assignee from task. |
| | `addComment(taskId, userId, message)` | Appends comment to task, records `COMMENT_ADDED` audit entry, fires `comment:created` event. |
| | `getComments(taskId, userId)` | Lists all comments for a task ordered chronologically. |
| | `updateComment(commentId, userId, message)` | Edits user's own comment message. Throws 403 if modified by another user. |
| | `deleteComment(commentId, userId)` | Deletes user's own comment. |
| | `addAttachment(taskId, userId, fileData)` | Logs attachment metadata record and records audit history entry. |
| | `getAttachments(taskId, userId)` | Retrieves attachments linked to task. |
| | `deleteAttachment(attachmentId, userId)` | Deletes attachment metadata if requester is uploader or team Owner/Admin. |
| | `getAttachmentById(attachmentId, userId)` | Gets attachment metadata for file download streaming. |
| | `getTaskHistory(taskId, userId)` | Retrieves complete audit trail ledger for a specific task. |
| **`teamService.ts`** | `createTeam(ownerId, name)` | Creates team, sets creator as `OWNER` in `TeamMember` table. |
| | `getUserTeams(userId)` | Lists all teams the user belongs to along with active member counts and user role. |
| | `getTeamDetails(teamId, userId)` | Retrieves team details, roster members, pending invites, and workspace task stats. |
| | `updateTeamName(teamId, userId, name)` | Renames team (requester MUST be team `OWNER`). |
| | `deleteTeam(teamId, userId)` | Deletes team (OWNER only). Atomically detaches team tasks (sets `teamId = null`). |
| | `inviteMember(teamId, inviterId, email)` | Creates `TeamInvite` with token (requester MUST be `OWNER` or `ADMIN`), enqueues invite email. |
| | `getPendingInvites(teamId, userId)` | Lists active pending invitations for team. |
| | `revokeInvite(teamId, userId, inviteId)` | Revokes pending team invitation token. |
| | `updateMemberRole(teamId, actorId, targetId, role)` | Changes team member role (requester MUST be `OWNER`). |
| | `removeMember(teamId, actorId, targetId)` | Removes member enforcing RBAC matrix (Owner can remove anyone; Admin can remove Member). |
| **`inviteService.ts`** | `verifyInviteToken(token)` | Resolves invite token details and verifies expiration timestamp. |
| | `acceptInvite(token, userId)` | Converts pending invite to `ACCEPTED` and inserts `TeamMember` row (`MEMBER` role). |
| | `rejectInvite(token)` | Sets invite status to `REJECTED`. |
| **`activityService.ts`** | `logActivity(data)` | Inserts new `ActivityLog` row into database. |
| | `getUserActivity(userId, page, limit, type)` | Fetches paginated activity timeline for user and their teams. |
| | `getTeamActivity(teamId, userId, page, limit)` | Fetches paginated activity logs for a specific team. |
| **`notificationService.ts`**| `createNotification(data)` | Inserts new `Notification` row and broadcasts live badge updates over WebSockets. |
| | `getUserNotifications(userId)` | Lists notifications ordered by creation date descending. |
| | `getUnreadCount(userId)` | Counts unread notifications for user. |
| | `markAsRead(notificationId, userId)` | Marks specific notification as read. |
| | `markAllAsRead(userId)` | Marks all notifications of user as read. |
| | `deleteNotification(notificationId, userId)` | Deletes notification record. |
| **`chatService.ts`** | `getTeamMessages(teamId, userId, limit, before)` | Fetches paginated team chat messages, resolving sender profiles. |
| | `createChatMessage(teamId, userId, message)` | Parses `@mentions` in text, saves `ChatMessage`, broadcasts over WebSockets. |
| | `updateChatMessage(messageId, userId, text)` | Edits user's own chat message. |
| | `deleteChatMessage(messageId, userId)` | Deletes user's chat message. |
| | `markChatAsRead(teamId, userId)` | Updates user's `lastReadChatTime` timestamp in `TeamMember`. |
| | `getUnreadChatCount(userId)` | Calculates count of unread chat messages per team for user. |
| **`collaborationService.ts`**| `getWorkspaceAnalytics(teamId, userId)` | Calculates completion rates, priority distributions, and individual workloads. |
| | `getTeamSharedFiles(teamId, userId)` | Aggregates all uploaded team attachments, calculating storage limits and version history. |
| | `toggleFileImportant(attachmentId, userId)` | Toggles importance star flag on shared file. |
| | `uploadSharedFile(teamId, userId, fileData)` | Saves file asset to server storage and creates attachment metadata. |
| **`emailService.ts`** | `EmailService.queueEmail(to, subject, html)` | Inserts email job into `EmailQueue` database table. |
| | `EmailService.processQueue()` | Sweeps `PENDING` email records, writes HTML files to `backend/emails_log/` (in dev), updates status. |
| | `EmailService.startWorker()` | Launches recurring 10-second interval timer executing `processQueue()`. |
| | `EmailService.sendVerificationEmail(email, token)`| Enqueues account email verification message. |
| | `EmailService.sendPasswordResetEmail(email, token)` | Enqueues password reset link email message. |
| | `EmailService.sendInviteEmail(email, teamName, token)` | Enqueues workspace team invite invitation email. |
| | `EmailService.sendTaskReminderEmail(email, taskTitle)` | Enqueues due/overdue task reminder email notification. |
| **`websocketService.ts`**| `initWebSocketServer(server)` | Initializes WebSocket server gateway on HTTP server (`/socket`). |
| | `broadcastToTeam(teamId, message)` | Emits WebSocket payload to all connected clients in team workspace. |
| | `broadcastToTask(taskId, message)` | Emits payload to clients actively viewing task in drawer. |
| | `notifyUser(userId, message)` | Emits targeted payload to specific connected user sockets. |
| | `getConnectedUserIds()` | Returns array of user IDs with active WebSocket connections. |
| | `getOnlineStatus(userId)` | Resolves online state (`online`, `away`, `offline`) based on last activity. |

---

### 4.4 API Endpoints Reference (`backend/api/`)

#### 1. Authentication Router (`/api/auth`)
- `POST /api/auth/register`: Registers new user account.
- `POST /api/auth/login`: Authenticates credentials and returns JWT token.

#### 2. Tasks & Todos Router (`/api/todos`, `/api/tasks`, `/tasks`)
- `GET /api/todos`: Lists private or team tasks with query filters (`completed`, `search`, `priority`, `status`, `assignedToUserId`).
- `POST /api/todos`: Creates a task with attributes (`priority`, `status`, `startDate`, `dueDate`, `estimatedHours`, `assignedToUserId`).
- `GET /api/todos/:id`: Retrieves full details for a specific task.
- `PUT /api/todos/:id`: Updates task fields, enforcing RBAC role limits and transition rules.
- `DELETE /api/todos/:id`: Deletes task record.
- `POST /api/todos/:id/assign`: Assigns task to specified user.
- `POST /api/todos/:id/unassign`: Clears assigned user.
- `POST /api/todos/:id/comments`: Adds discussion comment to task.
- `GET /api/todos/:id/comments`: Retrieves all comments for task.
- `PUT /api/comments/:commentId`: Edits comment message.
- `DELETE /api/comments/:commentId`: Deletes comment message.
- `POST /api/todos/:id/attachments`: Uploads attachment metadata file record.
- `GET /api/todos/:id/attachments`: Lists attachment files for task.
- `DELETE /api/attachments/:attachmentId`: Deletes attachment metadata file record.
- `GET /api/attachments/:attachmentId/download`: Streams file payload or binary content.
- `GET /api/todos/:id/history`: Retrieves audit log history trail for task.

#### 3. Teams & Workspaces Router (`/api/teams`, `/teams`)
- `POST /api/teams`: Creates new team workspace (requester = `OWNER`).
- `GET /api/teams`: Lists teams authenticated user belongs to.
- `GET /api/teams/:teamId`: Retrieves team roster, pending invites, and details.
- `PUT /api/teams/:teamId`: Renames team (requester MUST be `OWNER`).
- `DELETE /api/teams/:teamId`: Deletes team and detaches tasks (requester MUST be `OWNER`).
- `POST /api/teams/:teamId/invites`: Sends invitation email to user (`OWNER` / `ADMIN`).
- `GET /api/teams/:teamId/invites`: Lists active pending invitations.
- `DELETE /api/teams/:teamId/invites/:id`: Revokes pending invitation (`OWNER` / `ADMIN`).
- `PUT /api/teams/:teamId/members/:userId/role`: Changes member role (`OWNER` only).
- `DELETE /api/teams/:teamId/members/:userId`: Removes member from team workspace.
- `GET /api/teams/:teamId/activity`: Retrieves paginated activity timeline for team.
- `GET /api/teams/:teamId/analytics`: Returns workspace completion stats, charts, and workloads.
- `GET /api/teams/:teamId/files`: Retrieves shared workspace attachments directory.
- `POST /api/teams/:teamId/files`: Uploads shared workspace file asset.

#### 4. Team Invitations Router (`/api/invites`, `/invites`)
- `GET /api/invites/:token`: Validates invite token details.
- `POST /api/invites/:token/accept`: Accepts team invite token and joins team workspace.
- `POST /api/invites/:token/reject`: Rejects team invite token.

#### 5. Profile Router (`/api/profile`, `/profile`)
- `GET /api/profile`: Retrieves profile details for authenticated user.
- `PUT /api/profile`: Updates profile information (`name`, `bio`, `phoneNumber`, `avatarUrl`, `timezone`).
- `PUT /api/change-password`: Verifies current password and updates to new password.

#### 6. Account Settings Router (`/api/account`, `/account`)
- `GET /api/account/settings`: Retrieves user application preferences.
- `PUT /api/account/settings`: Saves user preferences (`theme`, `notifications`, `emailAlerts`, `language`).
- `DELETE /api/account`: Permanently deletes user account and cleanups data.

#### 7. Notifications Router (`/api/notifications`)
- `GET /api/notifications`: Retrieves notifications list.
- `GET /api/notifications/unread-count`: Returns unread notification count.
- `PUT /api/notifications/:id/read`: Marks single notification as read.
- `PUT /api/notifications/read-all`: Marks all notifications of user as read.
- `DELETE /api/notifications/:id`: Deletes notification.

#### 8. Activity Log Router (`/api/activity`)
- `GET /api/activity`: Retrieves paginated activity timeline across user's personal tasks and teams.

#### 9. Workspace Chat Router (`/api/teams`)
- `GET /api/teams/:teamId/chat/messages`: Retrieves team workspace chat history.
- `POST /api/teams/:teamId/chat/messages`: Sends chat message with `@mentions` parsing.
- `PUT /api/teams/:teamId/chat/messages/:messageId`: Edits chat message.
- `DELETE /api/teams/:teamId/chat/messages/:messageId`: Deletes chat message.
- `POST /api/teams/:teamId/chat/read`: Updates user's chat read timestamp.

---

## 5. Frontend Architecture & Complete Reference

### 5.1 Architecture & Navigation Structure (`App.tsx`)

The frontend single-page application uses **Hash Routing** (`#/tasks`, `#/account`, `#/activity`, `#/calendar`, `#/chat`, `#/members`, `#/files`, `#/reports`, `#/settings`, `#/notifications`, `#/accept-invite`) managed by `App.tsx`.

- **Global Shell (`Layout.tsx`)**: Wraps all views with a header bar, workspace selector dropdown, active view navigation tabs, WebSocket online indicator badge, unread notification counter badge, and theme applicability engine.

```
App.tsx Layout Root
├── Workspace Switcher (Private Workspace vs Team Workspace)
├── Navigation Bar (Tasks | Calendar | Chat | Members | Files | Reports | Activity | Settings | Notifications)
├── Views (Rendered dynamically based on activeView hash route):
│   ├── Login / Register Page (Login.tsx)
│   ├── Accept Invite Page (AcceptInvite.tsx)
│   ├── Account & Profile Page (Account.tsx)
│   ├── Activity Timeline Feed (ActivityTimeline.tsx)
│   ├── Team Workspace Calendar (TeamCalendar.tsx)
│   ├── Workspace General Chat (TeamChat.tsx)
│   ├── Team Members & Invites Manager (TeamMembers.tsx + TeamInvites.tsx)
│   ├── Shared Workspace Files Manager (SharedFiles.tsx)
│   ├── Team Analytics & Reports (TeamAnalytics.tsx)
│   ├── Team Settings (TeamSettings.tsx)
│   ├── Notification Center (NotificationCenter.tsx)
│   └── Main Workspace Dashboard (Dashboard.tsx)
│       ├── View Mode Switcher (List View vs Kanban Board View)
│       ├── Search & Multi-Attribute Filter Drawers
│       ├── Quick Task Create Form (TodoForm.tsx)
│       ├── Kanban Task Columns & Drag-and-Drop (TaskBoard.tsx + TaskCard.tsx)
│       └── Task Details Drawer (TaskDetailsDrawer.tsx)
```

---

### 5.2 Custom Hooks Reference (`frontend/src/hooks/`)

1. **`useAuth(onLogoutSuccess)`**:
   - Manages user authentication state, stored JWT token in `localStorage`, user session object, login/register forms, error states, and session logout actions.
2. **`useTodos(workspace)`**:
   - Manages task list state for the active workspace (Private or Team).
   - Handles multi-attribute search and filtering: `query`, `filter` (All/Active/Completed), `priorityFilter` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `statusFilter` (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), `assigneeFilter`, `dueFilter` (Overdue, Due Today, Due This Week).
   - Handles task submission, completion toggling, assignee updates, and task deletion.
3. **`useTeams(workspace, setWorkspace, user, canPerformAction)`**:
   - Manages teams list, active team details, role determinations (`OWNER`, `ADMIN`, `MEMBER`), team creation, renaming, deletion, member invitations, invite revocations, role modification, and member removal.
4. **`useWebSocket(token, teamId, workspaceKind)`**:
   - Connects to `ws://localhost:4000/socket` (or Vite proxy `/socket`).
   - Maintains heartbeat ping-pong, joins active workspace rooms, transmits real-time typing indicators (`sendTypingStatus`), transmits active task drawer viewing states (`sendTaskDrawerState`), and listens for custom window events (`ws:event`).

---

### 5.3 Frontend Component Directory Matrix (`frontend/src/components/`)

| Folder | Component Name | Description & Key Functionality |
| :--- | :--- | :--- |
| **`task/`** | `TaskBoard.tsx` | Render Kanban column layout (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with drag-and-drop card movements. |
| | `TaskCard.tsx` | Individual task card displaying status badge, priority pill, due date tag, assignee avatar, and comment count. |
| | `TaskDetailsDrawer.tsx` | Drawer displaying complete task attributes, status progression stepper, assignee picker, start/due dates, effort hours estimate, discussion comments thread, attachment file manager with upload/download, and audit history ledger. |
| | `TaskList.tsx` | Container for list-view task items. |
| | `TodoForm.tsx` | Quick task creation form with title, description, priority, due date, effort hours, and assignee picker. |
| | `TodoItem.tsx` | Checklist task row with checkbox toggle, metadata tags, edit button, and delete trigger. |
| **`chat/`** | `TeamChat.tsx` | Real-time workspace chat room with message history scroll, `@mentions` autocomplete menu, typing indicators, message editing/deletion, and unread counter badges. |
| **`files/`** | `SharedFiles.tsx` | Workspace shared assets directory displaying file groupings, version history, file preview modals, storage capacity gauge, and search/type filtering. |
| **`notifications/`** | `NotificationCenter.tsx` | Real-time notifications inbox displaying unread badges, mark as read triggers, clear all, and deep links to target tasks or team workspaces. |
| **`workspace/`** | `WorkspaceOverview.tsx` | Workspace summary header card displaying member roster counts, active tasks breakdown, and recent activity. |
| | `TeamAnalytics.tsx` | Reports page displaying task completion rate charts, member workload distribution bars, priority pie chart breakdown, and overdue task warnings. |
| | `TeamCalendar.tsx` | Interactive monthly calendar mapping task due dates to calendar grids with color-coded status badges. |
| | `TeamMembers.tsx` | Workspace member roster table displaying user avatars, email addresses, role badges (Owner, Admin, Member), role management dropdown, and member removal action triggers. |
| | `TeamInvites.tsx` | Pending workspace invitations list with invite email input form, resend invite link, and revoke invitation button. |
| | `TeamSettings.tsx` | Workspace settings form allowing team renames and dangerous team deletion action zone. |
| **`layouts/`** | `Layout.tsx` | Master header navigation shell, workspace dropdown selector, view tab navigation, user avatar menu, dark/light theme engine, and WebSocket status indicator badge. |
| **`shared/`** | `Avatar.tsx`, `Badge.tsx`, `Button.tsx`, `Card.tsx`, `Dropdown.tsx`, `EmptyState.tsx`, `Input.tsx`, `LoadingSkeleton.tsx`, `Modal.tsx`, `Tabs.tsx`, `Toast.tsx` | Reusable atomic UI components built with modern styling and responsive interactions. |

---

## 6. Complete File-by-File Repository Inventory

The following table documents **every file** in the codebase:

| Relative File Path | Category | Purpose / Description |
| :--- | :--- | :--- |
| `backend/index.ts` | Backend | Express HTTP server entrypoint, WebSocket gateway init, background Email worker launcher, route mounts. |
| `backend/tsconfig.json` | Config | TypeScript compiler configuration for backend node environment. |
| `backend/package.json` | Config | Node backend dependencies (express, prisma, ws, bcrypt, jsonwebtoken, vitest). |
| `backend/vitest.config.ts` | Config | Vitest test runner configuration for backend integration tests. |
| `backend/api/authRouter.ts` | API | Public authentication endpoints (`/register`, `/login`). |
| `backend/api/todoRouter.ts` | API | Tasks CRUD, extensions, assignees, comments, attachments, and history audit endpoints. |
| `backend/api/teamRouter.ts` | API | Workspace management, roster, invites, RBAC roles, analytics, and shared files endpoints. |
| `backend/api/inviteRouter.ts` | API | Invitation token validation, acceptance, and rejection endpoints. |
| `backend/api/profileRouter.ts` | API | User profile details and password change endpoints. |
| `backend/api/accountRouter.ts` | API | User application settings and account deletion endpoints. |
| `backend/api/notificationRouter.ts` | API | Notification inbox, unread counts, read receipts, and deletion endpoints. |
| `backend/api/activityRouter.ts` | API | Paginated activity timeline feed endpoints. |
| `backend/api/chatRouter.ts` | API | Workspace general chat history, `@mentions` posting, and read receipt endpoints. |
| `backend/middleware/auth.ts` | Middleware | JWT bearer token verification middleware. |
| `backend/middleware/errorHandler.ts` | Middleware | Global error response handling middleware. |
| `backend/middleware/logging.ts` | Middleware | HTTP request logging middleware. |
| `backend/middleware/validation.ts` | Middleware | Request payload and query validation middleware. |
| `backend/services/authService.ts` | Service | Password hashing, user registration, and authentication service. |
| `backend/services/userService.ts` | Service | User profile management, settings, password change, and account deletion service. |
| `backend/services/taskService.ts` | Service | Task CRUD, status workflow logic, comments, attachments, and audit history service. |
| `backend/services/teamService.ts` | Service | Workspace management, team member roster, RBAC roles, and invites service. |
| `backend/services/inviteService.ts` | Service | Team invite token verification, accept, and reject service. |
| `backend/services/activityService.ts` | Service | System activity logging and activity timeline query service. |
| `backend/services/notificationService.ts` | Service | In-app notification creation, retrieval, and WebSocket badge emission service. |
| `backend/services/chatService.ts` | Service | Workspace general chat messages, `@mentions` parsing, and unread counts service. |
| `backend/services/collaborationService.ts` | Service | Workspace analytics calculations and shared files directory service. |
| `backend/services/emailService.ts` | Service | Outbox `EmailQueue` background processing worker service. |
| `backend/services/eventEmitter.ts` | Service | Internal Node `EventEmitter` pub/sub instance module. |
| `backend/services/eventService.ts` | Service | Event bus listeners firing automatic notifications and activity logs on domain events. |
| `backend/services/websocketService.ts` | Service | WebSocket server initialization, workspace room management, and real-time event broadcaster. |
| `backend/prisma/schema.prisma` | Database | Complete MySQL Prisma database schema definition file (13 models, 4 enums). |
| `frontend/src/main.tsx` | Frontend | React client application entrypoint rendering `App.tsx`. |
| `frontend/src/App.tsx` | Frontend | Main single-page application controller, hash router, and layout view selector. |
| `frontend/src/api.ts` | Frontend | Centralized Axios/fetch HTTP API client with auth token headers and response wrappers. |
| `frontend/src/types.ts` | Frontend | TypeScript type definitions for domain models, payloads, and application states. |
| `frontend/src/App.css` | Frontend | Primary design system CSS file containing custom properties, dark/light themes, and UI styles. |
| `frontend/src/index.css` | Frontend | Reset CSS styles and typography font imports. |
| `frontend/src/hooks/useAuth.ts` | Frontend Hook | Custom hook managing user auth state, session tokens, login, register, and logout. |
| `frontend/src/hooks/useTodos.ts` | Frontend Hook | Custom hook managing tasks state, search/filters, creation, completion, and deletion. |
| `frontend/src/hooks/useTeams.ts` | Frontend Hook | Custom hook managing workspace list, active team, creation, invites, and RBAC actions. |
| `frontend/src/hooks/useWebSocket.ts` | Frontend Hook | Custom hook managing real-time WebSocket connection, heartbeats, and room listeners. |
| `frontend/src/pages/Login.tsx` | Frontend Page | Auth page with Login and Register tabs, password reset flow, and prefilled invite token support. |
| `frontend/src/pages/Dashboard.tsx` | Frontend Page | Main workspace view with Kanban board / list switcher, task creation form, and filter drawers. |
| `frontend/src/pages/Account.tsx` | Frontend Page | Profile details editor, theme/preference switches, password update, and account deletion modal. |
| `frontend/src/pages/ActivityTimeline.tsx` | Frontend Page | Workspace activity feed with entity filters and user metadata cards. |
| `frontend/src/pages/AcceptInvite.tsx` | Frontend Page | Team invitation acceptance page displaying team preview and token accept/reject buttons. |
| `frontend/src/components/task/TaskBoard.tsx` | Component | Kanban board grid rendering columns for `TODO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`. |
| `frontend/src/components/task/TaskCard.tsx` | Component | Kanban task card displaying title, status, priority, due date, assignee, and comments count. |
| `frontend/src/components/task/TaskDetailsDrawer.tsx` | Component | Full-screen drawer displaying complete task details, discussion comments, file attachments, and audit log. |
| `frontend/src/components/task/TaskList.tsx` | Component | Task list view container component. |
| `frontend/src/components/task/TodoForm.tsx` | Component | Quick task creation form modal. |
| `frontend/src/components/task/TodoItem.tsx` | Component | Classic task row item with toggle checkbox and action buttons. |
| `frontend/src/components/chat/TeamChat.tsx` | Component | Workspace general chat room with `@mentions`, typing status, and edit/delete support. |
| `frontend/src/components/files/SharedFiles.tsx` | Component | Workspace shared assets directory with storage gauge and file preview modals. |
| `frontend/src/components/notifications/NotificationCenter.tsx` | Component | Real-time notification inbox with unread badges and mark as read buttons. |
| `frontend/src/components/workspace/WorkspaceOverview.tsx` | Component | Workspace overview summary card with roster stats and recent activities. |
| `frontend/src/components/workspace/TeamAnalytics.tsx` | Component | Workspace analytics dashboard with completion rate charts and workload distributions. |
| `frontend/src/components/workspace/TeamCalendar.tsx` | Component | Interactive monthly calendar mapping task due dates visually. |
| `frontend/src/components/workspace/TeamMembers.tsx` | Component | Team member roster table with role management dropdowns and removal actions. |
| `frontend/src/components/workspace/TeamInvites.tsx` | Component | Pending invitations manager with email invite form and revoke actions. |
| `frontend/src/components/workspace/TeamSettings.tsx` | Component | Team settings form for renaming team and team deletion action zone. |
| `frontend/src/components/layouts/Layout.tsx` | Component | Header shell, workspace dropdown switcher, view tabs navigation, and WebSocket status indicator. |
| `frontend/src/components/shared/*` | Component | Atomic shared components (`Avatar`, `Badge`, `Button`, `Card`, `Dropdown`, `EmptyState`, `Input`, `LoadingSkeleton`, `Modal`, `Tabs`, `Toast`). |
| `frontend/src/utils/task.ts` | Utility | Helpers for task priority colors, status labels, date formatting, and filter sorting. |
| `frontend/src/utils/time.ts` | Utility | Relative timestamp formatting helpers (`2 mins ago`, `Yesterday`). |
| `shared/API.md` | Shared Doc | Complete API contract documentation with HTTP payloads and permission rules. |
| `shared/STATUS.md` | Shared Doc | Sprint roadmap progress tracking document. |
| `shared/DATABASE.md` | Shared Doc | MySQL database guidelines and Prisma migration notes. |
| `project-management/*` | Documentation | Sprint reports (`SPRINT_4_REPORT.md`, `SPRINT_5_AUDIT_REPORT.md`, `CURRENT_SPRINT.md`, `CHANGELOG.md`). |

---

## 7. Verification & How to Run the Project

### Prerequisites
- **Node.js**: `v18+` or `v20+`
- **MySQL Database**: Running on `localhost:3306` (Database: `tododb`)

### Backend Setup & Launch
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment variables in backend/.env
# DATABASE_URL="mysql://root:password@localhost:3306/tododb"
# JWT_SECRET="dev-jwt-secret-key"
# PORT=4000

# 4. Generate Prisma Client & apply migrations
npx prisma db push

# 5. Launch backend development server (HTTP + WebSockets + Email Worker)
npm run dev
```

### Frontend Setup & Launch
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

### Automated Testing Execution
```bash
# Run backend Vitest integration suites
cd backend
npm run test

# Run frontend Vitest component suites
cd frontend
npm run test
```

---
*Documentation generated on August 22, 2026 for repository `d:\TODO`.*
