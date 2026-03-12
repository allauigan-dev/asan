import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
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

import {
  BarChart,
  Bell,
  ChevronLeft,
  ChevronRight,
  Fence,
  FolderOpen,
  Function,
  Person,
  Plus,
  Server,
  ShieldCheck,
  Terminal,
  Truck,
  Users,
  Wrench,
} from "@/components/icons"
import { AttributePanel } from "@/components/settings/attribute-panel"
import { CommandPanel } from "@/components/settings/command-panel"
import { DriverPanel } from "@/components/settings/driver-panel"
import { GeofencePanel } from "@/components/settings/geofence-panel"
import { GroupPanel } from "@/components/settings/group-panel"
import { MaintenancePanel } from "@/components/settings/maintenance-panel"
import { NotificationPanel } from "@/components/settings/notification-panel"
import { StatisticsPanel } from "@/components/settings/statistics-panel"
import { UserPanel } from "@/components/settings/user-panel"
import { AuthImage } from "@/components/auth-image"
import { readStoredConfig, toConfig, type ConnectionForm } from "@/lib/config"
import { getDeviceIcon } from "@/lib/utils"
import {
  createDevice,
  deleteDevice,
  getDevices,
  getGroups,
  getServer,
  getServerCache,
  rebootServer,
  triggerServerGc,
  updateDevice,
  updateServer,
  uploadDeviceImage,
  type TraccarDevice,
  type TraccarGroup,
  type TraccarServer,
} from "@/lib/traccar"
import type { AuthMode } from "@/lib/traccar"
import type { ConnectionState } from "@/hooks/use-fleet"

type SettingsTab =
  | "server"
  | "devices"
  | "geofences"
  | "drivers"
  | "commands"
  | "maintenance"
  | "notifications"
  | "users"
  | "groups"
  | "statistics"
  | "attributes"

type SettingsPageProps = {
  connectionState: ConnectionState
  connectionError: string
  onConnect: (form: ConnectionForm) => void
  onClose?: () => void
  /** When true, renders as a standalone login screen (no nav chrome) */
  loginMode?: boolean
  /** Callback when device is updated (to refresh fleet state) */
  onDeviceUpdate?: () => void
}

