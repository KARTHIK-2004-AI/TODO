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
  - Database: SQLite (local file-based, zero setup, easy to run anywhere)
- **Consequences**:
  - Requires `npm init`, typescript configuration, and Prisma migration steps.
  - Generates type-safe database queries.
