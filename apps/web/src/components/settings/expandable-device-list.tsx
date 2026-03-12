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
