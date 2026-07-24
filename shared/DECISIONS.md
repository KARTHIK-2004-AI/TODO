# Architectural Decisions Log

## DEC-001: Backend Tech Stack Selection

- **Status**: Accepted
- **Date**: 2026-07-19
- **Context**: Setting up a production-ready backend for a Task/Todo management system from scratch in an empty repository.
- **Decision**: 
  - Language: TypeScript (for type safety and autocompletion)
  - Runtime: Node.js
  - Framework: Express.js (flexible, standard, simple to structure)
  - ORM: Prisma (excellent type safety, schema migrations, and clean API)
  - Database: SQLite (local file-based initial setup; superseded by DEC-002)
- **Consequences**:
  - Requires `npm init`, typescript configuration, and Prisma migration steps.
  - Generates type-safe database queries.

---

## DEC-002: Switching Database Engine to MySQL

- **Status**: Accepted
- **Date**: 2026-07-23
- **Context**: Scaling database architecture to production standards with relational database support.
- **Decision**: 
  - Update Prisma ORM provider from `sqlite` to `mysql` in `backend/prisma/schema.prisma`.
  - Update `DATABASE_URL` in `backend/.env` to `mysql://root:password@localhost:3306/tododb`.
- **Consequences**:
  - Enables production-grade relational features, ACID transactions, and MySQL scaling.
  - Requires MySQL database server instance listening on standard port 3306.

