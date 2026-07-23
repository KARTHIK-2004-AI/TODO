# Sprint 2 Integration & System Issues

This document records all integration, architectural, and contract mismatches discovered during the Sprint 2 End-to-End System Review, along with their resolution status.

---

## 1. Database Connection & Credentials Configuration

- **Issue**: Database connection setup and environment configuration.
- **Location**: [backend/prisma/schema.prisma](file:///d:/TODO/backend/prisma/schema.prisma), [backend/.env](file:///d:/TODO/backend/.env)
- **Severity**: CRITICAL
- **Status**: ✅ **RESOLVED**
- **Resolution**: Updated `DATABASE_URL="mysql://root:root@localhost:3306/todo_db"` in `backend/.env` matching the local MySQL server root credentials. Executed `npx prisma db push` to synchronize MySQL schema and generated the updated Prisma client. All database CRUD and cascading deletion operations verified working 100%.

---

## 2. Profile Data Field Contract Mismatch (`phoneNumber` vs `phone`)

- **Issue**: Profile phone number updates failed to persist and display correctly in the UI.
- **Location**: [frontend/src/types.ts](file:///d:/TODO/frontend/src/types.ts), [frontend/src/App.tsx](file:///d:/TODO/frontend/src/App.tsx)
- **Severity**: HIGH
- **Status**: ✅ **RESOLVED**
- **Resolution**: Updated `ProfileData` interface in `types.ts` to use `phoneNumber?: string`. Refactored `App.tsx` state and form controls to read, edit, and send `phoneNumber` matching backend REST endpoints and database schema.

---

## 3. Account Settings Structure & Property Key Mismatches

- **Issue**: User preferences settings failed to load or save correctly between frontend and backend.
- **Location**: [frontend/src/types.ts](file:///d:/TODO/frontend/src/types.ts), [frontend/src/App.tsx](file:///d:/TODO/frontend/src/App.tsx)
- **Severity**: HIGH
- **Status**: ✅ **RESOLVED**
- **Resolution**: Updated `AccountSettings` interface in `types.ts` and `App.tsx` form state to `{ theme?: 'light' | 'dark' | 'system', notifications?: boolean, emailAlerts?: boolean, language?: string }` matching backend Zod schema and JSON preferences structure.

---

## 4. Account Endpoint Error Masking & Fallback State

- **Issue**: Backend integration errors were hidden behind silent frontend fallbacks.
- **Location**: [frontend/src/App.tsx](file:///d:/TODO/frontend/src/App.tsx)
- **Severity**: MEDIUM
- **Status**: ✅ **RESOLVED**
- **Resolution**: Removed silent mock fallbacks in `loadAccountData` in `App.tsx`. API errors are now properly caught and displayed as banner notices so developers and users see live backend feedback.

---

## 5. Account Deletion Password Confirmation UI

- **Issue**: Frontend delete account modal did not prompt for password verification.
- **Location**: [frontend/src/api.ts](file:///d:/TODO/frontend/src/api.ts), [frontend/src/App.tsx](file:///d:/TODO/frontend/src/App.tsx)
- **Severity**: MEDIUM
- **Status**: ✅ **RESOLVED**
- **Resolution**: Updated `deleteAccount(password?: string)` helper in `api.ts` to pass password payload when present. Added password confirmation input field to deletion modal in `App.tsx`.

---

## 6. Password Min-Length Validation Discrepancy

- **Issue**: Frontend and backend enforced conflicting minimum password length constraints.
- **Location**: [frontend/src/App.tsx](file:///d:/TODO/frontend/src/App.tsx), [backend/api/profileRouter.ts](file:///d:/TODO/backend/api/profileRouter.ts)
- **Severity**: LOW
- **Status**: ✅ **RESOLVED**
- **Resolution**: Aligned frontend password change validation rule to 6 minimum characters (`passwordForm.newPassword.length < 6`) matching backend Zod schema and API documentation.
