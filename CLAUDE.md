# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Web UI
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server

# CLI
pnpm clawion          # Run CLI directly (without global link)
clawion ui            # Start web UI from CLI
clawion init          # Initialize workspace

# Linting & Testing
pnpm lint             # Biome lint check
pnpm lint:fix         # Auto-fix lint issues
pnpm test             # Run vitests
pnpm test:watch       # Watch mode
pnpm coverage         # Coverage report
```

## Architecture

Clawion has two entry points: a CLI (`bin/clawion.ts`) for agents and a Next.js web UI (`src/app/`) for human oversight.

### Core Domain (`src/core/`)

**Schemas** (`src/core/schemas/`) - Zod-validated data types:
- `mission.ts` - Mission metadata and status
- `missions-index.ts` - Mission registry
- `tasks.ts` - Tasks with columns, status notes, assignees
- `workers.ts` - Workers with roles (manager/worker), status
- `thread.ts` - Thread messages for task discussions
- `log.ts` - Worker activity logs with levels (info/warn/error)

**Workspace** (`src/core/workspace/`) - File-based persistence:
- `init.ts` - Workspace directory setup
- `missions.ts`, `tasks.ts`, `workers.ts`, `threads.ts`, `logs.ts` - CRUD operations
- `permissions.ts` - Manager role enforcement
- `paths.ts` - Workspace path resolution

Data stored as JSON/Markdown files on disk - no database.

### Web UI (`src/app/`)

- App Router with `page.tsx` (Dashboard) and API routes
- API routes (`src/app/api/`) mirror CLI operations for UI data access
- Components in `src/components/` - shadcn/ui primitives + domain components

### UI Components (`src/components/dashboard-ui/`)

Atomic React components for the Dashboard:
- `dashboard.tsx` - Main orchestrator (state + data fetching)
- `dashboard-header.tsx` - Mission overview with Snapshot dropdown
- `sidebar.tsx` - Collapsible navigation
- `task-board.tsx`, `task-column.tsx`, `task-card.tsx` - Task hierarchy
- `worker-dropdown.tsx` - Worker selection with logs/working tabs
- `mission-list.tsx`, `threads-list.tsx` - Navigation lists

## Key Patterns

- **Zod for validation**: All domain types inferred from `src/core/schemas/*.ts`
- **File-based storage**: Operations in `src/core/workspace/` read/write JSON/Markdown
- **API parity**: `src/app/api/` routes mirror CLI commands for UI data
- **React best practices**: Memoized derived state, atomic components, explicit prop interfaces

## Working Instructions

- After every code change, run `pnpm test` and `pnpm lint` and ensure zero errors.
- Once tests and lint pass, commit the changes immediately.
- Use English Conventional Commits for all messages (e.g. `feat: add xyz`, `fix: correct abc`).