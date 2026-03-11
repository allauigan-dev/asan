# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asan is a web-based fleet management and live GPS tracking dashboard that integrates with a [Traccar](https://www.traccar.org/) server. It supports real-time device tracking, historical route replay, and detailed telemetry for GPS-tracked vehicles and assets.

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

**Tech stack**: React 19, TypeScript (strict), Vite 7, Tailwind CSS v4, shadcn/ui + Radix UI, MapLibre GL 5, Zod

**Package manager**: pnpm 9 | **Node**: >=20 required

## Key Files in `apps/web/src/`

| File/Dir | Purpose |
|---|---|
| `App.tsx` | Root component; layout, map interactions, live/replay view mode switching, theme toggling, map style switching |
| `hooks/use-fleet.ts` | Central state hook — Traccar API calls, WebSocket, device/position state, replay playback |
| `lib/traccar.ts` | Traccar type definitions, REST API client, auth/login utilities |
| `lib/config.ts` | Session-storage-backed connection settings (server URL, auth mode, credentials) |
| `lib/utils.ts` | Formatting helpers, distance/duration calculations, icon mapping, status normalization |
| `lib/map-optimizations.ts` | Icon preloading, adaptive WebSocket throttling, efficient data merge utilities |
| `lib/map-styles.ts` | Map style configurations (Carto, OSM, OSM 3D, Satellite) with light/dark variants |
| `components/` | All UI panels (see Components section below) |

## Components

| Component | Purpose |
|---|---|
| `fleet-sidebar.tsx` | Scrollable device list with status badges, speed, and selection |
| `live-panel.tsx` | Live view mode controls |
| `live-telemetry-panel.tsx` | Floating detailed telemetry panel — speed, altitude, battery, events, trip history |
| `replay-panel.tsx` | Date/time range selector and trip picker for route replay |
| `replay-controller.tsx` | Playback timeline, play/pause, speed selector (1×/2×/4×/8×) |
| `trip-table.tsx` | Table of trips with start/end time, distance, duration |
| `metric-bar.tsx` | Top header metrics for selected device or connection info |
| `settings-page.tsx` | Full-screen login form, server config, device management, image upload |
| `theme-provider.tsx` | Dark/light/system theme context with keyboard shortcut (`d` key) |
| `auth-image.tsx` | `<img>` with Authorization header for device photos served by Traccar |
| `icons.tsx` | SVG icon components for device categories and UI actions |

## Shared UI Package (`packages/ui/src/`)

- `components/ui/` — shadcn/ui primitives (badge, button, card, dialog, input, select, tabs, avatar, scroll-area, separator, skeleton, table)
- `components/ui/map.tsx` — MapLibre GL wrapper: `<Map>`, `<MapMarker>`, `<MapRoute>`, `<MapClusterLayer>`, `<MapControls>`
- `lib/utils.ts` — `cn()` utility for Tailwind class merging
- `styles/globals.css` — Tailwind entry point with CSS variables for light/dark themes
- Exported via path alias `@workspace/ui/*`

## Data Flow

```
User → settings-page (server URL + credentials)
         ↓
    lib/config.ts (sessionStorage)
         ↓
    hooks/use-fleet.ts
         ↓
    ┌────┴─────────────────┐
    ↓                      ↓
  REST API             WebSocket (/api/socket)
  /devices             realtime positions,
  /positions           devices, events
  /reports/trips
  /reports/summary
  /reports/events
    ↓                      ↓
    └────────┬─────────────┘
             ↓
        Fleet State
    (devices, positions, trails up to 500pts/device)
             ↓
          App.tsx
    ┌────────┴────────┐
    ↓                 ↓
  Live View       Replay View
  (clusters,      (full route polyline,
   markers,        animated marker,
   trails)         event markers)
```

## Authentication

Two supported modes (selected in settings-page):

1. **Session auth**: email + password → POST `/session` → bearer token. Supports TOTP 2FA.
2. **Token auth**: pre-existing Traccar API token sent as `Authorization: Bearer <token>`.

Auth state is stored in `sessionStorage` (cleared on browser close) via `lib/config.ts`.

## WebSocket & Performance

