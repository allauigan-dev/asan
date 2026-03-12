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
  getGeofences,
  getNotifications,
  getDrivers,
  getComputedAttributes,
  getCommands,
  getMaintenance,
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
    setState({ status: "loading" })
    const config = toConfig(readStoredConfig())

    try {
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
        getComputedAttributes(config),
        getCommands(config),
        getMaintenance(config),
        getDevicePermissions(config, deviceId, "geofence"),
        getDevicePermissions(config, deviceId, "notification"),
        getDevicePermissions(config, deviceId, "driver"),
        getDevicePermissions(config, deviceId, "attribute"),
        getDevicePermissions(config, deviceId, "command"),
        getDevicePermissions(config, deviceId, "maintenance"),
      ])

      setEntityOptions({
        geofences: geofences.map((g) => ({ id: g.id, name: g.name })),
        notifications: notifications.map((n) => ({ id: n.id, name: n.type || `Notification ${n.id}` })),
        drivers: drivers.map((d) => ({ id: d.id, name: d.name })),
        attributes: attributes.map((a) => ({ id: a.id, name: a.description || `Attribute ${a.id}` })),
        commands: commands.map((c) => ({ id: c.id, name: c.description || `Command ${c.id}` })),
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

      const permissionChanges: Promise<void>[] = []

      for (const type of types) {
        const current = state.current[type]
        const pendingSet = new Set(pending[type])
        const currentSet = new Set(current)

        const added = pending[type].filter((id) => !currentSet.has(id))
        const removed = current.filter((id) => !pendingSet.has(id))

        for (const entityId of added) {
          const permission: TraccarPermission = {
            deviceId,
            [fieldMap[type]]: entityId,
          }
          permissionChanges.push(createPermission(config, permission))
        }

        for (const entityId of removed) {
          const permission: TraccarPermission = {
            deviceId,
            [fieldMap[type]]: entityId,
          }
          permissionChanges.push(deletePermission(config, permission))
        }
      }

      await Promise.all(permissionChanges)
      toast.success("Device connections updated")
      onSave?.()
    } catch (error) {
      setState({
        status: "error",
        message: `Failed to save: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
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
