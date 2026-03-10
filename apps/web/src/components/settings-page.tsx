import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
  Server,
  ShieldCheck,
} from "@/components/icons"
import { readStoredConfig, toConfig, type ConnectionForm } from "@/lib/config"
import { getServer, updateServer, type TraccarServer } from "@/lib/traccar"
import type { AuthMode } from "@/lib/traccar"
import type { ConnectionState } from "@/hooks/use-fleet"

type SettingsTab = "connection" | "server"

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
  | { status: "loaded"; data: TraccarServer; draft: TraccarServer; saving: boolean; saved: boolean }

function ServerTab({ connectionForm }: { connectionForm: ConnectionForm }) {
  const [state, setState] = useState<ServerTabState>({ status: "loading" })

  useEffect(() => {
    const config = toConfig(connectionForm)
    getServer(config)
      .then((data) => {
        setState({ status: "loaded", data, draft: { ...data }, saving: false, saved: false })
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

  const { data, draft, saving, saved } = state

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
      setState({ status: "loaded", data: updated, draft: { ...updated }, saving: false, saved: true })
    } catch (err: unknown) {
      setState((prev) =>
        prev.status === "loaded" ? { ...prev, saving: false } : prev
      )
      setState({ status: "error", message: String(err instanceof Error ? err.message : err) })
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
    </div>
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
