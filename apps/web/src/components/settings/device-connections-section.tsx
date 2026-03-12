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
