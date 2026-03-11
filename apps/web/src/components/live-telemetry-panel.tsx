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
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"

import {
  Edit,
  MapPinned,
  MoreVertical,
  Route,
  Terminal,
  X,
} from "@/components/icons"
import { MapPin, Plus } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  geocode,
  updateDevice,
  deleteDevice,
  getGroups,
  type TraccarDevice,
  type TraccarEvent,
  type TraccarGroup,
  type TraccarPosition,
} from "@/lib/traccar"
import {
  ensureArray,
  formatTimestamp,
  getBatteryLevel,
  relativeTime,
  toKph,
} from "@/lib/utils"

type LiveTelemetryPanelProps = {
  selectedDevice: TraccarDevice | null
  selectedPosition: TraccarPosition | null
  events: TraccarEvent[]
  onClose: () => void
  onViewReplay: () => void
}

export function LiveTelemetryPanel({
  selectedDevice,
  selectedPosition,
  events,
  onClose,
  onViewReplay,
}: LiveTelemetryPanelProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)

  // Reset address cache when device changes
  useEffect(() => {
    setShowAddress(false)
    setGeocodedAddress(null)
    setIsLoadingAddress(false)
  }, [selectedDevice?.id])

  if (!selectedDevice || !selectedPosition) {
    return null
  }

  async function handleShowAddress() {
    if (!selectedPosition) return

    // If we already have the address cached, just toggle display
    if (geocodedAddress) {
      setShowAddress(true)
      return
    }

    // Otherwise, fetch it
    setIsLoadingAddress(true)
    setShowAddress(true)
    try {
      const config = toConfig(readStoredConfig())
      const address = await geocode(
        config,
        selectedPosition.latitude,
        selectedPosition.longitude
      )
      setGeocodedAddress(address)
    } catch (error) {
      console.error("Failed to fetch address:", error)
      setGeocodedAddress("Address not available")
    } finally {
      setIsLoadingAddress(false)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="pointer-events-auto absolute bottom-4 left-4 flex h-[calc(100vh-6rem)] w-[400px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/40 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MapPinned className="size-4 shrink-0 text-primary" />
              <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                Live Telemetry
              </p>
            </div>
            <p className="truncate font-display text-base font-bold">
              {selectedDevice.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedDevice.uniqueId} •{" "}
              {relativeTime(selectedPosition.fixTime)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onViewReplay}
              title="View Replay"
            >
              <Route className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                /* Placeholder for command functionality */
              }}
              title="Send Command"
            >
              <Terminal className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setShowEditDialog(true)}
              title="Edit Device"
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                /* Placeholder for extra functionality */
              }}
              title="More Options"
            >
              <MoreVertical className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onClose}
              title="Close panel"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <QuickStat
                label="Speed"
                value={`${toKph(selectedPosition.speed)} km/h`}
              />
              <QuickStat
                label="Battery"
                value={
                  getBatteryLevel(selectedPosition) !== null
                    ? `${getBatteryLevel(selectedPosition)}%`
                    : "N/A"
                }
              />
              <QuickStat
                label="Altitude"
                value={
                  selectedPosition.altitude
                    ? `${(selectedPosition.altitude * 3.28084).toFixed(2)} ft`
                    : "N/A"
                }
              />
              <QuickStat
                label="Heading"
                value={`${getCourseDirection(selectedPosition.course)} ${Math.round(selectedPosition.course ?? 0)}°`}
              />
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Location
                </h4>
                {!showAddress && !selectedPosition.address && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={handleShowAddress}
                    disabled={isLoadingAddress}
                    title="Show Address"
                  >
                    <MapPin className="size-3.5" />
                  </Button>
                )}
              </div>
              {showAddress || selectedPosition.address ? (
                <InfoRow 
                  label="Address" 
                  value={
                    selectedPosition.address || 
                    geocodedAddress || 
                    (isLoadingAddress ? "Loading..." : "Address not available")
                  } 
                />
              ) : (
                <>
                  <InfoRow
                    label="Latitude"
                    value={`${selectedPosition.latitude.toFixed(6)}°`}
                  />
                  <InfoRow
                    label="Longitude"
                    value={`${selectedPosition.longitude.toFixed(6)}°`}
                  />
                </>
              )}
            </div>

            <Separator />

            {/* Detailed Attributes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                All Attributes
              </h4>
              <div className="rounded-lg border border-border/50 bg-muted/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                        Attribute
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AttributeRow
                      label="ID"
                      value={String(selectedPosition.id)}
                    />
                    <AttributeRow
                      label="Device ID"
                      value={String(selectedPosition.deviceId)}
                    />
                    {selectedPosition.attributes?.protocol ? (
                      <AttributeRow
                        label="Protocol"
                        value={String(selectedPosition.attributes.protocol)}
                      />
                    ) : null}
                    {selectedPosition.serverTime ? (
                      <AttributeRow
                        label="Server Time"
                        value={formatDetailedTimestamp(
                          selectedPosition.serverTime
                        )}
                      />
                    ) : null}
                    {selectedPosition.deviceTime ? (
                      <AttributeRow
                        label="Device Time"
                        value={formatDetailedTimestamp(
                          selectedPosition.deviceTime
                        )}
                      />
                    ) : null}
                    {selectedPosition.fixTime ? (
                      <AttributeRow
                        label="Fix Time"
                        value={formatDetailedTimestamp(
                          selectedPosition.fixTime
                        )}
                      />
                    ) : null}
                    <AttributeRow
                      label="Valid"
                      value={
                        selectedPosition.attributes?.valid !== false
                          ? "Yes"
                          : "No"
                      }
                    />
                    <AttributeRow
                      label="Latitude"
                      value={`${selectedPosition.latitude.toFixed(6)}°`}
                    />
                    <AttributeRow
                      label="Longitude"
                      value={`${selectedPosition.longitude.toFixed(6)}°`}
                    />
                    {selectedPosition.altitude !== undefined ? (
                      <AttributeRow
                        label="Altitude"
                        value={`${(selectedPosition.altitude * 3.28084).toFixed(2)} ft`}
                      />
                    ) : null}
                    <AttributeRow
                      label="Speed"
                      value={`${toKph(selectedPosition.speed)} km/h`}
                    />
                    {selectedPosition.course !== undefined ? (
                      <AttributeRow
                        label="Course"
                        value={`${getCourseDirection(selectedPosition.course)}`}
                      />
                    ) : null}
                    {selectedPosition.address ? (
                      <AttributeRow
                        label="Address"
                        value={selectedPosition.address}
                      />
                    ) : null}
                    {selectedPosition.attributes?.accuracy !== undefined ? (
                      <AttributeRow
                        label="Accuracy"
                        value={String(selectedPosition.attributes.accuracy)}
                      />
                    ) : null}
                    {selectedPosition.attributes?.motion !== undefined ? (
                      <AttributeRow
                        label="Motion"
                        value={
                          selectedPosition.attributes.motion ? "Yes" : "No"
                        }
                      />
                    ) : null}
                    {selectedPosition.attributes?.odometer !== undefined ? (
                      <AttributeRow
                        label="Odometer"
                        value={`${((selectedPosition.attributes.odometer as number) / 1000).toFixed(2)} km`}
                      />
                    ) : null}
                    {selectedPosition.attributes?.activity ? (
                      <AttributeRow
                        label="Activity"
                        value={String(selectedPosition.attributes.activity)}
                      />
                    ) : null}
                    {getBatteryLevel(selectedPosition) !== null ? (
                      <AttributeRow
                        label="Battery Level"
                        value={`${getBatteryLevel(selectedPosition)}%`}
                      />
                    ) : null}
                    {selectedPosition.attributes?.distance !== undefined ? (
                      <AttributeRow
                        label="Distance"
                        value={`${((selectedPosition.attributes.distance as number) / 1000).toFixed(2)} km`}
                      />
                    ) : null}
                    {selectedPosition.attributes?.totalDistance !==
                    undefined ? (
                      <AttributeRow
                        label="Total Distance"
                        value={`${((selectedPosition.attributes.totalDistance as number) / 1000).toFixed(2)} km`}
                      />
                    ) : null}
                    {/* Additional custom attributes */}
                    {selectedPosition.attributes
                      ? Object.entries(selectedPosition.attributes)
                          .filter(
                            ([key]) =>
                              ![
                                "protocol",
                                "valid",
                                "accuracy",
                                "motion",
                                "odometer",
                                "activity",
                                "batteryLevel",
                                "distance",
                                "totalDistance",
                              ].includes(key)
                          )
                          .map(([key, value]) => (
                            <AttributeRow
                              key={key}
                              label={key}
                              value={formatAttributeValue(value)}
                            />
                          ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Events */}
            {events.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Recent Events
                  </h4>
                  {ensureArray<TraccarEvent>(events)
                    .slice(0, 3)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border/50 bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{event.type}</p>
                          <Badge variant="outline" className="text-xs">
                            {formatTimestamp(event.eventTime)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="flex max-w-2xl flex-col gap-0">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information and settings.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="pt-4 pr-4">
              <DeviceEditForm
                device={selectedDevice}
                onSuccess={() => {
                  setShowEditDialog(false)
                  // Optionally refresh device data
                }}
                onCancel={() => setShowEditDialog(false)}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  )
}

function AttributeRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border/30 last:border-0">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2 font-medium break-all">{value}</td>
    </tr>
  )
}

function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "N/A"
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }
  if (typeof value === "number") {
    return value.toString()
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return String(value)
}