export function SettingsPage({
  connectionState,
  connectionError,
  onConnect,
  onClose,
  loginMode = false,
  onDeviceUpdate,
}: SettingsPageProps) {
  const [form, setForm] = useState<ConnectionForm>(() => readStoredConfig())
  const [activeTab, setActiveTab] = useState<SettingsTab>("server")

  const isConnecting = connectionState === "connecting"
  const isTotpRequired = connectionState === "totp_required"
  const isConnected = connectionState === "connected"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConnect(form)
  }

  // Login mode: centered card, no sidebar
  if (loginMode) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/40">
        <Card className="w-full max-w-md border border-border/70 bg-card shadow-2xl">
          <CardHeader>
            <CardTitle>Login to ASAN</CardTitle>
            <CardDescription>
              {isTotpRequired
                ? "Enter the verification code from your authenticator app."
                : "Enter your Traccar server URL and credentials to connect."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionForm
              form={form}
              setForm={setForm}
              isConnecting={isConnecting}
              isTotpRequired={isTotpRequired}
              connectionError={connectionError}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Page mode: sidebar nav + content area
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar nav */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border/40 bg-background">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onClose}
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
          <span className="font-display text-sm font-semibold">Settings</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          <NavItem
            icon={<Server className="size-4" />}
            label="Server"
            active={activeTab === "server"}
            onClick={() => setActiveTab("server")}
            disabled={!isConnected}
          />
          <NavItem
            icon={<Truck className="size-4" />}
            label="Devices"
            active={activeTab === "devices"}
            onClick={() => setActiveTab("devices")}
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
            icon={<Terminal className="size-4" />}
            label="Commands"
            active={activeTab === "commands"}
            onClick={() => setActiveTab("commands")}
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
            icon={<Function className="size-4" />}
            label="Attributes"
            active={activeTab === "attributes"}
            onClick={() => setActiveTab("attributes")}
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
            icon={<BarChart className="size-4" />}
            label="Statistics"
            active={activeTab === "statistics"}
            onClick={() => setActiveTab("statistics")}
            disabled={!isConnected}
          />
        </nav>
      </aside>

      {/* Content area */}
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-6">
          {activeTab === "server" && isConnected && (
            <ServerTab connectionForm={form} />
          )}
          {activeTab === "devices" && isConnected && (
            <DevicesTab connectionForm={form} onDeviceUpdate={onDeviceUpdate} />
          )}
          {activeTab === "geofences" && isConnected && <GeofencePanel />}
          {activeTab === "drivers" && isConnected && <DriverPanel />}
          {activeTab === "commands" && isConnected && <CommandPanel />}
          {activeTab === "maintenance" && isConnected && <MaintenancePanel />}
          {activeTab === "attributes" && isConnected && <AttributePanel />}
          {activeTab === "notifications" && isConnected && (
            <NotificationPanel />
          )}
          {activeTab === "users" && isConnected && <UserPanel />}
          {activeTab === "groups" && isConnected && <GroupPanel />}
          {activeTab === "statistics" && isConnected && <StatisticsPanel />}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Shared connection form ─────────────────────────────────────────────────────

function ConnectionForm({
  form,
  setForm,
  isConnecting,
  isTotpRequired,
  connectionError,
  onSubmit,
  submitLabel,
}: {
  form: ConnectionForm
  setForm: React.Dispatch<React.SetStateAction<ConnectionForm>>
  isConnecting: boolean
  isTotpRequired: boolean
  connectionError: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  submitLabel?: string
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid gap-3">
        {isTotpRequired ? (
          <Input
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
            placeholder="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        ) : (
          <>
            <label className="text-xs font-medium text-muted-foreground">
              Server URL
              <Input
                value={form.serverUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serverUrl: event.target.value,
                  }))
                }
                placeholder="https://your-traccar-server.com"
                disabled={isConnecting}
                className="mt-1.5"
              />
            </label>

            <label className="text-xs font-medium text-muted-foreground">
              Authentication
              <Select
                value={form.authMode}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    authMode: value as AuthMode,
                  }))
                }
                disabled={isConnecting}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Auth mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Email & Password</SelectItem>
                  <SelectItem value="token">API Token</SelectItem>
                </SelectContent>
              </Select>
            </label>

            {form.authMode === "session" ? (
              <>
                <Input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email"
                  type="email"
                  disabled={isConnecting}
                />
                <Input
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password"
                  type="password"
                  disabled={isConnecting}
                />
              </>
            ) : (
              <Input
                value={form.token}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    token: event.target.value,
                  }))
                }
                placeholder="Bearer token"
                disabled={isConnecting}
              />
            )}
          </>
        )}
      </div>

      <Button className="w-full" disabled={isConnecting}>
        <ShieldCheck className="size-4" />
        {isConnecting
          ? "Connecting..."
          : isTotpRequired
            ? "Verify"
            : (submitLabel ?? "Connect")}
      </Button>
      {connectionError && !isTotpRequired ? (
        <p className="text-xs text-destructive">{connectionError}</p>
      ) : null}
    </form>
  )
}

// ── Server tab ────────────────────────────────────────────────────────────────

type ServerTabState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded"
      data: TraccarServer
      draft: TraccarServer
      saving: boolean
      saved: boolean
      gcBusy: boolean
      rebootBusy: boolean
      cacheText: string | null
      cacheBusy: boolean
    }

