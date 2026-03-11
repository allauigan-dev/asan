# Full Traccar API Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all remaining Traccar 6.12.2 API endpoints into the Asan fleet dashboard, adding commands, geofences, notifications, drivers, maintenance, stops report, data export, device sharing, statistics, user management, group CRUD, and device accumulators.

**Architecture:** Extend the existing `lib/traccar.ts` API client with new endpoint functions and types. Add new settings tabs for management features (drivers, maintenance, geofences, notifications, users, groups). Add send-command dialog to live telemetry panel. Add stops report to replay view. Add export buttons and share functionality. Add admin statistics dashboard. All new features reuse existing UI components (Dialog, Table, ScrollArea, Card, Input, Select, Badge, Button) and follow the established pattern of settings-page tabs.

**Tech Stack:** React 19, TypeScript (strict), Vite 7, Tailwind CSS v4, shadcn/ui, MapLibre GL 5

**Existing patterns to follow:**
- API functions in `apps/web/src/lib/traccar.ts` using the `request<T>()` helper
- Types co-located in `traccar.ts`
- Settings tabs pattern in `settings-page.tsx` (NavItem sidebar + content panels)
- Device edit form pattern: load data in `useEffect`, local form state, save/delete buttons
- Table display pattern from `trip-table.tsx`
- Dialog pattern from `live-telemetry-panel.tsx` DeviceEditForm

---

## Chunk 1: API Client Extensions

### Task 1: Add all missing types to traccar.ts

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Add new type definitions**

Add after the existing `TraccarServer` type (around line 166):

```typescript
export type TraccarCommand = {
  id?: number
  deviceId?: number
  description?: string
  type: string
  textChannel?: boolean
  attributes?: Record<string, unknown>
}

export type TraccarCommandType = {
  type: string
}

export type TraccarGeofence = {
  id: number
  name: string
  description?: string
  area: string
  calendarId?: number
  attributes?: Record<string, unknown>
}

export type TraccarNotification = {
  id: number
  type: string
  description?: string | null
  always?: boolean
  commandId?: number
  notificators?: string
  calendarId?: number
  attributes?: Record<string, unknown>
}

export type TraccarNotificationType = {
  type: string
}

export type TraccarDriver = {
  id: number
  name: string
  uniqueId: string
  attributes?: Record<string, unknown>
}

export type TraccarMaintenance = {
  id: number
  name: string
  type: string
  start: number
  period: number
  attributes?: Record<string, unknown>
}

export type TraccarStatistics = {
  captureTime: string
  activeUsers: number
  activeDevices: number
  requests: number
  messagesReceived: number
  messagesStored: number
}

export type TraccarReportStop = {
  deviceId: number
  deviceName?: string
  duration: number
  startTime: string
  endTime: string
  address?: string
  lat: number
  lon: number
  spentFuel?: number
  engineHours?: number
}

export type TraccarReportGeofence = {
  deviceId: number
  deviceName?: string
  geofenceId: number
  startTime: string
  endTime: string
}

export type TraccarPermission = {
  userId?: number
  deviceId?: number
  groupId?: number
  geofenceId?: number
  notificationId?: number
  calendarId?: number
  attributeId?: number
  driverId?: number
  managedUserId?: number
  commandId?: number
  maintenanceId?: number
  orderId?: number
}

export type TraccarDeviceAccumulators = {
  deviceId: number
  totalDistance?: number
  hours?: number
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat: add all missing Traccar API types"
```

### Task 2: Add all missing API functions to traccar.ts

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Add command API functions**

Add before the export block at the bottom:

```typescript
// ── Commands ──────────────────────────────────────────────────────────────────

function getCommands(config: TraccarConfig, deviceId?: number) {
  const query = deviceId
    ? new URLSearchParams({ deviceId: String(deviceId) })
    : undefined
  return request<TraccarCommand[]>(config, "/commands", { query })
}

function getSavedCommandsForDevice(config: TraccarConfig, deviceId: number) {
  const query = new URLSearchParams({ deviceId: String(deviceId) })
  return request<TraccarCommand[]>(config, "/commands/send", { query })
}

function sendCommand(config: TraccarConfig, command: TraccarCommand) {
  return request<TraccarCommand>(config, "/commands/send", {
    method: "POST",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function getCommandTypes(config: TraccarConfig, deviceId?: number) {
  const query = deviceId
    ? new URLSearchParams({ deviceId: String(deviceId) })
    : undefined
  return request<TraccarCommandType[]>(config, "/commands/types", { query })
}

function createSavedCommand(config: TraccarConfig, command: TraccarCommand) {
  return request<TraccarCommand>(config, "/commands", {
    method: "POST",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function updateSavedCommand(
  config: TraccarConfig,
  id: number,
  command: TraccarCommand
) {
  return request<TraccarCommand>(config, `/commands/${id}`, {
    method: "PUT",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteSavedCommand(config: TraccarConfig, id: number) {
  return request<void>(config, `/commands/${id}`, { method: "DELETE" })
}
```

- [ ] **Step 2: Add geofence API functions**

