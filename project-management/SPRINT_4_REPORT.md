# Sprint 4 Engineering Report — Notification Center & Activity Timeline

## 1. Executive Summary

In Sprint 4, we successfully designed and implemented an event-driven architecture to power a **Notification Center** and **Activity Timeline** for the Todo Application.

All core database operations (todo CRUD, team lifecycle events) now generate event signals. Subscribers process these signals asynchronously to record activity logs and dispatch notifications, decoupling secondary logic from API response paths.

---

## 2. System Architecture

A centralized pub-sub model was implemented in the backend using Node.js's native `EventEmitter`.

```mermaid
graph TD
    UserClient[User Client] -->|HTTP Request| ExpressRouter[Express Router]
    ExpressRouter -->|Calls Service| MainService[Todo / Team Service]
    MainService -->|Writes DB| MySQL[MySQL Database]
    MainService -->|Emits Event| EventEmitter[Event Service Emitter]
    
    subgraph Event Handlers (Asynchronous)
        EventEmitter -->|todo.created / todo.completed| TodoHandler[Todo Handler]
        EventEmitter -->|team.renamed / team.deleted / team.invited| TeamHandler[Team Handler]
        
        TodoHandler -->|Calls| ActivityService[Activity Service]
        TodoHandler -->|Calls| NotificationService[Notification Service]
        TeamHandler -->|Calls| ActivityService
        TeamHandler -->|Calls| NotificationService
    end
    
    ActivityService -->|Creates| ActivityLogTable[ActivityLog Table]
    NotificationService -->|Creates| NotificationTable[Notification Table]
```

### Event Producers
- **TodoService**: Emits `todo.created`, `todo.updated`, `todo.completed`, `todo.deleted`.
- **TeamService**: Emits `team.created`, `team.renamed`, `team.deleted`, `team.invited`, `team.invite_accepted`, `team.member_removed`, `team.role_updated`.

### Event Consumers
- Listeners catch the event signals and query profile details (e.g. user display names) to generate:
  1. An **ActivityLog** entry (logged for both private and team-scoped events).
  2. One or more **Notification** entries (sent to other team members or invited users).

---

## 3. Database Layer

New tables were appended to `schema.prisma` with foreign key relations and cascading delete behaviors:

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model ActivityLog {
  id         String   @id @default(uuid())
  teamId     String?
  team       Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action     String
  entityType String
  entityId   String
  metadata   Json
  createdAt  DateTime @default(now())
}
```

---

## 4. REST APIs & Route Controllers

Standard routes were added to expose these datasets:

### Notifications
- `GET /api/notifications` — Fetch all notifications for the user.
- `GET /api/notifications/unread-count` — Count unread alerts.
- `PUT /api/notifications/:id/read` — Mark an alert as read.
- `PUT /api/notifications/read-all` — Mark all alerts as read.
- `DELETE /api/notifications/:id` — Delete an alert.

### Activity Logs
- `GET /api/activity` — Get unified timeline logs (personal + user's teams).
- `GET /api/teams/:teamId/activity` — Get team-isolated timeline logs (requires membership check).

---

## 5. Automated Verification Results

Integration tests were added to `backend/services/__tests__/`:
- `notificationService.test.ts`: Validates notification creation, read status updates, unread counts, and deletion.
- `activityService.test.ts`: Validates personal timelines, team scoping, team membership locks, and category filters.

All **18 backend service tests** pass sequentially in **14.16 seconds**:

```
✓ services/__tests__/userService.test.ts (6 tests) 1907ms
✓ services/__tests__/authService.test.ts (4 tests) 1085ms
✓ services/__tests__/todoService.test.ts (3 tests) 828ms
✓ services/__tests__/teamService.test.ts (1 test) 920ms
✓ services/__tests__/activityService.test.ts (2 tests) 636ms
✓ services/__tests__/notificationService.test.ts (2 tests) 455ms

Test Files  6 passed (6)
Tests  18 passed (18)
```

---

## 6. Frontend UI / UX Architecture

### Notification Center
- **Bell Icon & Badge**: Dynamic bell icon in the dashboard layout header displaying a red unread badge.
- **Dropdown List**: Auto-closes on outside clicks, featuring scrollable alerts, empty catching, and loading spinner states.
- **Read & Delete Actions**: Mark individual alerts as read, read-all in bulk, or delete notifications.

### Activity Timeline Page
- **Unified & Scoped Timeline**: Queries personal activities or team activities.
- **Categories Filter**: Filters by category type (Todos, Teams, Invites, Roles).
- **Pagination**: Supports pagination with Next/Prev navigation.
