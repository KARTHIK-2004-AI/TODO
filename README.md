# Todo Application — Production-Ready Full Stack Task Management System

A full-stack Todo Application featuring an Express TypeScript backend with Prisma ORM (SQLite) and a React + TypeScript + Vite frontend.

---

## Architecture Overview

```
├── backend/            # Express + TypeScript REST API
│   ├── api/            # API Route Controllers (Auth, Todos, Profile, Account)
│   ├── database/       # Prisma Client configuration
│   ├── middleware/     # Auth, Validation, Logging, Error Handler
│   ├── prisma/         # Prisma Schema & SQL Migrations
│   └── services/       # Core Business Logic Services
├── frontend/           # React 19 + TypeScript + Vite Web Application
│   ├── public/         # Static assets
│   └── src/            # Components, Views, Hooks, API client
├── project-management/ # Sprint tracking & Engineering reports
├── shared/             # API Contracts & Specification documents
└── DATABASE.md         # Database schema & strategy documentation
```

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Zod, Prisma ORM, SQLite, JWT Authentication, Winston Logging
- **Frontend**: React 19, TypeScript, Vite, Vanilla CSS
- **Database**: SQLite (via Prisma ORM for local development)

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## Quick Start / Setup Instructions

### 1. Environment Setup

Copy the environment template in `backend`:

```bash
cd backend
cp .env.example .env
```

Ensure `backend/.env` has valid development configurations:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-here"
```

### 2. Backend Setup & Run

Navigate to the `backend` directory, install dependencies, run migrations, seed the database, and start the development server:

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Apply Database Migrations
npx prisma migrate dev

# Seed Default User & Demo Data
npx prisma db seed

# Start Backend Server (runs on http://localhost:4000)
npm run dev
```

### 3. Frontend Setup & Run

In a separate terminal, navigate to `frontend`, install dependencies, and start the Vite dev server:

```bash
cd frontend

# Install dependencies
npm install

# Start Frontend Dev Server (runs on http://localhost:5173)
npm run dev
```

---

## Available Scripts

### Backend (`cd backend`)
- `npm run dev`: Start Express backend server in development mode with HMR (`ts-node-dev`)
- `npm run build`: Compile TypeScript to `dist/`
- `npm start`: Run compiled production server
- `npx prisma migrate dev`: Run Prisma database migrations
- `npx prisma db seed`: Seed initial data (`test@example.com` / `password123`)
- `npx prisma studio`: Open Prisma GUI database browser

### Frontend (`cd frontend`)
- `npm run dev`: Start Vite development server
- `npm run build`: Build production bundle to `dist/`
- `npm run lint`: Run ESLint checks

---

## Documentation Links

- [DATABASE.md](file:///d:/TODO/DATABASE.md): Detailed database schema, SQLite details, migration history, and production strategy.
- [shared/API.md](file:///d:/TODO/shared/API.md): Comprehensive REST API contract documentation for Auth, Todos, Profile, and Account management.
- [project-management/SPRINT_2_1_REPORT.md](file:///d:/TODO/project-management/SPRINT_2_1_REPORT.md): Sprint 2.1 Engineering Cleanup & Production Readiness Report.

---

## Seed Account Credentials

For local testing, after running `npx prisma db seed`, you can log in with:
- **Email**: `test@example.com`
- **Password**: `password123`