```typescript
// ── Geofences ─────────────────────────────────────────────────────────────────

function getGeofences(config: TraccarConfig) {
  return request<TraccarGeofence[]>(config, "/geofences")
}

function createGeofence(config: TraccarConfig, geofence: Omit<TraccarGeofence, "id">) {
  return request<TraccarGeofence>(config, "/geofences", {
    method: "POST",
    body: JSON.stringify(geofence),
    headers: { "Content-Type": "application/json" },
  })
}

function updateGeofence(
  config: TraccarConfig,
  id: number,
  geofence: TraccarGeofence
) {
  return request<TraccarGeofence>(config, `/geofences/${id}`, {
    method: "PUT",
    body: JSON.stringify(geofence),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteGeofence(config: TraccarConfig, id: number) {
  return request<void>(config, `/geofences/${id}`, { method: "DELETE" })
}

function getGeofenceReport(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })
  return request<TraccarReportGeofence[]>(config, "/reports/geofences", {
    query,
  })
}
```

- [ ] **Step 3: Add notification API functions**

```typescript
// ── Notifications ─────────────────────────────────────────────────────────────

function getNotifications(config: TraccarConfig) {
  return request<TraccarNotification[]>(config, "/notifications")
}

function createNotification(
  config: TraccarConfig,
  notification: Omit<TraccarNotification, "id">
) {
  return request<TraccarNotification>(config, "/notifications", {
    method: "POST",
    body: JSON.stringify(notification),
    headers: { "Content-Type": "application/json" },
  })
}

function updateNotification(
  config: TraccarConfig,
  id: number,
  notification: TraccarNotification
) {
  return request<TraccarNotification>(config, `/notifications/${id}`, {
    method: "PUT",
    body: JSON.stringify(notification),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteNotification(config: TraccarConfig, id: number) {
  return request<void>(config, `/notifications/${id}`, { method: "DELETE" })
}

function getNotificationTypes(config: TraccarConfig) {
  return request<TraccarNotificationType[]>(config, "/notifications/types")
}

function testNotification(config: TraccarConfig) {
  return request<void>(config, "/notifications/test", { method: "POST" })
}
```

- [ ] **Step 4: Add driver API functions**

```typescript
// ── Drivers ───────────────────────────────────────────────────────────────────

function getDrivers(config: TraccarConfig) {
  return request<TraccarDriver[]>(config, "/drivers")
}

function createDriver(config: TraccarConfig, driver: Omit<TraccarDriver, "id">) {
  return request<TraccarDriver>(config, "/drivers", {
    method: "POST",
    body: JSON.stringify(driver),
    headers: { "Content-Type": "application/json" },
  })
}

function updateDriver(
  config: TraccarConfig,
  id: number,
  driver: TraccarDriver
) {
  return request<TraccarDriver>(config, `/drivers/${id}`, {
    method: "PUT",
    body: JSON.stringify(driver),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteDriver(config: TraccarConfig, id: number) {
  return request<void>(config, `/drivers/${id}`, { method: "DELETE" })
}
```

- [ ] **Step 5: Add maintenance API functions**

```typescript
// ── Maintenance ───────────────────────────────────────────────────────────────

function getMaintenance(config: TraccarConfig) {
  return request<TraccarMaintenance[]>(config, "/maintenance")
}

function createMaintenance(
  config: TraccarConfig,
  maintenance: Omit<TraccarMaintenance, "id">
) {
  return request<TraccarMaintenance>(config, "/maintenance", {
    method: "POST",
    body: JSON.stringify(maintenance),
    headers: { "Content-Type": "application/json" },
  })
}

function updateMaintenance(
  config: TraccarConfig,
  id: number,
  maintenance: TraccarMaintenance
) {
  return request<TraccarMaintenance>(config, `/maintenance/${id}`, {
    method: "PUT",
    body: JSON.stringify(maintenance),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteMaintenance(config: TraccarConfig, id: number) {
  return request<void>(config, `/maintenance/${id}`, { method: "DELETE" })
}
```

- [ ] **Step 6: Add remaining API functions (statistics, stops, permissions, users, groups CRUD, accumulators, export, share, health)**

```typescript
// ── Statistics ────────────────────────────────────────────────────────────────

function getStatistics(config: TraccarConfig, from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return request<TraccarStatistics[]>(config, "/statistics", { query })
}

// ── Stops Report ──────────────────────────────────────────────────────────────

function getStopsReport(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })
  return request<TraccarReportStop[]>(config, "/reports/stops", { query })
}

// ── Permissions ───────────────────────────────────────────────────────────────

function linkPermission(config: TraccarConfig, permission: TraccarPermission) {
  return request<void>(config, "/permissions", {
    method: "POST",
    body: JSON.stringify(permission),
    headers: { "Content-Type": "application/json" },
  })
}

function unlinkPermission(config: TraccarConfig, permission: TraccarPermission) {
  return request<void>(config, "/permissions", {
    method: "DELETE",
    body: JSON.stringify(permission),
    headers: { "Content-Type": "application/json" },
  })
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export type TraccarFullUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  readonly?: boolean
  administrator?: boolean
  disabled?: boolean
  expirationTime?: string | null
  deviceLimit?: number
  userLimit?: number
  deviceReadonly?: boolean
  limitCommands?: boolean
  password?: string
  attributes?: Record<string, unknown>
}

function getUsers(config: TraccarConfig) {
  return request<TraccarFullUser[]>(config, "/users")
}

function createUser(config: TraccarConfig, user: Omit<TraccarFullUser, "id">) {
  return request<TraccarFullUser>(config, "/users", {
    method: "POST",
    body: JSON.stringify(user),
    headers: { "Content-Type": "application/json" },
  })
}

function updateUser(
  config: TraccarConfig,
  id: number,
  user: TraccarFullUser
) {
  return request<TraccarFullUser>(config, `/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(user),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteUser(config: TraccarConfig, id: number) {
  return request<void>(config, `/users/${id}`, { method: "DELETE" })
}

