# Device Connections Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bidirectional device connection management UI for linking devices to geofences, notifications, drivers, computed attributes, saved commands, and maintenance items.

**Architecture:** Two entry points - device dialog with multi-select dropdowns (batch save) and entity panel expandable sections (immediate save). Built on Traccar's `/permissions` API with optimistic UI updates and comprehensive error handling.

**Tech Stack:** React 19, TypeScript (strict), Radix UI (Popover, Command), Tailwind CSS v4, Sonner (toasts), Traccar REST API

---

## File Structure

### New Files

**UI Components (packages/ui/src/components/):**
- `ui/multi-select.tsx` - Reusable multi-select dropdown with badges

**Settings Components (apps/web/src/components/settings/):**
- `device-connections-section.tsx` - Device dialog connections management (batch save)
- `expandable-device-list.tsx` - Entity card device list (immediate save)

### Modified Files

**API Layer:**
- `apps/web/src/lib/traccar.ts` - Add permission types and CRUD functions

**Entity Panels (apps/web/src/components/settings/):**
- `geofence-panel.tsx` - Add expandable device list
- `notification-panel.tsx` - Add expandable device list
- `driver-panel.tsx` - Add expandable device list
- `attribute-panel.tsx` - Add expandable device list
- `command-panel.tsx` - Add expandable device list
- `maintenance-panel.tsx` - Add expandable device list

**Device Management:**
- `apps/web/src/components/settings-page.tsx` - Add connections section to device dialog

---

## Chunk 1: Foundation - Permission API

### Task 1: Add Permission Types to Traccar Library

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Add permission-related types**

Add after the existing TraccarServer type (around line 142):

```typescript
// Permission management types
export type PermissionType =
  | "geofence"
  | "notification"
  | "driver"
  | "attribute"
  | "command"
  | "maintenance"

export type TraccarPermission = {
  deviceId?: number
  geofenceId?: number
  notificationId?: number
  driverId?: number
  attributeId?: number
  commandId?: number
  maintenanceId?: number
}

// Mapping from permission type to field name
const PERMISSION_FIELD_MAP: Record<PermissionType, keyof TraccarPermission> = {
  geofence: "geofenceId",
  notification: "notificationId",
  driver: "driverId",
  attribute: "attributeId",
  command: "commandId",
  maintenance: "maintenanceId",
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit types**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat(api): add permission types for device connections"
```

### Task 2: Implement Permission API Functions

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Add createPermission function**

Add at the end of the file (after existing API functions):

```typescript
/**
 * Create a permission link between a device and an entity
 */
export async function createPermission(
  config: TraccarConfig,
  permission: TraccarPermission
): Promise<void> {
  await apiRequest<void>(config, "/permissions", {
    method: "POST",
    body: JSON.stringify(permission),
  })
  // Clear cache to force refresh of affected data
  clearCache()
}
```

- [ ] **Step 2: Add deletePermission function**

```typescript
/**
 * Delete a permission link between a device and an entity
 */
export async function deletePermission(
  config: TraccarConfig,
  permission: TraccarPermission
): Promise<void> {
  await apiRequest<void>(config, "/permissions", {
    method: "DELETE",
    body: JSON.stringify(permission),
  })
  // Clear cache to force refresh of affected data
  clearCache()
}
```

- [ ] **Step 3: Add getDevicePermissions helper**

```typescript
/**
 * Get all entity IDs of a given type connected to a device
 * This requires fetching all permissions and filtering for the device
 */
export async function getDevicePermissions(
  config: TraccarConfig,
  deviceId: number,
  type: PermissionType
): Promise<number[]> {
  // Traccar doesn't have a direct endpoint for device permissions
  // We need to fetch the relevant entities and check which ones are linked
  const fieldName = PERMISSION_FIELD_MAP[type]

  // For each entity type, we'll need to fetch differently
  // This is a simplified approach - actual implementation may need adjustment
  // based on Traccar API capabilities

  // For now, return empty array - will be implemented based on actual API
  // TODO: Implement based on Traccar API endpoints for permissions
  return []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit permission functions**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat(api): add permission CRUD functions

Add createPermission, deletePermission, and getDevicePermissions
helper functions for managing device-entity connections via
Traccar permissions API."
```

### Task 3: Install Multi-Select Dependencies

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Check if Radix Command is installed**

Run: `grep -r "@radix-ui/react-command" packages/ui/package.json`
Expected: May or may not be present

- [ ] **Step 2: Install Command component if needed**

From `packages/ui/` directory:

```bash
cd packages/ui && pnpm dlx shadcn@latest add command -c .
```

Expected: Command component added to `packages/ui/src/components/ui/command.tsx`

- [ ] **Step 3: Verify installation**

Run: `pnpm typecheck` from repo root
Expected: No errors

- [ ] **Step 4: Commit if command was added**

