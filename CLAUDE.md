# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asan is a web-based fleet management and live GPS tracking dashboard that integrates with a [Traccar](https://www.traccar.org/) server. It supports real-time device tracking and historical route replay.

## Commands

All commands use **pnpm** and should be run from the repo root unless noted.

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # ESLint across monorepo
pnpm format       # Prettier across monorepo
pnpm typecheck    # TypeScript type-check across monorepo
```

Single-package commands (run from `apps/web/` or `packages/ui/`):
```bash
pnpm preview      # Preview production build (web app only)
```

Turborepo caches task outputs — pass `--force` to bypass cache.

## Architecture

**Monorepo** (pnpm workspaces + Turborepo):
- `apps/web/` — Main React/Vite application
- `packages/ui/` — Shared component library (`@workspace/ui`)
- `openapi.yaml` — Traccar 6.12.2 API specification

**Tech stack**: React 19, TypeScript (strict), Vite, Tailwind CSS v4, shadcn/ui + Radix UI, MapLibre GL, Zod

### Key files in `apps/web/src/`

| File/Dir | Purpose |
|---|---|
| `App.tsx` | Root component; handles map fly-to logic, view mode switching (live/replay), theme toggling |
| `hooks/use-fleet.ts` | Central state hook — manages Traccar API calls, WebSocket connection, selected device/position/trip |
| `lib/traccar.ts` | Traccar type definitions and auth/login utilities |
| `lib/config.ts` | Session-storage-backed connection settings (server URL, auth mode) |
| `components/` | UI panels: `fleet-sidebar`, `live-panel`, `replay-panel`, `replay-controller`, `trip-table`, `metric-bar`, `settings-page` |

### Data flow

1. User configures Traccar server URL + credentials in `settings-page` (stored via `lib/config.ts`)
2. `use-fleet` hook authenticates, fetches devices/positions via REST, then opens a WebSocket for real-time updates
3. Selected device triggers map fly-to in `App.tsx`; view mode switches between live tracking and replay

### Shared UI package (`packages/ui/src/`)

- `components/ui/` — shadcn/ui primitives
- `components/ui/map.tsx` — MapLibre GL wrapper component
- Exported via path alias `@workspace/ui/*`

## Environment

Copy `.env.example` to `.env` and set:
```
VITE_API_URL=https://your-traccar-server
VITE_API_TOKEN=your-token   # optional; session auth is also supported
```

## Path Aliases

- `@/*` → `apps/web/src/*`
- `@workspace/ui/*` → `packages/ui/src/*`
