import { useEffect, useState, type FormEvent } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Server,
  ShieldCheck,
  Truck,
} from "@/components/icons"
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
  type TraccarDevice,
  type TraccarGroup,
  type TraccarServer,
} from "@/lib/traccar"
import type { AuthMode } from "@/lib/traccar"
import type { ConnectionState } from "@/hooks/use-fleet"

type SettingsTab = "connection" | "server" | "devices"

type SettingsPageProps = {
  connectionState: ConnectionState
  connectionError: string
  onConnect: (form: ConnectionForm) => void
  onClose?: () => void
  /** When true, renders as a standalone login screen (no nav chrome) */
  loginMode?: boolean
}

export function SettingsPage({
  connectionState,
  connectionError,
  onConnect,
  onClose,
  loginMode = false,
}: SettingsPageProps) {
  const [form, setForm] = useState<ConnectionForm>(() => readStoredConfig())
  const [activeTab, setActiveTab] = useState<SettingsTab>("connection")

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
            icon={<ShieldCheck className="size-4" />}
            label="Connection"
            active={activeTab === "connection"}
            onClick={() => setActiveTab("connection")}
          />
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
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/20 p-6">
        {activeTab === "connection" && (
          <ConnectionTab
            form={form}
            setForm={setForm}
            isConnecting={isConnecting}
            isTotpRequired={isTotpRequired}
            connectionError={connectionError}
            connectionState={connectionState}
            onSubmit={handleSubmit}
          />
        )}
        {activeTab === "server" && isConnected && (
          <ServerTab connectionForm={form} />
        )}
        {activeTab === "devices" && isConnected && (
          <DevicesTab connectionForm={form} />
        )}
      </div>
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

// ── Connection tab ─────────────────────────────────────────────────────────────

function ConnectionTab({
  form,
  setForm,
  isConnecting,
  isTotpRequired,
  connectionError,
  connectionState,
  onSubmit,
}: {
  form: ConnectionForm
  setForm: React.Dispatch<React.SetStateAction<ConnectionForm>>
  isConnecting: boolean
  isTotpRequired: boolean
  connectionError: string
  connectionState: ConnectionState
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  const isConnected = connectionState === "connected"

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Connection</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isTotpRequired
            ? "Enter the verification code from your authenticator app."
            : "Configure your Traccar server URL and credentials."}
        </p>
      </div>

      {isConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5 shrink-0" />
          Connected to {form.serverUrl}
        </div>
      )}

      <Card className="border-border/50">
        <CardContent className="pt-5">
          <ConnectionForm
            form={form}
            setForm={setForm}
            isConnecting={isConnecting}
            isTotpRequired={isTotpRequired}
            connectionError={connectionError}
            onSubmit={onSubmit}
            submitLabel={isConnected ? "Reconnect" : undefined}
          />
        </CardContent>
      </Card>
    </div>
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
            autoFocus
          />
        ) : (
          <>
            <label className="text-xs font-medium text-muted-foreground">
              Server URL
            </label>
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
              autoFocus
            />

            <label className="text-xs font-medium text-muted-foreground">
              Authentication
            </label>
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auth mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">Email & Password</SelectItem>
                <SelectItem value="token">API Token</SelectItem>
              </SelectContent>
            </Select>

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
        setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
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

  const { data, draft, saving, saved, gcBusy, rebootBusy, cacheText, cacheBusy } = state

  function setDraft(patch: Partial<TraccarServer>) {
    setState((prev) => {
      if (prev.status !== "loaded") return prev
      return { ...prev, draft: { ...prev.draft, ...patch }, saved: false }
    })
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.status !== "loaded") return
    setState((prev) => (prev.status === "loaded" ? { ...prev, saving: true, saved: false } : prev))
    try {
      const config = toConfig(connectionForm)
      const updated = await updateServer(config, draft)
      setState((prev) =>
        prev.status === "loaded"
          ? { ...prev, data: updated, draft: { ...updated }, saving: false, saved: true }
          : prev
      )
    } catch (err: unknown) {
      setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
    }
  }

  async function handleGc() {
    setState((prev) => (prev.status === "loaded" ? { ...prev, gcBusy: true } : prev))
    try {
      const config = toConfig(connectionForm)
      await triggerServerGc(config)
    } finally {
      setState((prev) => (prev.status === "loaded" ? { ...prev, gcBusy: false } : prev))
    }
  }

  async function handleFetchCache() {
    setState((prev) => (prev.status === "loaded" ? { ...prev, cacheBusy: true, cacheText: null } : prev))
    try {
      const config = toConfig(connectionForm)
      const text = await getServerCache(config)
      setState((prev) => (prev.status === "loaded" ? { ...prev, cacheBusy: false, cacheText: String(text) } : prev))
    } catch (err: unknown) {
      setState((prev) =>
        prev.status === "loaded"
          ? { ...prev, cacheBusy: false, cacheText: `Error: ${err instanceof Error ? err.message : String(err)}` }
          : prev
      )
    }
  }

  async function handleReboot() {
    if (!confirm("Reboot the Traccar server process? It will be briefly unavailable.")) return
    setState((prev) => (prev.status === "loaded" ? { ...prev, rebootBusy: true } : prev))
    try {
      const config = toConfig(connectionForm)
      await rebootServer(config)
    } finally {
      setState((prev) => (prev.status === "loaded" ? { ...prev, rebootBusy: false } : prev))
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
            <FieldRow label="Announcement" description="Message shown to all users in the web UI">
              <Input
                value={draft.announcement ?? ""}
                onChange={(e) => setDraft({ announcement: e.target.value })}
                placeholder="No announcement"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Coordinate Format" description="Default format for displaying coordinates">
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
            <FieldRow label="Default Latitude" description="Initial map center latitude">
              <Input
                value={draft.latitude ?? ""}
                type="number"
                step="any"
                onChange={(e) => setDraft({ latitude: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Default Longitude" description="Initial map center longitude">
              <Input
                value={draft.longitude ?? ""}
                type="number"
                step="any"
                onChange={(e) => setDraft({ longitude: e.target.value ? Number(e.target.value) : undefined })}
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
                onChange={(e) => setDraft({ zoom: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="12"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Map Layer" description="Default map tile provider identifier">
              <Input
                value={draft.map ?? ""}
                onChange={(e) => setDraft({ map: e.target.value })}
                placeholder="Default"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Custom Map URL" description="Custom tile server URL template">
              <Input
                value={draft.mapUrl ?? ""}
                onChange={(e) => setDraft({ mapUrl: e.target.value })}
                placeholder="https://…/{z}/{x}/{y}.png"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="Bing Maps Key" description="API key used when Bing is selected as the map provider">
              <Input
                value={draft.bingKey ?? ""}
                onChange={(e) => setDraft({ bingKey: e.target.value })}
                placeholder="Bing Maps API key"
                disabled={saving || !!isReadonly}
              />
            </FieldRow>
            <FieldRow label="POI Layer" description="External point-of-interest layer configuration">
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
                <span className={data.openIdEnabled ? "text-emerald-600 dark:text-emerald-400" : ""}>
                  {data.openIdEnabled ? "enabled" : "not configured"}
                </span>{" "}
                on this server.
              </p>
            )}
          </CardContent>
        </Card>

        {isReadonly ? (
          <p className="text-xs text-muted-foreground">
            Server is in read-only mode. Only administrators can change settings.
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
              <p className="text-xs font-medium text-foreground">Garbage Collection</p>
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
                <p className="text-xs font-medium text-foreground">Cache Diagnostics</p>
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
              <pre className="max-h-48 overflow-auto rounded-md border border-border/50 bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {cacheText}
              </pre>
            )}
          </div>

          {/* Reboot */}
          <div className="flex items-start justify-between gap-4 border-t border-border/40 pt-4">
            <div>
              <p className="text-xs font-medium text-destructive">Reboot Server</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Restart the Traccar server process. The server will be briefly unavailable.
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

function DevicesTab({ connectionForm }: { connectionForm: ConnectionForm }) {
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
        setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
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
            <Truck className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No devices found</p>
            <p className="text-xs text-muted-foreground mb-4">
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
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <DeviceIcon className="size-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {device.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{device.uniqueId}</span>
                          {device.category && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{device.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {device.status && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
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
                      <span className="text-xs font-medium px-2 py-1 rounded bg-destructive/10 text-destructive">
                        Disabled
                      </span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              )})}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      {devices.length > 0 && (
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="fixed bottom-8 right-8 size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-40"
          aria-label="Add device"
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* Add Device Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
      <Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
      })
  }, [connectionForm, device])

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state.status !== "loaded") return

    if (!form.name || !form.uniqueId) {
      setState({ status: "error", message: "Name and Unique ID are required" })
      return
    }

    setState((prev) => (prev.status === "loaded" ? { ...prev, saving: true } : prev))
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
          ...(form.attributes && Object.keys(form.attributes).length > 0 && { attributes: form.attributes }),
        }
        await createDevice(config, deviceData)
      }
      onSuccess()
    } catch (err: unknown) {
      setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
    }
  }

  async function handleDelete() {
    if (!isEditing || state.status !== "loaded") return
    if (!confirm(`Delete device "${form.name}"? This action cannot be undone.`)) return

    setState((prev) => (prev.status === "loaded" ? { ...prev, deleting: true } : prev))
    try {
      const config = toConfig(connectionForm)
      await deleteDevice(config, form.id)
      onSuccess()
    } catch (err: unknown) {
      setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Required fields */}
      <div className="space-y-4">
        <FieldRow label="Name" description="Device name or identifier (required)">
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ name: e.target.value })}
            placeholder="My Vehicle"
            required
            disabled={saving || deleting}
            autoFocus
          />
        </FieldRow>
        <FieldRow label="Unique ID" description="Device hardware identifier (IMEI, serial number, etc.) (required)">
          <Input
            value={form.uniqueId ?? ""}
            onChange={(e) => setForm({ uniqueId: e.target.value })}
            placeholder="123456789012345"
            required
            disabled={saving || deleting || isEditing}
          />
        </FieldRow>
      </div>

      {/* Optional fields */}
      <div className="space-y-4 border-t border-border/30 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Optional Information</p>

        <FieldRow label="Category" description="Device type for map icon">
          <Select
            value={form.category ?? "none"}
            onValueChange={(value) => setForm({
              category: value === "none" ? undefined : value
            })}
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
        </FieldRow>

        {groups.length > 0 && (
          <FieldRow label="Group" description="Associate device with a group">
            <Select
              value={form.groupId?.toString() ?? "none"}
              onValueChange={(value) => setForm({
                groupId: value === "none" ? undefined : Number(value)
              })}
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
          </FieldRow>
        )}

        <FieldRow label="Phone Number" description="Contact phone number for SMS commands">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ phone: e.target.value })}
            placeholder="+1234567890"
            type="tel"
            disabled={saving || deleting}
          />
        </FieldRow>

        <FieldRow label="Model" description="Device model name">
          <Input
            value={form.model ?? ""}
            onChange={(e) => setForm({ model: e.target.value })}
            placeholder="GPS Tracker Pro"
            disabled={saving || deleting}
          />
        </FieldRow>

        <FieldRow label="Contact" description="Contact person or information">
          <Input
            value={form.contact ?? ""}
            onChange={(e) => setForm({ contact: e.target.value })}
            placeholder="John Doe"
            disabled={saving || deleting}
          />
        </FieldRow>

        <ToggleRow
          label="Disabled"
          description="Mark device as disabled (typically for administrators)"
          checked={!!form.disabled}
          onChange={(v) => setForm({ disabled: v })}
          disabled={saving || deleting}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
        {isEditing ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Deleting…" : "Delete Device"}
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving || deleting}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || deleting || !form.name || !form.uniqueId}>
            <Plus className="size-4" />
            {saving ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save Changes" : "Add Device")}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

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
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
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
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
    </label>
  )
}