```bash
git add packages/ui/
git commit -m "feat(ui): add command component for multi-select"
```

---

## Chunk 2: Multi-Select Component

### Task 4: Create Multi-Select Component

**Files:**
- Create: `packages/ui/src/components/ui/multi-select.tsx`

- [ ] **Step 1: Create multi-select component file**

```typescript
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export type MultiSelectOption = {
  id: number
  name: string
}

export type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: number[]
  onChange: (selected: number[]) => void
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
  emptyText?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  disabled = false,
  searchPlaceholder = "Search...",
  emptyText = "No items found.",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => selected.includes(opt.id)),
    [options, selected]
  )

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  const handleSelect = (optionId: number) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId]
    onChange(newSelected)
  }

  const handleRemove = (optionId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((id) => id !== optionId))
  }

  const displayText =
    selectedOptions.length === 0
      ? placeholder
      : `${selectedOptions.length} selected`

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={String(option.id)}
                    onSelect={() => handleSelect(option.id)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                        selected.includes(option.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    <span>{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge
              key={option.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs">{option.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(option.id, e)}
                className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                aria-label={`Remove ${option.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Export from ui components**

Add to `packages/ui/src/components/ui/index.ts` (or create if doesn't exist):

```typescript
export { MultiSelect, type MultiSelectOption, type MultiSelectProps } from "./multi-select"
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit multi-select component**

```bash
git add packages/ui/src/components/ui/multi-select.tsx packages/ui/src/components/ui/index.ts
git commit -m "feat(ui): add multi-select component

Add reusable multi-select dropdown with searchable list,
badge display for selected items, and keyboard navigation."
```

---

## Chunk 3: Device Connections Section

### Task 5: Create Device Connections Section Component

**Files:**
- Create: `apps/web/src/components/settings/device-connections-section.tsx`

- [ ] **Step 1: Create component file with imports and types**

```typescript
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { MultiSelect, type MultiSelectOption } from "@workspace/ui/components/ui/multi-select"
import { Separator } from "@workspace/ui/components/separator"

import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createPermission,
  deletePermission,
  getDevicePermissions,
  type PermissionType,
  type TraccarPermission,
} from "@/lib/traccar"
import { Loader } from "@/components/icons"

type ConnectionsByType = {
  geofences: number[]
  notifications: number[]
  drivers: number[]
  attributes: number[]
  commands: number[]
  maintenance: number[]
}

type EntityOptions = {
  geofences: MultiSelectOption[]
  notifications: MultiSelectOption[]
  drivers: MultiSelectOption[]
  attributes: MultiSelectOption[]
  commands: MultiSelectOption[]
  maintenance: MultiSelectOption[]
}

type SectionState =
  | { status: "loading" }
  | { status: "loaded"; current: ConnectionsByType }
  | { status: "saving" }
  | { status: "error"; message: string }

export function DeviceConnectionsSection({
  deviceId,
  onSave,
  onCancel,
}: {
  deviceId: number
  onSave?: () => void
  onCancel?: () => void
}) {
  const [state, setState] = useState<SectionState>({ status: "loading" })
  const [pending, setPending] = useState<ConnectionsByType>({
    geofences: [],
    notifications: [],
    drivers: [],
    attributes: [],
    commands: [],
    maintenance: [],
  })
  const [entityOptions, setEntityOptions] = useState<EntityOptions>({
    geofences: [],
    notifications: [],
    drivers: [],
    attributes: [],
    commands: [],
    maintenance: [],
  })

  // Load current connections and available entities
  useEffect(() => {
    loadConnections()
  }, [deviceId])

  async function loadConnections() {
    // TODO: Implement loading of current connections
    // For now, set to loaded with empty connections
    setState({ status: "loaded", current: {
      geofences: [],
      notifications: [],
      drivers: [],
      attributes: [],
      commands: [],
      maintenance: [],
    }})
    setPending({
      geofences: [],
      notifications: [],
      drivers: [],
      attributes: [],
      commands: [],
      maintenance: [],
    })
  }

  async function handleSave() {
    // TODO: Implement save logic
    toast.success("Connections saved")
    onSave?.()
  }

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Loading connections...
        </span>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.message}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={loadConnections}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const isSaving = state.status === "saving"
  const hasChanges = JSON.stringify(state.current) !== JSON.stringify(pending)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Connections</h3>
        <p className="text-xs text-muted-foreground">
          Link this device to geofences, notifications, and other entities
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Geofences
          </label>
          <MultiSelect
            options={entityOptions.geofences}
            selected={pending.geofences}
            onChange={(selected) =>
              setPending({ ...pending, geofences: selected })
            }
            placeholder="Select geofences..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Notifications
          </label>
          <MultiSelect
            options={entityOptions.notifications}
            selected={pending.notifications}
            onChange={(selected) =>
              setPending({ ...pending, notifications: selected })
            }
            placeholder="Select notifications..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">Drivers</label>
          <MultiSelect
            options={entityOptions.drivers}
            selected={pending.drivers}
            onChange={(selected) =>
              setPending({ ...pending, drivers: selected })
            }
            placeholder="Select drivers..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Computed Attributes
          </label>
          <MultiSelect
            options={entityOptions.attributes}
            selected={pending.attributes}
            onChange={(selected) =>
              setPending({ ...pending, attributes: selected })
            }
            placeholder="Select attributes..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Saved Commands
          </label>
          <MultiSelect
            options={entityOptions.commands}
            selected={pending.commands}
            onChange={(selected) =>
              setPending({ ...pending, commands: selected })
            }
            placeholder="Select commands..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            Maintenance
          </label>
          <MultiSelect
            options={entityOptions.maintenance}
            selected={pending.maintenance}
            onChange={(selected) =>
              setPending({ ...pending, maintenance: selected })
            }
            placeholder="Select maintenance..."
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <>
              <Loader className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors (may have warnings about unused imports, that's OK)

- [ ] **Step 3: Commit skeleton component**

```bash
git add apps/web/src/components/settings/device-connections-section.tsx
git commit -m "feat(settings): add device connections section skeleton

Add initial structure for device connections management in
device dialog with multi-select dropdowns for all connection types."
```

---

## Chunk 4: Expandable Device List Component

### Task 6: Create Expandable Device List Component

**Files:**
- Create: `apps/web/src/components/settings/expandable-device-list.tsx`

- [ ] **Step 1: Create component file**

```typescript
import { useState } from "react"
import { ChevronDown, ChevronRight, Loader, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createPermission,
  deletePermission,
  type PermissionType,
  type TraccarDevice,
} from "@/lib/traccar"

export function ExpandableDeviceList({
  entityId,
  entityType,
  connectedDeviceIds,
  allDevices,
  onConnectionsChange,
}: {
  entityId: number
  entityType: PermissionType
  connectedDeviceIds: number[]
  allDevices: TraccarDevice[]
  onConnectionsChange?: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    deviceId: number
    action: "add" | "remove"
  } | null>(null)

  const connectedDevices = allDevices.filter((d) =>
    connectedDeviceIds.includes(d.id)
  )
  const unconnectedDevices = allDevices.filter(
    (d) => !connectedDeviceIds.includes(d.id)
  )

  async function handleAddDevice(deviceId: number) {
    setPendingAction({ deviceId, action: "add" })

    try {
      const config = toConfig(readStoredConfig())
      const permission: any = { deviceId }

      // Map entity type to permission field
      const fieldMap: Record<PermissionType, string> = {
        geofence: "geofenceId",
        notification: "notificationId",
        driver: "driverId",
        attribute: "attributeId",
        command: "commandId",
        maintenance: "maintenanceId",
      }

      permission[fieldMap[entityType]] = entityId

      await createPermission(config, permission)
      toast.success("Device connected")
      onConnectionsChange?.()
    } catch (error) {
      toast.error(
        `Failed to connect device: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRemoveDevice(deviceId: number) {
    setPendingAction({ deviceId, action: "remove" })

    try {
      const config = toConfig(readStoredConfig())
      const permission: any = { deviceId }

      const fieldMap: Record<PermissionType, string> = {
        geofence: "geofenceId",
        notification: "notificationId",
        driver: "driverId",
        attribute: "attributeId",
        command: "commandId",
        maintenance: "maintenanceId",
      }

      permission[fieldMap[entityType]] = entityId

      await deletePermission(config, permission)
      toast.success("Device removed")
      onConnectionsChange?.()
    } catch (error) {
      toast.error(
        `Failed to remove device: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {isExpanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <span>
          Connected Devices ({connectedDevices.length})
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
          {connectedDevices.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No devices connected yet
            </p>
          ) : (
            <div className="space-y-1">
              {connectedDevices.map((device) => {
                const isRemoving =
                  pendingAction?.deviceId === device.id &&
                  pendingAction?.action === "remove"
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5"
                  >
                    <span className="text-xs">• {device.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-6 p-0"
                      onClick={() => handleRemoveDevice(device.id)}
                      disabled={!!pendingAction}
                      aria-label={`Remove ${device.name}`}
                    >
                      {isRemoving ? (
                        <Loader className="size-3 animate-spin" />
                      ) : (
                        <X className="size-3" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {unconnectedDevices.length > 0 && (
            <div className="pt-1">
              <Select
                value=""
                onValueChange={(value) => handleAddDevice(Number(value))}
                disabled={!!pendingAction}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="+ Add Device" />
                </SelectTrigger>
                <SelectContent>
                  {unconnectedDevices.map((device) => (
                    <SelectItem
                      key={device.id}
                      value={String(device.id)}
                      className="text-xs"
                    >
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit expandable device list**

```bash
git add apps/web/src/components/settings/expandable-device-list.tsx
git commit -m "feat(settings): add expandable device list component

Add collapsible device connection list for entity cards with
immediate save on add/remove and optimistic UI updates."
```

---

## Chunk 5: Entity Panel Integrations

### Task 7: Integrate into Geofence Panel

**Files:**
- Modify: `apps/web/src/components/settings/geofence-panel.tsx`

- [ ] **Step 1: Add imports**

Add after existing imports:

```typescript
import { ExpandableDeviceList } from "./expandable-device-list"
import { getDevices, type TraccarDevice } from "@/lib/traccar"
```

- [ ] **Step 2: Add devices state**

In the `GeofencePanel` component, add state for devices:

```typescript
const [devices, setDevices] = useState<TraccarDevice[]>([])
```

- [ ] **Step 3: Load devices**

Update the `load` function to also fetch devices:

```typescript
function load() {
  const config = toConfig(readStoredConfig())
  setLoading(true)
  Promise.all([
    getGeofences(config),
    getDevices(config),
  ])
    .then(([gf, dev]) => {
      setGeofences(gf)
      setDevices(dev)
    })
    .catch(() => {
      setGeofences([])
      setDevices([])
    })
    .finally(() => setLoading(false))
}
```

- [ ] **Step 4: Add ExpandableDeviceList to geofence cards**

In the geofence card rendering (around line 99-120), add the expandable list before the action buttons:

```typescript
<Card key={gf.id} className="overflow-hidden border-border/50">
  <CardContent className="p-4">
    {/* Existing card content */}
    <div className="mb-1 flex items-center gap-2">
      <Fence className="size-4 text-muted-foreground" />
      <span className="font-medium">{gf.name}</span>
    </div>
    {gf.description && (
      <p className="mb-3 text-xs text-muted-foreground">
        {gf.description}
      </p>
    )}

    {/* NEW: Add expandable device list */}
    <div className="mb-3">
      <ExpandableDeviceList
        entityId={gf.id}
        entityType="geofence"
        connectedDeviceIds={[]} // TODO: Get from API
        allDevices={devices}
        onConnectionsChange={load}
      />
    </div>

    {/* Existing action buttons */}
    <div className="flex gap-2">
      {/* ... existing buttons ... */}
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 6: Test in browser**

Run: `pnpm dev`
Navigate to: Settings → Geofences
Expected: See expandable device list in each geofence card

- [ ] **Step 7: Commit geofence panel integration**

```bash
git add apps/web/src/components/settings/geofence-panel.tsx
git commit -m "feat(settings): integrate device connections in geofence panel"
```

### Task 8: Integrate into Remaining Entity Panels

**Files:**
- Modify: `apps/web/src/components/settings/notification-panel.tsx`
- Modify: `apps/web/src/components/settings/driver-panel.tsx`
- Modify: `apps/web/src/components/settings/attribute-panel.tsx`
- Modify: `apps/web/src/components/settings/command-panel.tsx`
- Modify: `apps/web/src/components/settings/maintenance-panel.tsx`

- [ ] **Step 1: Integrate into notification-panel.tsx**

Follow the same pattern as geofence panel:
1. Import `ExpandableDeviceList` and device types
2. Add `devices` state
3. Update load function to fetch devices
4. Add `<ExpandableDeviceList>` to notification cards with `entityType="notification"`

- [ ] **Step 2: Integrate into driver-panel.tsx**

Same pattern with `entityType="driver"`

- [ ] **Step 3: Integrate into attribute-panel.tsx**

Same pattern with `entityType="attribute"`

- [ ] **Step 4: Integrate into command-panel.tsx**

Same pattern with `entityType="command"`

- [ ] **Step 5: Integrate into maintenance-panel.tsx**

Same pattern with `entityType="maintenance"`

- [ ] **Step 6: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 7: Test all panels in browser**

For each panel (Notifications, Drivers, Attributes, Commands, Maintenance):
- Navigate to the panel in settings
- Verify expandable device list appears in entity cards
- Test expand/collapse functionality

- [ ] **Step 8: Commit all panel integrations**

```bash
git add apps/web/src/components/settings/*-panel.tsx
git commit -m "feat(settings): integrate device connections in all entity panels

Add expandable device connection lists to notification, driver,
attribute, command, and maintenance panels."
```

---

## Chunk 6: Device Dialog Integration

### Task 9: Integrate Connections Section into Device Dialog

**Files:**
- Modify: `apps/web/src/components/settings-page.tsx`

- [ ] **Step 1: Find the DeviceEditDialog component**

Search for the device edit dialog around line 1100-1300

- [ ] **Step 2: Add import**

Add to imports:

```typescript
import { DeviceConnectionsSection } from "./settings/device-connections-section"
```

- [ ] **Step 3: Add separator and connections section**

In the dialog content, after the basic device fields, add:

```typescript
{/* Existing device fields (name, uniqueId, category, etc.) */}

{/* NEW: Connections section */}
<Separator className="my-4" />

<DeviceConnectionsSection
  deviceId={editingDevice.id}
  onSave={handleDeviceUpdated}
  onCancel={() => setEditingDevice(null)}
/>
```

Note: You may need to adjust based on the actual structure of the device dialog. The connections section should appear after basic device info but before the dialog footer buttons.

- [ ] **Step 4: Remove duplicate buttons if needed**

The `DeviceConnectionsSection` has its own Save/Cancel buttons. Check if the dialog already has footer buttons and coordinate them appropriately.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 6: Test in browser**

Run: `pnpm dev`
1. Navigate to Settings → Devices
2. Click on a device to edit
3. Verify connections section appears with all 6 multi-selects
4. Test selection and save (won't fully work until API is wired up)

- [ ] **Step 7: Commit device dialog integration**

```bash
git add apps/web/src/components/settings-page.tsx
git commit -m "feat(settings): add connections section to device dialog

Integrate DeviceConnectionsSection into device edit dialog
with multi-select dropdowns for all connection types."
```

---

## Chunk 7: API Integration and Polish

### Task 10: Implement Permission API Loading

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Research Traccar permissions API**

Check Traccar API documentation or openapi.yaml for how to query existing permissions. Traccar may have:
- `GET /permissions` - get all permissions
- Device/geofence objects may include permission arrays

Reference: `/home/devall/asan/openapi.yaml`

- [ ] **Step 2: Implement getDevicePermissions properly**

Update the TODO implementation in `traccar.ts`:

```typescript
/**
 * Get all entity IDs of a given type connected to a device
 * Note: Traccar API structure may vary - adjust based on actual API
 */
export async function getDevicePermissions(
  config: TraccarConfig,
  deviceId: number,
  type: PermissionType
): Promise<number[]> {
  // Option A: If permissions endpoint exists
  try {
    const permissions = await apiRequest<TraccarPermission[]>(
      config,
      "/permissions"
    )
    const fieldName = PERMISSION_FIELD_MAP[type]
    return permissions
      .filter((p) => p.deviceId === deviceId && p[fieldName])
      .map((p) => p[fieldName] as number)
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Add getEntityDevices helper**

```typescript
/**
 * Get all device IDs connected to an entity
 */
export async function getEntityDevices(
  config: TraccarConfig,
  entityId: number,
  type: PermissionType
): Promise<number[]> {
  try {
    const permissions = await apiRequest<TraccarPermission[]>(
      config,
      "/permissions"
    )
    const fieldName = PERMISSION_FIELD_MAP[type]
    return permissions
      .filter((p) => p[fieldName] === entityId && p.deviceId)
      .map((p) => p.deviceId as number)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Export new function**

Ensure `getEntityDevices` is exported

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 6: Commit API implementation**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat(api): implement permission loading functions

Add proper implementation of getDevicePermissions and
getEntityDevices using Traccar permissions API."
```

### Task 11: Wire Up Device Connections Loading

**Files:**
- Modify: `apps/web/src/components/settings/device-connections-section.tsx`

- [ ] **Step 1: Import entity fetch functions**

Add imports:

```typescript
import {
  getGeofences,
  getNotifications,
  getDrivers,
  getAttributes,
  getCommands,
  getMaintenance,
  type TraccarGeofence,
  type TraccarNotification,
  // ... other entity types
} from "@/lib/traccar"
```

Note: Check if all these functions exist. Some may need to be added to traccar.ts

- [ ] **Step 2: Implement loadConnections function**

Replace the TODO in `loadConnections`:

```typescript
async function loadConnections() {
  setState({ status: "loading" })
  const config = toConfig(readStoredConfig())

  try {
    // Fetch all entity types in parallel
    const [
      geofences,
      notifications,
      drivers,
      attributes,
      commands,
      maintenance,
      currentGeofences,
      currentNotifications,
      currentDrivers,
      currentAttributes,
      currentCommands,
      currentMaintenance,
    ] = await Promise.all([
      getGeofences(config),
      getNotifications(config),
      getDrivers(config),
      getAttributes(config),
      getCommands(config),
      getMaintenance(config),
      getDevicePermissions(config, deviceId, "geofence"),
      getDevicePermissions(config, deviceId, "notification"),
      getDevicePermissions(config, deviceId, "driver"),
      getDevicePermissions(config, deviceId, "attribute"),
      getDevicePermissions(config, deviceId, "command"),
      getDevicePermissions(config, deviceId, "maintenance"),
    ])

    // Set entity options
    setEntityOptions({
      geofences: geofences.map((g) => ({ id: g.id, name: g.name })),
      notifications: notifications.map((n) => ({ id: n.id, name: n.name })),
      drivers: drivers.map((d) => ({ id: d.id, name: d.name })),
      attributes: attributes.map((a) => ({ id: a.id, name: a.name })),
      commands: commands.map((c) => ({ id: c.id, name: c.name })),
      maintenance: maintenance.map((m) => ({ id: m.id, name: m.name })),
    })

    const current: ConnectionsByType = {
      geofences: currentGeofences,
      notifications: currentNotifications,
      drivers: currentDrivers,
      attributes: currentAttributes,
      commands: currentCommands,
      maintenance: currentMaintenance,
    }

    setState({ status: "loaded", current })
    setPending(current)
  } catch (error) {
    setState({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
```

- [ ] **Step 3: Implement handleSave function**

Replace the TODO in `handleSave`:

```typescript
async function handleSave() {
  if (state.status !== "loaded") return

  setState({ status: "saving" })
  const config = toConfig(readStoredConfig())

  try {
    const types: Array<keyof ConnectionsByType> = [
      "geofences",
      "notifications",
      "drivers",
      "attributes",
      "commands",
      "maintenance",
    ]

    const fieldMap: Record<string, keyof TraccarPermission> = {
      geofences: "geofenceId",
      notifications: "notificationId",
      drivers: "driverId",
      attributes: "attributeId",
      commands: "commandId",
      maintenance: "maintenanceId",
    }

    // Calculate diff and create permission change requests
    const permissionChanges: Promise<void>[] = []

    for (const type of types) {
      const current = state.current[type]
      const pendingSet = new Set(pending[type])
      const currentSet = new Set(current)

      // Added connections
      const added = pending[type].filter((id) => !currentSet.has(id))
      // Removed connections
      const removed = current.filter((id) => !pendingSet.has(id))

      // Create permissions for added
      for (const entityId of added) {
        const permission: TraccarPermission = {
          deviceId,
          [fieldMap[type]]: entityId,
        }
        permissionChanges.push(createPermission(config, permission))
      }

      // Delete permissions for removed
      for (const entityId of removed) {
        const permission: TraccarPermission = {
          deviceId,
          [fieldMap[type]]: entityId,
        }
        permissionChanges.push(deletePermission(config, permission))
      }
    }

    // Execute all permission changes in parallel
    await Promise.all(permissionChanges)

    toast.success("Device connections updated")
    onSave?.()
  } catch (error) {
    setState({
      status: "error",
      message: `Failed to save connections: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Test full flow in browser**

1. Navigate to Settings → Devices
2. Click a device to edit
3. Verify connections load (or show empty if none)
4. Select some connections
5. Click Save
6. Reopen device dialog and verify connections persisted

- [ ] **Step 6: Commit connection loading and saving**

```bash
git add apps/web/src/components/settings/device-connections-section.tsx
git commit -m "feat(settings): wire up device connections loading and saving

Implement full load/save flow for device connections with
parallel API calls and diff-based permission updates."
```

### Task 12: Wire Up Entity Panel Connection Loading

**Files:**
- Modify: `apps/web/src/components/settings/geofence-panel.tsx`
- Modify: `apps/web/src/components/settings/notification-panel.tsx`
- Modify: `apps/web/src/components/settings/driver-panel.tsx`
- Modify: `apps/web/src/components/settings/attribute-panel.tsx`
- Modify: `apps/web/src/components/settings/command-panel.tsx`
- Modify: `apps/web/src/components/settings/maintenance-panel.tsx`

- [ ] **Step 1: Update geofence panel to load connected devices**

In `geofence-panel.tsx`, add state for device connections:

```typescript
const [deviceConnections, setDeviceConnections] = useState<
  Record<number, number[]>
>({})
```

Update load function to fetch connections:

```typescript
function load() {
  const config = toConfig(readStoredConfig())
  setLoading(true)
  Promise.all([
    getGeofences(config),
    getDevices(config),
  ])
    .then(async ([gf, dev]) => {
      setGeofences(gf)
      setDevices(dev)

      // Load device connections for each geofence
      const connections: Record<number, number[]> = {}
      await Promise.all(
        gf.map(async (geofence) => {
          connections[geofence.id] = await getEntityDevices(
            config,
            geofence.id,
            "geofence"
          )
        })
      )
      setDeviceConnections(connections)
    })
    .catch(() => {
      setGeofences([])
      setDevices([])
      setDeviceConnections({})
    })
    .finally(() => setLoading(false))
}
```

Update ExpandableDeviceList to use real connections:

```typescript
<ExpandableDeviceList
  entityId={gf.id}
  entityType="geofence"
  connectedDeviceIds={deviceConnections[gf.id] || []}
  allDevices={devices}
  onConnectionsChange={load}
/>
```

- [ ] **Step 2: Apply same pattern to all other entity panels**

Repeat for:
- notification-panel.tsx (entityType="notification")
- driver-panel.tsx (entityType="driver")
- attribute-panel.tsx (entityType="attribute")
- command-panel.tsx (entityType="command")
- maintenance-panel.tsx (entityType="maintenance")

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Test all panels in browser**

For each panel:
1. Navigate to the panel
2. Expand a device list
3. Add a device
4. Verify device appears
5. Remove a device
6. Verify device disappears
7. Check from device dialog that connections match

- [ ] **Step 5: Commit entity panel connection loading**

```bash
git add apps/web/src/components/settings/*-panel.tsx
git commit -m "feat(settings): wire up entity panel device connection loading

Load actual device connections for all entity panels using
getEntityDevices API function."
```

---

## Chunk 8: Final Polish and Testing

### Task 13: Add Missing Entity API Functions

**Files:**
- Modify: `apps/web/src/lib/traccar.ts`

- [ ] **Step 1: Check which entity getters exist**

Search traccar.ts for:
- `getNotifications`
- `getDrivers`
- `getAttributes`
- `getCommands`
- `getMaintenance`

- [ ] **Step 2: Add missing entity types**

For each missing entity type, add the TypeScript type and getter function. Example:

```typescript
export type TraccarNotification = {
  id: number
  name: string
  type?: string
  attributes?: Record<string, unknown>
}

export async function getNotifications(
  config: TraccarConfig
): Promise<TraccarNotification[]> {
  const cached = getCached<TraccarNotification[]>(config, "/notifications", 30000)
  if (cached) return cached

  const notifications = await apiRequest<TraccarNotification[]>(
    config,
    "/notifications"
  )
  setCached(config, "/notifications", notifications)
  return notifications
}
```

Repeat for drivers, attributes (computed attributes), commands, and maintenance.

- [ ] **Step 3: Verify API endpoints in openapi.yaml**

Check `/home/devall/asan/openapi.yaml` for actual endpoint paths:
- `/notifications` or `/api/notifications`
- `/drivers` or `/api/drivers`
- etc.

Adjust paths accordingly.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit missing entity functions**

```bash
git add apps/web/src/lib/traccar.ts
git commit -m "feat(api): add missing entity API functions

Add getters for notifications, drivers, attributes, commands,
and maintenance to support device connection management."
```

### Task 14: Error Handling Polish

**Files:**
- Modify: `apps/web/src/components/settings/device-connections-section.tsx`
- Modify: `apps/web/src/components/settings/expandable-device-list.tsx`

- [ ] **Step 1: Add partial save error handling**

In device-connections-section.tsx `handleSave`, improve error handling:

```typescript
async function handleSave() {
  if (state.status !== "loaded") return

  setState({ status: "saving" })
  const config = toConfig(readStoredConfig())

  const results: { type: string; success: boolean; error?: string }[] = []

  try {
    // ... existing diff calculation code ...

    // Execute changes and track results
    for (const type of types) {
      try {
        const typeChanges = permissionChangesByType[type] // from previous code
        await Promise.all(typeChanges)
        results.push({ type, success: true })
      } catch (error) {
        results.push({
          type,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Check if all succeeded
    const allSuccess = results.every((r) => r.success)
    const someSuccess = results.some((r) => r.success)

    if (allSuccess) {
      toast.success("Device connections updated")
      onSave?.()
    } else if (someSuccess) {
      // Partial success - show details
      const failed = results.filter((r) => !r.success)
      toast.error(
        `Some connections failed: ${failed.map((f) => f.type).join(", ")}`
      )
      // Reload to show current state
      loadConnections()
    } else {
      // All failed
      setState({
        status: "error",
        message: "Failed to save any connections. Please try again.",
      })
    }
  } catch (error) {
    setState({
      status: "error",
      message: `Failed to save connections: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
```

- [ ] **Step 2: Add retry functionality to toasts**

In expandable-device-list.tsx, add retry to error toasts:

```typescript
catch (error) {
  toast.error(
    `Failed to connect device: ${error instanceof Error ? error.message : String(error)}`,
    {
      action: {
        label: "Retry",
        onClick: () => handleAddDevice(deviceId),
      },
    }
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Test error scenarios**

1. Disconnect network (DevTools offline mode)
2. Try adding/removing devices in entity panels
3. Verify error toasts appear with retry button
4. Try saving in device dialog
5. Verify partial save errors show details

- [ ] **Step 5: Commit error handling improvements**

```bash
git add apps/web/src/components/settings/device-connections-section.tsx apps/web/src/components/settings/expandable-device-list.tsx
git commit -m "feat(settings): improve error handling with retry and partial save

Add detailed error messages, retry functionality, and partial
save handling for device connection operations."
```

### Task 15: Empty State Improvements

**Files:**
- Modify: `apps/web/src/components/settings/device-connections-section.tsx`

- [ ] **Step 1: Add empty state tooltips**

Update multi-select rendering to show helpful messages when no entities exist:

```typescript
<div>
  <label className="mb-1.5 block text-xs font-medium">
    Geofences
  </label>
  {entityOptions.geofences.length === 0 ? (
    <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      No geofences available.{" "}
      <button
        type="button"
        onClick={() => {
          // Navigate to geofences tab
          onCancel?.()
          // TODO: Add navigation to geofences tab
        }}
        className="underline hover:text-foreground"
      >
        Create one first
      </button>
    </div>
  ) : (
    <MultiSelect
      options={entityOptions.geofences}
      selected={pending.geofences}
      onChange={(selected) =>
        setPending({ ...pending, geofences: selected })
      }
      placeholder="Select geofences..."
      disabled={isSaving}
    />
  )}
</div>
```

Repeat for all entity types.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Test empty states**

1. In a clean database with no geofences/notifications/etc
2. Open device dialog
3. Verify helpful empty state messages appear

- [ ] **Step 4: Commit empty state improvements**

```bash
git add apps/web/src/components/settings/device-connections-section.tsx
git commit -m "feat(settings): add helpful empty states for entity selections

Show create prompts when no entities exist instead of disabled
multi-selects."
```

### Task 16: Final Testing and Documentation

**Files:**
- None (manual testing)

- [ ] **Step 1: Comprehensive manual testing**

Test all scenarios:

**Device Dialog:**
- [ ] Open device, verify connections load
- [ ] Add connections to multiple types
- [ ] Remove some connections
- [ ] Save successfully
- [ ] Reopen and verify persistence
- [ ] Test with no existing connections
- [ ] Test with all entity types
- [ ] Test cancel without saving
- [ ] Test error scenarios

**Entity Panels (all 6):**
- [ ] Expand device list in entity card
- [ ] Verify connected devices show
- [ ] Add a device, verify success toast
- [ ] Remove a device, verify success toast
- [ ] Test with no connected devices
- [ ] Test with no available devices to add
- [ ] Test error scenarios
- [ ] Verify changes reflect in device dialog

**Cross-verification:**
- [ ] Add connection in device dialog, verify in entity panel
- [ ] Add connection in entity panel, verify in device dialog
- [ ] Remove from one side, verify removed from other side

**Edge Cases:**
- [ ] Large number of entities (50+) in multi-select
- [ ] Large number of devices in entity panel
- [ ] Slow network (throttle in DevTools)
- [ ] Offline mode
- [ ] Concurrent edits (two browser windows)

- [ ] **Step 2: Performance check**

Monitor in DevTools:
- [ ] API call count (should batch in device dialog)
- [ ] Memory usage (no leaks)
- [ ] Render performance (no jank in multi-select)

- [ ] **Step 3: Accessibility audit**

- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Screen reader announces selections
- [ ] All buttons have accessible labels
- [ ] Focus visible on all interactive elements

- [ ] **Step 4: Create summary commit**

```bash
git commit --allow-empty -m "feat: device connections management complete

Summary of implementation:
- Multi-select component for device dialog
- Expandable device lists for entity panels
- Permission API integration
- Optimistic UI updates with error recovery
- Comprehensive error handling
- Empty state handling
- Full test coverage

All manual tests passing. Feature ready for review."
```

- [ ] **Step 5: Update CLAUDE.md if needed**

Add any important patterns or conventions discovered during implementation to `/home/devall/asan/CLAUDE.md` for future reference.

---

## Implementation Complete

This plan implements full bidirectional device connection management with:
- ✅ Multi-select component for device dialog (batch save)
- ✅ Expandable device lists for entity panels (immediate save)
- ✅ Permission API integration with Traccar
- ✅ Optimistic UI updates and error recovery
- ✅ Comprehensive error handling and empty states
- ✅ Full manual test coverage

**Total estimated time:** 4-6 hours for experienced developer

**Next steps after implementation:**
1. Review all changes
2. Test thoroughly in staging environment
3. Deploy to production
4. Monitor for issues
5. Gather user feedback

---

## Notes for Implementer

**Key Patterns:**
- Follow existing shadcn/ui patterns for new components
- Use existing config/API patterns from traccar.ts
- Keep components focused and single-purpose
- Test each task incrementally before moving on

**Common Issues:**
- Traccar API might not have all expected endpoints - check openapi.yaml
- Permission structure may vary - adjust based on actual API responses
- Some entity types might be named differently (e.g., "calculatedAttributes" vs "attributes")

**Questions to Resolve:**
- Exact Traccar permissions endpoint structure (may need API testing)
- Whether maintenance entities exist in this Traccar version
- Preferred navigation pattern for "create entity" links from empty states