// ── Groups CRUD ───────────────────────────────────────────────────────────────

function createGroup(config: TraccarConfig, group: Omit<TraccarGroup, "id">) {
  const result = request<TraccarGroup>(config, "/groups", {
    method: "POST",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/groups")
  return result
}

function updateGroup(
  config: TraccarConfig,
  id: number,
  group: TraccarGroup
) {
  const result = request<TraccarGroup>(config, `/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/groups")
  return result
}

function deleteGroup(config: TraccarConfig, id: number) {
  const result = request<void>(config, `/groups/${id}`, { method: "DELETE" })
  clearCache("/groups")
  return result
}

// ── Device Accumulators ───────────────────────────────────────────────────────

function updateDeviceAccumulators(
  config: TraccarConfig,
  id: number,
  accumulators: TraccarDeviceAccumulators
) {
  return request<void>(config, `/devices/${id}/accumulators`, {
    method: "PUT",
    body: JSON.stringify(accumulators),
    headers: { "Content-Type": "application/json" },
  })
}

// ── Device Sharing ────────────────────────────────────────────────────────────

function shareDevice(
  config: TraccarConfig,
  deviceId: number,
  expiration: string
) {
  return request<string>(config, "/devices/share", {
    method: "POST",
    body: new URLSearchParams({
      deviceId: String(deviceId),
      expiration,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}

// ── Export ─────────────────────────────────────────────────────────────────────

function getExportUrl(
  config: TraccarConfig,
  format: "csv" | "gpx" | "kml",
  deviceId: number,
  from: string,
  to: string
) {
  const base = normalizeServerUrl(config.serverUrl)
  const params = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })
  if (config.token) {
    params.set("token", config.token)
  }
  return `${base}/positions/${format}?${params}`
}

// ── Health ─────────────────────────────────────────────────────────────────────

function getHealth(config: TraccarConfig) {
  return request<string>(config, "/health")
}

// ── Events by ID ──────────────────────────────────────────────────────────────

function getEventById(config: TraccarConfig, id: number) {
  return request<TraccarEvent>(config, `/events/${id}`)
}
```

- [ ] **Step 7: Update export block**

Replace the existing export block with:

```typescript
export {
  createDevice,
  createDriver,
  createGeofence,
  createGroup,
  createMaintenance,
  createNotification,
  createSavedCommand,
  createUser,
  deleteDevice,
  deleteDriver,
  deleteGeofence,
  deleteGroup,
  deleteMaintenance,
  deleteNotification,
  deleteSavedCommand,
  deleteUser,
  geocode,
  getCalendars,
  getCommandTypes,
  getCommands,
  getDevices,
  getEventById,
  getEvents,
  getExportUrl,
  getGeofenceReport,
  getGeofences,
  getGroups,
  getHealth,
  getMaintenance,
  getNotificationTypes,
  getNotifications,
  getDrivers,
  getPositionHistory,
  getPositions,
  getRouteReport,
  getSavedCommandsForDevice,
  getServer,
  getServerCache,
  getServerTimezones,
  getSession,
  getStatistics,
  getStopsReport,
  getSummaryReport,
  getTripReport,
  getUsers,
  linkPermission,
  login,
  logout,
  normalizeServerUrl,
  normalizeWsUrl,
  parseRealtimePayload,
  rebootServer,
  revokeToken,
  sendCommand,
  shareDevice,
  testNotification,
  toRealtimeUrl,
  triggerServerGc,
  unlinkPermission,
  updateDevice,
  updateDeviceAccumulators,
  updateDriver,
  updateGeofence,
  updateGroup,
  updateMaintenance,
  updateNotification,
  updateSavedCommand,
  updateServer,
  updateUser,
  uploadDeviceImage,
}
```

- [ ] **Step 8: Verify typecheck passes**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat: add all remaining Traccar API functions (commands, geofences, notifications, drivers, maintenance, statistics, stops, users, groups CRUD, accumulators, export, share, health)"
```

---

## Chunk 2: New Icons

### Task 3: Add icons needed by new features

**Files:**
- Modify: `apps/web/src/components/icons.tsx`

- [ ] **Step 1: Add new icon components**

Add before the `export type { IconProps }` line at the bottom:

```typescript
export const Bell = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </IconBase>
)

export const Users = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
)

export const Shield = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </IconBase>
)

export const Wrench = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </IconBase>
)

export const Fence = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 6h18M3 18h18M6 6v12M18 6v12M10 6v12M14 6v12" />
  </IconBase>
)

export const Download = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </IconBase>
)

export const Share = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </IconBase>
)

export const BarChart = ({ className }: IconProps) => (
  <IconBase className={className}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </IconBase>
)

export const StopCircle = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
  </IconBase>
)

export const Copy = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </IconBase>
)