function formatDetailedTimestamp(value?: string): string {
  if (!value) return "N/A"
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value))
}

function getCourseDirection(course?: number): string {
  if (course === undefined || course === null) return "N/A"

  const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"]
  const index = Math.round(course / 45) % 8
  return directions[index]
}

// ── Device Edit Form ──────────────────────────────────────────────────────────

const DEVICE_CATEGORIES = [
  "default",
  "animal",
  "bicycle",
  "boat",
  "bus",
  "car",
  "crane",
  "helicopter",
  "motorcycle",
  "offroad",
  "person",
  "pickup",
  "plane",
  "ship",
  "tractor",
  "train",
  "tram",
  "trolleybus",
  "truck",
  "van",
] as const

type DeviceFormState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded"
      groups: TraccarGroup[]
      form: TraccarDevice
      saving: boolean
      deleting: boolean
    }

function DeviceEditForm({
  device,
  onSuccess,
  onCancel,
}: {
  device: TraccarDevice
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, setState] = useState<DeviceFormState>({ status: "loading" })

  useEffect(() => {
    const config = toConfig(readStoredConfig())
    getGroups(config)
      .then((groups) => {
        setState({
          status: "loaded",
          groups,
          form: { ...device },
          saving: false,
          deleting: false,
        })
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message: String(err instanceof Error ? err.message : err),
        })
      })
  }, [device])

  if (state.status === "loading") {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Loading form…
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        {state.message}
      </div>
    )
  }

  const { groups, form, saving, deleting } = state

  function setForm(patch: Partial<typeof form>) {
    setState((prev) => {
      if (prev.status !== "loaded") return prev
      return { ...prev, form: { ...prev.form, ...patch } }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.status !== "loaded") return

    if (!form.name || !form.uniqueId) {
      setState({ status: "error", message: "Name and Unique ID are required" })
      return
    }

    setState((prev) =>
      prev.status === "loaded" ? { ...prev, saving: true } : prev
    )
    try {
      const config = toConfig(readStoredConfig())
      await updateDevice(config, form.id, form)
      onSuccess()
    } catch (err: unknown) {
      setState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  async function handleDelete() {
    if (state.status !== "loaded") return
    if (!confirm(`Delete device "${form.name}"? This action cannot be undone.`))
      return

    setState((prev) =>
      prev.status === "loaded" ? { ...prev, deleting: true } : prev
    )
    try {
      const config = toConfig(readStoredConfig())
      await deleteDevice(config, form.id)
      onSuccess()
    } catch (err: unknown) {
      setState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Required fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Name (required)
          </label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ name: e.target.value })}
            placeholder="My Vehicle"
            required
            disabled={saving || deleting}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Unique ID (required)
          </label>
          <Input
            value={form.uniqueId ?? ""}
            onChange={(e) => setForm({ uniqueId: e.target.value })}
            placeholder="123456789012345"
            required
            disabled={saving || deleting || true}
          />
          <p className="text-[11px] text-muted-foreground">
            Device hardware identifier cannot be changed
          </p>
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-4 border-t border-border/30 pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Optional Information
        </p>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Category
          </label>
          <Select
            value={form.category ?? "none"}
            onValueChange={(value) =>
              setForm({
                category: value === "none" ? undefined : value,
              })
            }
            disabled={saving || deleting}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {DEVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Group</label>
            <Select
              value={form.groupId?.toString() ?? "none"}
              onValueChange={(value) =>
                setForm({
                  groupId: value === "none" ? undefined : Number(value),
                })
              }
              disabled={saving || deleting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Phone Number
          </label>
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ phone: e.target.value })}
            placeholder="+1234567890"
            type="tel"
            disabled={saving || deleting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Model</label>
          <Input
            value={form.model ?? ""}
            onChange={(e) => setForm({ model: e.target.value })}
            placeholder="GPS Tracker Pro"
            disabled={saving || deleting}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Contact</label>
          <Input
            value={form.contact ?? ""}
            onChange={(e) => setForm({ contact: e.target.value })}
            placeholder="John Doe"
            disabled={saving || deleting}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={!!form.disabled}
            onChange={(e) => setForm({ disabled: e.target.checked })}
            disabled={saving || deleting}
            className="mt-0.5 size-4 rounded border-border accent-primary disabled:cursor-not-allowed"
          />
          <div>
            <p className="text-xs font-medium text-foreground">Disabled</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Mark device as disabled
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-2">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? "Deleting…" : "Delete Device"}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || deleting || !form.name || !form.uniqueId}
          >
            <Plus className="size-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}