function ServerTab({ connectionForm }: { connectionForm: ConnectionForm }) {
  const [state, setState] = useState<ServerTabState>({ status: "loading" })

  useEffect(() => {
    const config = toConfig(connectionForm)
    getServer(config)
      .then((data) => {
        setState({
          status: "loaded",
          data,
          draft: { ...data },
          saving: false,
          saved: false,
          gcBusy: false,
          rebootBusy: false,
          cacheText: null,
          cacheBusy: false,
        })
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message: String(err instanceof Error ? err.message : err),
        })
      })
  }, [connectionForm])

  if (state.status === "loading") {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Loading server info…
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.message}
        </div>
      </div>
    )
  }

  const {
    data,
    draft,
    saving,
    saved,
    gcBusy,
    rebootBusy,
    cacheText,
    cacheBusy,
  } = state

  function setDraft(patch: Partial<TraccarServer>) {
    setState((prev) => {
      if (prev.status !== "loaded") return prev
      return { ...prev, draft: { ...prev.draft, ...patch }, saved: false }
    })
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.status !== "loaded") return
    setState((prev) =>
      prev.status === "loaded" ? { ...prev, saving: true, saved: false } : prev
    )
    try {
      const config = toConfig(connectionForm)
      const updated = await updateServer(config, draft)
      setState((prev) =>
        prev.status === "loaded"
          ? {
              ...prev,
              data: updated,
              draft: { ...updated },
              saving: false,
              saved: true,
            }
          : prev
      )
    } catch (err: unknown) {
      setState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  async function handleGc() {
    setState((prev) =>
      prev.status === "loaded" ? { ...prev, gcBusy: true } : prev
    )
    try {
      const config = toConfig(connectionForm)
      await triggerServerGc(config)
    } finally {
      setState((prev) =>
        prev.status === "loaded" ? { ...prev, gcBusy: false } : prev
      )
    }
  }

  async function handleFetchCache() {
    setState((prev) =>
      prev.status === "loaded"
        ? { ...prev, cacheBusy: true, cacheText: null }
        : prev
    )
    try {
      const config = toConfig(connectionForm)
      const text = await getServerCache(config)
      setState((prev) =>
        prev.status === "loaded"
          ? { ...prev, cacheBusy: false, cacheText: String(text) }
          : prev
      )
    } catch (err: unknown) {
      setState((prev) =>
        prev.status === "loaded"
          ? {
              ...prev,
              cacheBusy: false,
              cacheText: `Error: ${err instanceof Error ? err.message : String(err)}`,
            }
          : prev
      )
    }
  }

  async function handleReboot() {
    if (
      !confirm(
        "Reboot the Traccar server process? It will be briefly unavailable."
      )
    )
      return
    setState((prev) =>
      prev.status === "loaded" ? { ...prev, rebootBusy: true } : prev
    )
    try {
      const config = toConfig(connectionForm)
      await rebootServer(config)
    } finally {
      setState((prev) =>
        prev.status === "loaded" ? { ...prev, rebootBusy: false } : prev
      )
    }
  }

  const isReadonly = data.readonly

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Server</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          View and manage your Traccar server configuration.
        </p>
      </div>

      {/* Version badge */}
      {data.version && (
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Server className="size-3.5 shrink-0" />
          Traccar {data.version}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* General section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow
              label="Announcement"
              description="Message shown to all users in the web UI"
            >
              <Input
                value={draft.announcement ?? ""}
                onChange={(e) => setDraft({ announcement: e.target.value })}
                placeholder="No announcement"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="Coordinate Format"
              description="Default format for displaying coordinates"
            >
              <Input
                value={draft.coordinateFormat ?? ""}
                onChange={(e) => setDraft({ coordinateFormat: e.target.value })}
                placeholder="Default"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Map section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow
              label="Default Latitude"
              description="Initial map center latitude"
            >
              <Input
                value={draft.latitude ?? ""}
                type="number"
                step="any"
                onChange={(e) =>
                  setDraft({
                    latitude: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="Default Longitude"
              description="Initial map center longitude"
            >
              <Input
                value={draft.longitude ?? ""}
                type="number"
                step="any"
                onChange={(e) =>
                  setDraft({
                    longitude: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Default Zoom" description="Initial map zoom level">
              <Input
                value={draft.zoom ?? ""}
                type="number"
                min={1}
                max={22}
                onChange={(e) =>
                  setDraft({
                    zoom: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="12"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="Map Layer"
              description="Default map tile provider identifier"
            >
              <Input
                value={draft.map ?? ""}
                onChange={(e) => setDraft({ map: e.target.value })}
                placeholder="Default"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="Custom Map URL"
              description="Custom tile server URL template"
            >
              <Input
                value={draft.mapUrl ?? ""}
                onChange={(e) => setDraft({ mapUrl: e.target.value })}
                placeholder="https://…/{z}/{x}/{y}.png"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="Bing Maps Key"
              description="API key used when Bing is selected as the map provider"
            >
              <Input
                value={draft.bingKey ?? ""}
                onChange={(e) => setDraft({ bingKey: e.target.value })}
                placeholder="Bing Maps API key"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow
              label="POI Layer"
              description="External point-of-interest layer configuration"
            >
              <Input
                value={draft.poiLayer ?? ""}
                onChange={(e) => setDraft({ poiLayer: e.target.value })}
                placeholder="POI layer URL or config"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Access control section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Access Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label="Allow Registration"
              description="Allow new users to self-register"
              checked={!!draft.registration}
              onChange={(v) => setDraft({ registration: v })}
              disabled={saving || !!isReadonly}
            />
            <ToggleRow
              label="Read-only Mode"
              description="Only admins can modify server-wide settings"
              checked={!!draft.readonly}
              onChange={(v) => setDraft({ readonly: v })}
              disabled={saving || !!isReadonly}
            />
            <ToggleRow
              label="Device Read-only"
              description="Disallow device attribute changes for non-admins"
              checked={!!draft.deviceReadonly}
              onChange={(v) => setDraft({ deviceReadonly: v })}
              disabled={saving || !!isReadonly}
            />
            <ToggleRow
              label="Limit Commands"
              description="Restrict command execution to supported protocol commands"
              checked={!!draft.limitCommands}
              onChange={(v) => setDraft({ limitCommands: v })}
              disabled={saving || !!isReadonly}
            />
            <ToggleRow
              label="Force Settings"
              description="Force users to use server-wide settings"
              checked={!!draft.forceSettings}
              onChange={(v) => setDraft({ forceSettings: v })}
              disabled={saving || !!isReadonly}
            />
            <ToggleRow
              label="Force OpenID"
              description="Require OpenID authentication for all users"
              checked={!!draft.openIdForce}
              onChange={(v) => setDraft({ openIdForce: v })}
              disabled={saving || !!isReadonly || !data.openIdEnabled}
            />
            {data.openIdEnabled !== undefined && (
              <p className="pl-7 text-[11px] text-muted-foreground">
                OpenID is{" "}
                <span
                  className={
                    data.openIdEnabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : ""
                  }
                >
                  {data.openIdEnabled ? "enabled" : "not configured"}
                </span>{" "}
                on this server.
              </p>
            )}
          </CardContent>
        </Card>

        {isReadonly ? (
          <p className="text-xs text-muted-foreground">
            Server is in read-only mode. Only administrators can change
            settings.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Saved successfully
              </span>
            )}
          </div>
        )}
      </form>

      {/* Admin actions section */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Admin Actions</CardTitle>
          <CardDescription className="text-xs">
            Maintenance operations for the Traccar server process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Garbage collection */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground">
                Garbage Collection
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Trigger JVM garbage collection to free unused memory.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGc}
              disabled={gcBusy}
              className="shrink-0"
            >
              {gcBusy ? "Running…" : "Run GC"}
            </Button>
          </div>

          {/* Cache diagnostics */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Cache Diagnostics
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Fetch internal cache statistics from the server.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchCache}
                disabled={cacheBusy}
                className="shrink-0"
              >
                {cacheBusy ? "Fetching…" : "Fetch"}
              </Button>
            </div>
            {cacheText && (
              <ScrollArea className="h-48 rounded-md border border-border/50 bg-muted/40">
                <pre className="p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {cacheText}
                </pre>
              </ScrollArea>
            )}
          </div>

          {/* Reboot */}
          <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-4">
            <div>
              <p className="text-xs font-medium text-destructive">
                Reboot Server
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Restart the Traccar server process. The server will be briefly
                unavailable.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReboot}
              disabled={rebootBusy}
              className="shrink-0"
            >
              {rebootBusy ? "Rebooting…" : "Reboot"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Devices tab ───────────────────────────────────────────────────────────────

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

type DevicesTabState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded"
      devices: TraccarDevice[]
    }

function DevicesTab({
  connectionForm,
  onDeviceUpdate,
}: {
  connectionForm: ConnectionForm
  onDeviceUpdate?: () => void
}) {
  const [state, setState] = useState<DevicesTabState>({ status: "loading" })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<TraccarDevice | null>(null)

  function loadDevices() {
    setState({ status: "loading" })
    const config = toConfig(connectionForm)
    getDevices(config)
      .then((devices) => {
        setState({
          status: "loaded",
          devices,
        })
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message: String(err instanceof Error ? err.message : err),
        })
      })
  }

  useEffect(() => {
    loadDevices()
  }, [connectionForm])

  function handleDeviceAdded() {
    setIsAddDialogOpen(false)
    loadDevices()
  }

  function handleDeviceUpdated() {
    setEditingDevice(null)
    loadDevices()
    onDeviceUpdate?.()
  }

  if (state.status === "loading") {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Loading devices…
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.message}
        </div>
      </div>
    )
  }

  const { devices } = state

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Devices</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Manage devices registered on your Traccar server.
        </p>
      </div>

      {devices.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="mb-4 size-12 text-muted-foreground/30" />
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              No devices found
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Add your first device to start tracking
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4" />
              Add Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {devices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.category)
                return (
                  <button
                    key={device.id}
                    onClick={() => setEditingDevice(device)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <DeviceIcon className="size-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {device.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{device.uniqueId}</span>
                          {device.category && (
                            <>
                              <span>•</span>
                              <span className="capitalize">
                                {device.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {device.status && (
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            device.status === "online"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : device.status === "offline"
                                ? "bg-muted text-muted-foreground"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {device.status}
                        </span>
                      )}
                      {device.disabled && (
                        <span className="rounded bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                          Disabled
                        </span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      {devices.length > 0 && (
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="fixed right-8 bottom-8 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          aria-label="Add device"
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* Add Device Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="flex max-w-lg flex-col gap-0">
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>
              Enter device information to register it with your tracking server.
            </DialogDescription>
          </DialogHeader>
          <DeviceForm
            connectionForm={connectionForm}
            onSuccess={handleDeviceAdded}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog
        open={!!editingDevice}
        onOpenChange={(open) => !open && setEditingDevice(null)}
      >
        <DialogContent className="flex max-w-lg flex-col gap-0 bg-background">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information and settings.
            </DialogDescription>
          </DialogHeader>
          {editingDevice && (
            <DeviceForm
              connectionForm={connectionForm}
              device={editingDevice}
              onSuccess={handleDeviceUpdated}
              onCancel={() => setEditingDevice(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Device Form (Add/Edit) ───────────────────────────────────────────────────

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

function DeviceForm({
  connectionForm,
  device,
  onSuccess,
  onCancel,
}: {
  connectionForm: ConnectionForm
  device?: TraccarDevice
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, setState] = useState<DeviceFormState>({ status: "loading" })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUploadState, setImageUploadState] = useState<{
    status: "idle" | "uploading" | "error" | "success"
    message?: string
  }>({ status: "idle" })
  const isEditing = !!device

  useEffect(() => {
    const config = toConfig(connectionForm)
    getGroups(config)
      .then((groups) => {
        setState({
          status: "loaded",
          groups,
          form: device ?? {
            id: 0,
            name: "",
            uniqueId: "",
          },
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
    setImageFile(null)
    setImageUploadState({ status: "idle" })
  }, [
    connectionForm.serverUrl,
    connectionForm.authMode,
    connectionForm.activeToken,
    connectionForm.token,
    device?.id,
  ])

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
  const imageFilename =
    typeof form.attributes?.deviceImage === "string"
      ? form.attributes.deviceImage
      : ""
  const DeviceIcon = getDeviceIcon(form.category)

  function deviceImageUrl(uniqueId: string, filename: string) {
    return `/api/media/${uniqueId}/${filename}`
  }

  function setForm(patch: Partial<typeof form>) {
    setState((prev) => {
      if (prev.status !== "loaded") return prev
      return { ...prev, form: { ...prev.form, ...patch } }
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      const config = toConfig(connectionForm)

      if (isEditing) {
        await updateDevice(config, form.id, form)
      } else {
        const deviceData: Omit<TraccarDevice, "id"> = {
          name: form.name,
          uniqueId: form.uniqueId,
          ...(form.category && { category: form.category }),
          ...(form.groupId !== undefined && { groupId: form.groupId }),
          ...(form.phone && { phone: form.phone }),
          ...(form.model && { model: form.model }),
          ...(form.contact && { contact: form.contact }),
          ...(form.disabled !== undefined && { disabled: form.disabled }),
          ...(form.attributes &&
            Object.keys(form.attributes).length > 0 && {
              attributes: form.attributes,
            }),
        }
        const newDevice = await createDevice(config, deviceData)

        if (imageFile) {
          try {
            setImageUploadState({ status: "uploading" })
            const filename = await uploadDeviceImage(
              config,
              newDevice.id,
              imageFile
            )
            const attr = filename || imageFile.name
            await updateDevice(config, newDevice.id, {
              ...newDevice,
              attributes: {
                ...(newDevice.attributes ?? {}),
                deviceImage: attr,
              },
            })
            setImageUploadState({ status: "success" })
          } catch {
            setImageUploadState({
              status: "error",
              message: "Device created but image upload failed.",
            })
          }
        }
      }
      onSuccess()
    } catch (err: unknown) {
      setState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  async function handleDelete() {
    if (!isEditing || state.status !== "loaded") return
    if (!confirm(`Delete device "${form.name}"? This action cannot be undone.`))
      return

    setState((prev) =>
      prev.status === "loaded" ? { ...prev, deleting: true } : prev
    )
    try {
      const config = toConfig(connectionForm)
      await deleteDevice(config, form.id)
      onSuccess()
    } catch (err: unknown) {
      setState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  function updateImageAttribute(value: string) {
    const nextAttributes = { ...(form.attributes ?? {}) } as Record<
      string,
      unknown
    >
    if (value.trim()) {
      nextAttributes.deviceImage = value.trim()
    } else {
      delete nextAttributes.deviceImage
    }
    setForm({
      attributes: Object.keys(nextAttributes).length
        ? nextAttributes
        : undefined,
    })
  }

  async function handleImageUpload() {
    if (!imageFile || !isEditing) return
    setImageUploadState({ status: "uploading" })
    try {
      const config = toConfig(connectionForm)
      const filename = await uploadDeviceImage(config, form.id, imageFile)
      updateImageAttribute(filename || imageFile.name)
      setImageUploadState({ status: "success" })
    } catch (err: unknown) {
      setImageUploadState({
        status: "error",
        message: String(err instanceof Error ? err.message : err),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-1 py-4 pr-4">
          {/* Required fields */}
          <FormField label="Name" description="Device name or identifier">
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ name: e.target.value })}
              placeholder="My Vehicle"
              required
              disabled={saving || deleting}
            />
          </FormField>

          <FormField
            label="Unique ID"
            description="IMEI, serial number, or hardware identifier"
          >
            <Input
              value={form.uniqueId ?? ""}
              onChange={(e) => setForm({ uniqueId: e.target.value })}
              placeholder="123456789012345"
              required
              disabled={saving || deleting || isEditing}
            />
          </FormField>

          <div className="border-t border-border/30 pt-3">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Optional
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Category" description="Device type for icon">
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
                      <SelectValue placeholder="No category" />
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
                </FormField>

                {groups.length > 0 && (
                  <FormField label="Group" description="Assign to a group">
                    <Select
                      value={form.groupId?.toString() ?? "none"}
                      onValueChange={(value) =>
                        setForm({
                          groupId:
                            value === "none" ? undefined : Number(value),
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
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phone" description="For SMS commands">
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ phone: e.target.value })}
                    placeholder="+1234567890"
                    type="tel"
                    disabled={saving || deleting}
                  />
                </FormField>

                <FormField label="Model" description="Device model name">
                  <Input
                    value={form.model ?? ""}
                    onChange={(e) => setForm({ model: e.target.value })}
                    placeholder="GPS Tracker Pro"
                    disabled={saving || deleting}
                  />
                </FormField>
              </div>

              <FormField label="Contact" description="Contact person or info">
                <Input
                  value={form.contact ?? ""}
                  onChange={(e) => setForm({ contact: e.target.value })}
                  placeholder="John Doe"
                  disabled={saving || deleting}
                />
              </FormField>

              <FormField
                label="Device Image"
                description={
                  isEditing
                    ? "Upload or paste existing filename"
                    : "Optional — uploaded automatically when saved"
                }
              >
                <div className="space-y-2">
                  {isEditing && (
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/40 bg-muted/40">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <DeviceIcon className="size-5" />
                        </div>
                        {imageFilename && (
                          <AuthImage
                            src={deviceImageUrl(form.uniqueId, imageFilename)}
                            alt={form.name}
                            className="absolute inset-0 z-10 size-full bg-background object-cover"
                          />
                        )}
                      </div>
                      <Input
                        value={imageFilename}
                        onChange={(e) => updateImageAttribute(e.target.value)}
                        placeholder="device-photo.jpg"
                        disabled={saving || deleting}
                        className="flex-1"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] ?? null)
                      }
                      disabled={
                        saving ||
                        deleting ||
                        imageUploadState.status === "uploading"
                      }
                      className="flex-1 text-xs"
                    />
                    {isEditing && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleImageUpload}
                          disabled={
                            saving ||
                            deleting ||
                            !imageFile ||
                            imageUploadState.status === "uploading"
                          }
                        >
                          {imageUploadState.status === "uploading"
                            ? "Uploading…"
                            : "Upload"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateImageAttribute("")}
                          disabled={saving || deleting || !imageFilename}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                  {imageUploadState.status === "error" && (
                    <p className="text-[11px] text-destructive">
                      {imageUploadState.message ?? "Upload failed"}
                    </p>
                  )}
                  {imageUploadState.status === "success" && (
                    <p className="text-[11px] text-muted-foreground">
                      {isEditing ? "Image uploaded. Save to persist." : "Image uploaded."}
                    </p>
                  )}
                </div>
              </FormField>

              <ToggleRow
                label="Disabled"
                description="Mark device as disabled"
                checked={!!form.disabled}
                onChange={(v) => setForm({ disabled: v })}
                disabled={saving || deleting}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions — always visible, outside scroll */}
      <div className="flex items-center justify-between gap-3 border-t border-border/30 px-1 pt-4">
        {isEditing ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving || deleting || !form.name || !form.uniqueId}
          >
            {saving
              ? isEditing
                ? "Saving…"
                : "Adding…"
              : isEditing
                ? "Save Changes"
                : "Add Device"}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function FormField({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  )
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 sm:grid-cols-[200px_1fr]">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-border accent-primary disabled:cursor-not-allowed"
      />
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </label>
  )
}