export const Trash = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </IconBase>
)

export const Send = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="m22 2-11 11" />
  </IconBase>
)

export const FolderOpen = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </IconBase>
)

export const Clock = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconBase>
)
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/icons.tsx
git commit -m "feat: add icons for new feature panels"
```

---

## Chunk 3: Send Command Dialog

### Task 4: Create send command dialog component

**Files:**
- Create: `apps/web/src/components/send-command-dialog.tsx`

- [ ] **Step 1: Create the send command dialog**

This dialog lets users send commands to devices. It fetches available command types for the device, lets the user pick one, and sends it.

```typescript
import { useEffect, useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Send } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  getCommandTypes,
  getSavedCommandsForDevice,
  sendCommand,
  type TraccarCommand,
  type TraccarCommandType,
} from "@/lib/traccar"

type SendCommandDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: number
  deviceName: string
}

export function SendCommandDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
}: SendCommandDialogProps) {
  const [commandTypes, setCommandTypes] = useState<TraccarCommandType[]>([])
  const [savedCommands, setSavedCommands] = useState<TraccarCommand[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [customAttributes, setCustomAttributes] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    status: "success" | "error"
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !deviceId) return
    setLoading(true)
    setResult(null)
    setSelectedType("")
    setCustomAttributes("")

    const config = toConfig(readStoredConfig())
    Promise.all([
      getCommandTypes(config, deviceId),
      getSavedCommandsForDevice(config, deviceId).catch(() => []),
    ])
      .then(([types, saved]) => {
        setCommandTypes(types)
        setSavedCommands(saved)
      })
      .catch(() => {
        setCommandTypes([])
        setSavedCommands([])
      })
      .finally(() => setLoading(false))
  }, [open, deviceId])

  async function handleSend() {
    if (!selectedType) return
    setSending(true)
    setResult(null)

    try {
      const config = toConfig(readStoredConfig())

      // Check if this is a saved command (has an id)
      const saved = savedCommands.find((c) => c.type === selectedType && c.id)
      const command: TraccarCommand = saved
        ? { ...saved, deviceId }
        : {
            deviceId,
            type: selectedType,
            attributes: customAttributes.trim()
              ? JSON.parse(customAttributes)
              : {},
          }

      await sendCommand(config, command)
      setResult({ status: "success", message: "Command sent successfully" })
    } catch (err) {
      setResult({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to send command",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Command</DialogTitle>
          <DialogDescription>
            Send a command to {deviceName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            Loading available commands…
          </div>
        ) : (
          <div className="space-y-4">
            {savedCommands.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Saved Commands
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedCommands.map((cmd) => (
                    <Button
                      key={cmd.id ?? cmd.type}
                      variant={
                        selectedType === cmd.type ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedType(cmd.type)}
                    >
                      {cmd.description || cmd.type}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Command Type
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select command type" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-48">
                    {commandTypes.map((ct) => (
                      <SelectItem key={ct.type} value={ct.type}>
                        {ct.type}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Attributes (JSON, optional)
              </label>
              <Input
                value={customAttributes}
                onChange={(e) => setCustomAttributes(e.target.value)}
                placeholder='{"data": "value"}'
                disabled={sending}
              />
            </div>

            {result && (
              <Badge
                variant={
                  result.status === "success" ? "default" : "destructive"
                }
              >
                {result.message}
              </Badge>
            )}

            <Button
              className="w-full"
              onClick={handleSend}
              disabled={!selectedType || sending}
            >
              <Send className="size-4" />
              {sending ? "Sending…" : "Send Command"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire send command dialog into live-telemetry-panel.tsx**

In `apps/web/src/components/live-telemetry-panel.tsx`:

1. Add import: `import { SendCommandDialog } from "@/components/send-command-dialog"`
2. Add state: `const [showCommandDialog, setShowCommandDialog] = useState(false)`
3. Replace the empty Terminal button handler (line 151) with: `onClick={() => setShowCommandDialog(true)}`
4. Add the dialog before the closing `</div>` of the outer wrapper (before the Edit Device Dialog):

```tsx
<SendCommandDialog
  open={showCommandDialog}
  onOpenChange={setShowCommandDialog}
  deviceId={selectedDevice.id}
  deviceName={selectedDevice.name}
/>
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/send-command-dialog.tsx apps/web/src/components/live-telemetry-panel.tsx
git commit -m "feat: add send command dialog with device-specific command types"
```

---

## Chunk 4: Stops Report in Replay View

### Task 5: Add stops report to use-fleet and replay panel

**Files:**
- Modify: `apps/web/src/hooks/use-fleet.ts`
- Modify: `apps/web/src/lib/traccar.ts` (already done — just importing)

- [ ] **Step 1: Add stops to FleetState**

In `use-fleet.ts`, add to the `FleetState` type:
```typescript
stops: TraccarReportStop[]
```

Add to `emptyFleet`:
```typescript
stops: [],
```

Add import of `getStopsReport` and `TraccarReportStop` from traccar.

In `loadReplayData`, add `getStopsReport` to the parallel fetch:
```typescript
const [trips, summary, events, stops] = await Promise.all([
  getTripReport(config, deviceId, from, to),
  getSummaryReport(config, deviceId, from, to),
  getEvents(config, deviceId, from, to),
  getStopsReport(config, deviceId, from, to),
])
```

Update the `setFleet` call to include:
```typescript
stops: ensureArray<TraccarReportStop>(stops),
```

Also add `stops: []` to the handleLogout reset.

- [ ] **Step 2: Create stops table component**

Create `apps/web/src/components/stop-table.tsx`:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { TraccarReportStop } from "@/lib/traccar"
import { durationLabel, ensureArray, formatTimestamp } from "@/lib/utils"

type StopTableProps = {
  stops: TraccarReportStop[]
}

export function StopTable({ stops }: StopTableProps) {
  const safeStops = ensureArray<TraccarReportStop>(stops)

  if (safeStops.length === 0) {
    return null
  }

  return (
    <div className="border-t border-border/40 px-4 py-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Stops</h3>
        <p className="text-xs text-muted-foreground">
          Where and how long the device was stationary.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeStops.map((stop) => (
            <TableRow key={`${stop.startTime}-${stop.endTime}`}>
              <TableCell>{formatTimestamp(stop.startTime)}</TableCell>
              <TableCell>
                {durationLabel(stop.duration ? stop.duration * 1000 : 0)}
              </TableCell>
              <TableCell className="max-w-[160px] truncate">
                {stop.address ?? `${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 3: Add StopTable to App.tsx replay sidebar**

In `App.tsx`, import `StopTable` and add it after `<TripTable>`:
```tsx
<StopTable stops={fleet.fleet.stops} />
```

- [ ] **Step 4: Add stop markers on replay map**

In `App.tsx`, add stop markers (similar to event markers but with StopCircle icon) in the replay view section. After the event markers block:

```tsx
{/* Replay stop markers */}
{view === "replay" &&
  fleet.fleet.stops.map((stop) => (
    <MapMarker
      key={`stop-${stop.startTime}`}
      longitude={stop.lon}
      latitude={stop.lat}
    >
      <MarkerContent>
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-orange-400/30 bg-orange-500 text-white shadow-lg">
          <StopCircle className="size-3" />
        </div>
        <MarkerLabel position="bottom">
          {durationLabel(stop.duration ? stop.duration * 1000 : 0)}
        </MarkerLabel>
      </MarkerContent>
      <MarkerPopup className="w-52 p-0">
        <div className="space-y-1 p-3">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Stop
          </span>
          <h3 className="leading-tight font-semibold text-foreground">
            {durationLabel(stop.duration ? stop.duration * 1000 : 0)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {stop.address ?? `${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTimestamp(stop.startTime)}
          </p>
        </div>
      </MarkerPopup>
    </MapMarker>
  ))}
```

Import `StopCircle` from icons. Import `durationLabel` from utils.

- [ ] **Step 5: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/use-fleet.ts apps/web/src/components/stop-table.tsx apps/web/src/App.tsx
git commit -m "feat: add stops report with table and map markers in replay view"
```

---

## Chunk 5: Export & Share

### Task 6: Add export buttons and share dialog

**Files:**
- Modify: `apps/web/src/components/live-telemetry-panel.tsx`
- Create: `apps/web/src/components/share-device-dialog.tsx`

- [ ] **Step 1: Create share device dialog**

Create `apps/web/src/components/share-device-dialog.tsx`:

```typescript
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { Copy, Share } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import { shareDevice } from "@/lib/traccar"

type ShareDeviceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: number
  deviceName: string
}

export function ShareDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
}: ShareDeviceDialogProps) {
  const [hours, setHours] = useState("24")
  const [shareToken, setShareToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    setLoading(true)
    setError("")
    setShareToken("")
    try {
      const config = toConfig(readStoredConfig())
      const expiration = new Date(
        Date.now() + Number(hours) * 60 * 60 * 1000
      ).toISOString()
      const token = await shareDevice(config, deviceId, expiration)
      setShareToken(token)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate share link"
      )
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!shareToken) return
    navigator.clipboard.writeText(shareToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Location</DialogTitle>
          <DialogDescription>
            Generate a temporary share link for {deviceName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Duration (hours)
            </label>
            <Input
              type="number"
              min="1"
              max="720"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleShare}
            disabled={loading}
          >
            <Share className="size-4" />
            {loading ? "Generating…" : "Generate Share Token"}
          </Button>

          {shareToken && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Share Token
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy token"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-muted-foreground">
                  Copied to clipboard
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Add export and share to live telemetry panel "More Options" menu**

In `live-telemetry-panel.tsx`:

1. Add imports for `ShareDeviceDialog`, `Download`, `Share` icons, and `getExportUrl` from traccar
2. Add states: `const [showShareDialog, setShowShareDialog] = useState(false)`
3. Replace the "More Options" MoreVertical button (line 169) with a dropdown or inline buttons for Export CSV/GPX/KML and Share:

Replace the MoreVertical button block with:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="size-7"
  onClick={() => setShowShareDialog(true)}
  title="Share Location"
>
  <Share className="size-4" />
</Button>
<Button
  variant="ghost"
  size="icon"
  className="size-7"
  onClick={() => {
    const config = toConfig(readStoredConfig())
    const now = new Date()
    const from = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()
    window.open(
      getExportUrl(config, "csv", selectedDevice.id, from, to),
      "_blank"
    )
  }}
  title="Export CSV"
>
  <Download className="size-4" />
</Button>
```

4. Add the ShareDeviceDialog before the closing wrapper div:
```tsx
<ShareDeviceDialog
  open={showShareDialog}
  onOpenChange={setShowShareDialog}
  deviceId={selectedDevice.id}
  deviceName={selectedDevice.name}
/>
```

- [ ] **Step 3: Add export buttons to replay panel**

In `replay-panel.tsx`, add export buttons (CSV, GPX, KML) below the "Update route replay" button. These use the current routeWindow and selected device.

Add a new prop `deviceId: number` to `ReplayPanelProps` and pass from App.tsx.

Add after the replay button:
```tsx
<div className="flex gap-2">
  {(["csv", "gpx", "kml"] as const).map((format) => (
    <Button
      key={format}
      variant="outline"
      size="sm"
      className="flex-1 text-xs uppercase"
      disabled={!isConnected || !deviceId}
      onClick={() => {
        const config = toConfig(readStoredConfig())
        window.open(
          getExportUrl(
            config,
            format,
            deviceId,
            toIsoValue(routeWindow.from),
            toIsoValue(routeWindow.to)
          ),
          "_blank"
        )
      }}
    >
      <Download className="size-3" />
      {format}
    </Button>
  ))}
</div>
```

Import `Download` from icons, `getExportUrl` from traccar, `toIsoValue` from utils, and `toConfig`/`readStoredConfig` from config.

- [ ] **Step 4: Pass deviceId to ReplayPanel in App.tsx**

Add `deviceId={fleet.selectedDeviceId}` to the `<ReplayPanel>` in App.tsx.

- [ ] **Step 5: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/share-device-dialog.tsx apps/web/src/components/live-telemetry-panel.tsx apps/web/src/components/replay-panel.tsx apps/web/src/App.tsx
git commit -m "feat: add data export (CSV/GPX/KML) and device location sharing"
```

---

## Chunk 6: Settings Page Extensions

### Task 7: Extend settings page with new management tabs

**Files:**
- Modify: `apps/web/src/components/settings-page.tsx`

This is the largest task. The settings page already has a tab pattern with `connection | server | devices`. We need to add: `geofences | drivers | maintenance | notifications | users | groups | statistics`.

- [ ] **Step 1: Update SettingsTab type and add new NavItems**

Change the `SettingsTab` type to:
```typescript
type SettingsTab =
  | "connection"
  | "server"
  | "devices"
  | "geofences"
  | "drivers"
  | "maintenance"
  | "notifications"
  | "users"
  | "groups"
  | "statistics"
```

Add imports for new icons: `Bell, Users, Wrench, Fence, BarChart, FolderOpen, Person` from icons.

Add imports for new API functions and types from traccar.

Add new NavItems in the sidebar nav:
```tsx
<NavItem
  icon={<Fence className="size-4" />}
  label="Geofences"
  active={activeTab === "geofences"}
  onClick={() => setActiveTab("geofences")}
  disabled={!isConnected}
/>
<NavItem
  icon={<Person className="size-4" />}
  label="Drivers"
  active={activeTab === "drivers"}
  onClick={() => setActiveTab("drivers")}
  disabled={!isConnected}
/>
<NavItem
  icon={<Wrench className="size-4" />}
  label="Maintenance"
  active={activeTab === "maintenance"}
  onClick={() => setActiveTab("maintenance")}
  disabled={!isConnected}
/>
<NavItem
  icon={<Bell className="size-4" />}
  label="Notifications"
  active={activeTab === "notifications"}
  onClick={() => setActiveTab("notifications")}
  disabled={!isConnected}
/>
<NavItem
  icon={<Users className="size-4" />}
  label="Users"
  active={activeTab === "users"}
  onClick={() => setActiveTab("users")}
  disabled={!isConnected}
/>
<NavItem
  icon={<FolderOpen className="size-4" />}
  label="Groups"
  active={activeTab === "groups"}
  onClick={() => setActiveTab("groups")}
  disabled={!isConnected}
/>
<NavItem
  icon={<BarChart className="size-4" />}
  label="Statistics"
  active={activeTab === "statistics"}
  onClick={() => setActiveTab("statistics")}
  disabled={!isConnected}
/>
```

- [ ] **Step 2: Commit NavItem changes**

```bash
git add apps/web/src/components/settings-page.tsx
git commit -m "feat: add settings navigation tabs for all management features"
```

### Task 8: Create management panel components

Each panel follows the same pattern: list items, add/edit/delete via dialogs. To keep the settings-page.tsx from growing too large, create separate component files for each panel.

**Files:**
- Create: `apps/web/src/components/settings/geofence-panel.tsx`
- Create: `apps/web/src/components/settings/driver-panel.tsx`
- Create: `apps/web/src/components/settings/maintenance-panel.tsx`
- Create: `apps/web/src/components/settings/notification-panel.tsx`
- Create: `apps/web/src/components/settings/user-panel.tsx`
- Create: `apps/web/src/components/settings/group-panel.tsx`
- Create: `apps/web/src/components/settings/statistics-panel.tsx`

All panels share this pattern:

```
1. useState for list data, loading, editing item
2. useEffect to fetch on mount
3. List view with Add button
4. Dialog for create/edit
5. Delete with confirmation
```

- [ ] **Step 1: Create GeofencePanel**

Create `apps/web/src/components/settings/geofence-panel.tsx`. The geofence panel lists all geofences, allows creating/editing/deleting. The `area` field uses WKT format (e.g., `CIRCLE (lat lon, radius)` or `POLYGON ((lon lat, ...))`) as a text input.

```typescript
import { useEffect, useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Fence, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createGeofence,
  deleteGeofence,
  getGeofences,
  updateGeofence,
  type TraccarGeofence,
} from "@/lib/traccar"

export function GeofencePanel() {
  const [geofences, setGeofences] = useState<TraccarGeofence[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarGeofence | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getGeofences(config)
      .then(setGeofences)
      .catch(() => setGeofences([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function handleEdit(item: TraccarGeofence) {
    setEditItem(item)
    setShowDialog(true)
  }

  function handleAdd() {
    setEditItem(null)
    setShowDialog(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this geofence?")) return
    const config = toConfig(readStoredConfig())
    await deleteGeofence(config, id)
    load()
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Geofences</h2>
            <p className="text-xs text-muted-foreground">
              Manage geographic zones for enter/exit alerts
            </p>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="size-4" />
            Add Geofence
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : geofences.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No geofences configured
          </p>
        ) : (
          <div className="space-y-2">
            {geofences.map((gf) => (
              <Card key={gf.id} className="cursor-pointer" onClick={() => handleEdit(gf)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Fence className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{gf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {gf.area.substring(0, 60)}
                        {gf.area.length > 60 ? "…" : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(gf.id)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <GeofenceFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function GeofenceFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarGeofence | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [area, setArea] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setDescription(item?.description ?? "")
      setArea(item?.area ?? "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !area) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      if (item) {
        await updateGeofence(config, item.id, {
          ...item,
          name,
          description,
          area,
        })
      } else {
        await createGeofence(config, { name, description, area })
      }
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Geofence" : "Add Geofence"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update the geofence properties."
              : "Create a new geofence zone."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="space-y-1">
            <Input
              placeholder="CIRCLE (lat lon, radius) or POLYGON ((lon lat, …))"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              WKT format: CIRCLE (lat lon, radiusMeters) or POLYGON ((lon1 lat1,
              lon2 lat2, ...))
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !area || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create DriverPanel**

Create `apps/web/src/components/settings/driver-panel.tsx` — same pattern as GeofencePanel but for drivers (name, uniqueId fields).

```typescript
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Person, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createDriver,
  deleteDriver,
  getDrivers,
  updateDriver,
  type TraccarDriver,
} from "@/lib/traccar"

export function DriverPanel() {
  const [drivers, setDrivers] = useState<TraccarDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarDriver | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getDrivers(config)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Drivers</h2>
            <p className="text-xs text-muted-foreground">
              Manage drivers and assign them to devices
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null)
              setShowDialog(true)
            }}
          >
            <Plus className="size-4" />
            Add Driver
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : drivers.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No drivers configured
          </p>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(driver)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Person className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.uniqueId}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete driver "${driver.name}"?`)) return
                      const config = toConfig(readStoredConfig())
                      deleteDriver(config, driver.id).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DriverFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function DriverFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarDriver | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [uniqueId, setUniqueId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setUniqueId(item?.uniqueId ?? "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !uniqueId) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      if (item) {
        await updateDriver(config, item.id, { ...item, name, uniqueId })
      } else {
        await createDriver(config, { name, uniqueId })
      }
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Driver" : "Add Driver"}</DialogTitle>
          <DialogDescription>
            {item ? "Update driver details." : "Register a new driver."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Unique ID (iButton, RFID, etc.)"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
            disabled={!!item}
          />
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !uniqueId || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create MaintenancePanel, NotificationPanel, UserPanel, GroupPanel, StatisticsPanel**

These follow the exact same pattern. Create each file in `apps/web/src/components/settings/`:

**maintenance-panel.tsx** — fields: name, type (totalDistance/hours), start, period
**notification-panel.tsx** — fields: type (from getNotificationTypes), notificators (web,mail,sms), always checkbox. Include "Test Notification" button.
**user-panel.tsx** — fields: name, email, password, administrator checkbox, disabled checkbox, deviceLimit, expirationTime
**group-panel.tsx** — fields: name, groupId (parent group select)
**statistics-panel.tsx** — date range picker, displays statistics table (captureTime, activeUsers, activeDevices, requests, messages)

Each panel should be self-contained with its own load/save/delete logic.

- [ ] **Step 4: Wire all panels into settings-page.tsx content area**

In the content area of settings-page.tsx (the part that switches based on `activeTab`), add cases for each new tab:

```tsx
{activeTab === "geofences" && <GeofencePanel />}
{activeTab === "drivers" && <DriverPanel />}
{activeTab === "maintenance" && <MaintenancePanel />}
{activeTab === "notifications" && <NotificationPanel />}
{activeTab === "users" && <UserPanel />}
{activeTab === "groups" && <GroupPanel />}
{activeTab === "statistics" && <StatisticsPanel />}
```

Import all panel components.

- [ ] **Step 5: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/settings/ apps/web/src/components/settings-page.tsx
git commit -m "feat: add geofence, driver, maintenance, notification, user, group management and statistics panels"
```

---

## Chunk 7: Device Accumulators

### Task 9: Add device accumulators reset to device edit form

**Files:**
- Modify: `apps/web/src/components/live-telemetry-panel.tsx`

- [ ] **Step 1: Add accumulator fields to DeviceEditForm**

In the `DeviceEditForm` component in `live-telemetry-panel.tsx`, add fields for total distance and engine hours with a "Reset Accumulators" button.

After the "Disabled" checkbox section, add:

```tsx
<div className="space-y-4 border-t border-border/30 pt-4">
  <p className="text-xs font-medium text-muted-foreground">
    Device Accumulators
  </p>
  <div className="flex gap-3">
    <div className="flex-1 space-y-1">
      <label className="text-xs font-medium text-foreground">
        Total Distance (km)
        <Input
          type="number"
          value={accumulatorDistance}
          onChange={(e) => setAccumulatorDistance(e.target.value)}
          placeholder="0"
          className="mt-1.5"
        />
      </label>
    </div>
    <div className="flex-1 space-y-1">
      <label className="text-xs font-medium text-foreground">
        Engine Hours
        <Input
          type="number"
          value={accumulatorHours}
          onChange={(e) => setAccumulatorHours(e.target.value)}
          placeholder="0"
          className="mt-1.5"
        />
      </label>
    </div>
  </div>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleResetAccumulators}
    disabled={saving || deleting}
  >
    Update Accumulators
  </Button>
</div>
```

Add state variables and handler:
```typescript
const [accumulatorDistance, setAccumulatorDistance] = useState("")
const [accumulatorHours, setAccumulatorHours] = useState("")

async function handleResetAccumulators() {
  const config = toConfig(readStoredConfig())
  await updateDeviceAccumulators(config, form.id, {
    deviceId: form.id,
    totalDistance: accumulatorDistance ? Number(accumulatorDistance) * 1000 : undefined,
    hours: accumulatorHours ? Number(accumulatorHours) : undefined,
  })
}
```

Import `updateDeviceAccumulators` from traccar.

- [ ] **Step 2: Verify typecheck**

Run: `cd /home/devall/asan && pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/live-telemetry-panel.tsx
git commit -m "feat: add device accumulator management to device edit form"
```

---

## Chunk 8: Final Integration & Cleanup

### Task 10: Geofence display on map

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/hooks/use-fleet.ts`

- [ ] **Step 1: Fetch geofences on connect**

In `use-fleet.ts`, add geofences to FleetState:
```typescript
geofences: TraccarGeofence[]
```

In `refreshLiveData`, also fetch geofences:
```typescript
const [devicesResponse, positionsResponse, geofencesResponse] =
  await Promise.all([
    getDevices(config),
    getPositions(config),
    getGeofences(config).catch(() => []),
  ])
```

Store them in fleet state. Import `getGeofences` and `TraccarGeofence` from traccar.

Expose `fleet.geofences` (via `fleet.fleet.geofences`).

- [ ] **Step 2: Render geofences on map**

In App.tsx, parse geofence WKT `area` strings and render them. For CIRCLE geofences, display a circle marker. For POLYGON, display polygon shapes. This is a simplification — just show circle markers at the center:

```tsx
{/* Geofence markers */}
{fleet.fleet.geofences.map((gf) => {
  const center = parseGeofenceCenter(gf.area)
  if (!center) return null
  return (
    <MapMarker key={gf.id} longitude={center[0]} latitude={center[1]}>
      <MarkerContent>
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-violet-400/30 bg-violet-500/80 text-white">
          <Fence className="size-3" />
        </div>
        <MarkerLabel position="bottom">{gf.name}</MarkerLabel>
      </MarkerContent>
    </MapMarker>
  )
})}
```

Add a helper function in App.tsx:
```typescript
function parseGeofenceCenter(area: string): [number, number] | null {
  // CIRCLE (lat lon, radius)
  const circleMatch = area.match(
    /CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,/i
  )
  if (circleMatch) {
    return [Number(circleMatch[2]), Number(circleMatch[1])]
  }
  // POLYGON ((lon lat, ...))
  const polyMatch = area.match(/POLYGON\s*\(\(([^)]+)\)/i)
  if (polyMatch) {
    const points = polyMatch[1].split(",").map((p) => {
      const [lon, lat] = p.trim().split(/\s+/).map(Number)
      return [lon, lat] as [number, number]
    })
    if (points.length > 0) {
      const avgLon = points.reduce((s, p) => s + p[0], 0) / points.length
      const avgLat = points.reduce((s, p) => s + p[1], 0) / points.length
      return [avgLon, avgLat]
    }
  }
  return null
}
```

Import `Fence` from icons.

- [ ] **Step 3: Verify typecheck and build**

Run: `cd /home/devall/asan && pnpm typecheck && pnpm build`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-fleet.ts apps/web/src/App.tsx
git commit -m "feat: display geofences on map and fetch on connect"
```

### Task 11: Final lint and format

- [ ] **Step 1: Run format and lint**

```bash
cd /home/devall/asan && pnpm format && pnpm lint
```

- [ ] **Step 2: Fix any issues**

- [ ] **Step 3: Final build verification**

```bash
cd /home/devall/asan && pnpm build
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint and format fixes"
```