- WebSocket connects to `/api/socket` after login
- `PositionUpdateThrottler` in `lib/map-optimizations.ts` adapts update intervals:
  - High frequency (>20/s): 100 ms batching
  - Medium (5–20/s): 1050 ms batching
  - Low (<5/s): 2000 ms batching
- `startTransition()` used for non-urgent state updates to keep UI responsive
- Trail history capped at 500 points per device to bound memory usage

## Map Features

- **Live mode**: device markers, cluster layer when zoomed out, animated trails
- **Replay mode**: full route polyline, animated vehicle marker with ping effect, start (green) / end (red) / event (amber) markers
- **Map styles**: Carto (default), OSM, OSM 3D, Satellite — stored in `localStorage`
- **Theme-aware**: light/dark map style variants
- MapLibre GL 5 via `packages/ui/src/components/ui/map.tsx`

## TypeScript Conventions

- **Strict mode** enabled (`strict: true` in `tsconfig.app.json`)
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled
- Module resolution: `bundler` (ESNext modules)
- JSX: `react-jsx` (no explicit React import needed)
- Target: ES2022

## Code Style

Enforced via ESLint + Prettier (flat config format):

- **Formatting**: 2-space indent, no semicolons, double quotes, trailing commas (ES5), 80-char line width, LF line endings
- **Tailwind**: class sorting via `prettier-plugin-tailwindcss`; `cn()` and `cva()` are recognized tailwind functions
- **Imports**: TypeScript recommended + React hooks + React refresh rules
- Run `pnpm format` before committing

## Environment

Copy `.env.example` to `.env` and set:
```
API_URL=192.168.1.71:8082        # Traccar server host:port (no protocol)
API_TOKEN=<your-api-token>       # Optional; session auth is also supported
```

Vite exposes these as `VITE_API_URL` and `VITE_API_TOKEN`. A dev proxy is configured in `vite.config.ts` when `VITE_TRACCAR_URL` is set, forwarding `/api` to the Traccar server.

## Path Aliases

- `@/*` → `apps/web/src/*`
- `@workspace/ui/*` → `packages/ui/src/*`

## Adding shadcn/ui Components

Components are installed into `packages/ui/src/components/ui/` (not `apps/web/`).
Config is at `apps/web/components.json` with alias `"ui": "@workspace/ui/components"`.

## Traccar API Reference

The full Traccar 6.12.2 OpenAPI spec is at `openapi.yaml`. Key endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /session` | Login with email/password |
| `GET /session` | Get current user |
| `DELETE /session` | Logout |
| `POST /session/token` | Generate API token |
| `GET /devices` | List devices |
| `GET /positions` | Current positions (or historical with `from`/`to`) |
| `GET /reports/route` | Route positions for a device in a time window |
| `GET /reports/trips` | Trip segmentation report |
| `GET /reports/summary` | Aggregate stats per device |
| `GET /reports/events` | Events in a time window |
| `WS /api/socket` | Realtime updates (devices, positions, events) |

Realtime WebSocket payload shape:
```json
{ "devices": [...], "positions": [...], "events": [...] }
```

## Key Traccar Types (from `lib/traccar.ts`)

```typescript
TraccarDevice    // id, name, uniqueId, status, category, attributes
TraccarPosition  // id, deviceId, latitude, longitude, speed, course, altitude, fixTime
TraccarEvent     // id, deviceId, type, eventTime, positionId, attributes
TraccarReportTrip // deviceId, startTime, endTime, distance, averageSpeed, maxSpeed, duration
TraccarReportSummary // deviceId, distance, averageSpeed, maxSpeed, movingTime, engineHours
```

## Utility Functions (from `lib/utils.ts`)

```typescript
toKph(knots)                          // knots → km/h
distanceInKm(meters)                  // meters → formatted "X.X km"
durationLabel(ms)                     // milliseconds → "Xh Ym"
formatTimestamp(isoString)            // → "Jan 1, 1:23p"
relativeTime(isoString)               // → "Just now" / "5m ago"
getBatteryLevel(position)             // extracts battery % from position attributes
normalizeStatus(device, position)     // infers online/offline from last update age
getDeviceIcon(category)               // category string → React icon component
createDefaultRouteWindow()            // returns {from, to} for the last 6 hours
haversineMeters(lat1, lon1, lat2, lon2) // great-circle distance in meters
```
