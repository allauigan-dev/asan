import { useState, type FormEvent } from "react"

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

import { ShieldCheck, X } from "@/components/icons"
import { readStoredConfig, type ConnectionForm } from "@/lib/config"
import type { AuthMode } from "@/lib/traccar"
import type { ConnectionState } from "@/hooks/use-fleet"

type SettingsPageProps = {
  connectionState: ConnectionState
  connectionError: string
  onConnect: (form: ConnectionForm) => void
  onClose: () => void
}

export function SettingsPage({
  connectionState,
  connectionError,
  onConnect,
  onClose,
}: SettingsPageProps) {
  const [form, setForm] = useState<ConnectionForm>(() => readStoredConfig())

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConnect(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md border border-border/70 bg-card shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
          <CardTitle>Traccar Connection</CardTitle>
          <CardDescription>
            Configure your Traccar server connection. This UI wraps the REST API
            and websocket stream.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3">
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
                placeholder="https://your-traccar-server.com/api"
              />

              <label className="text-xs font-medium text-muted-foreground">
                WebSocket URL
              </label>
              <Input
                value={form.wsUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    wsUrl: event.target.value,
                  }))
                }
                placeholder="wss://your-traccar-server.com/api/socket (auto-derived if blank)"
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auth mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Session login</SelectItem>
                  <SelectItem value="token">Bearer token</SelectItem>
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
                />
              )}
            </div>

            <Button
              className="w-full"
              disabled={connectionState === "connecting"}
            >
              <ShieldCheck className="size-4" />
              {connectionState === "connecting"
                ? "Connecting..."
                : "Connect to Traccar"}
            </Button>
            {connectionError ? (
              <p className="text-xs text-destructive">{connectionError}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
