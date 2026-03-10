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
  onClose?: () => void
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

  const isConnecting = connectionState === "connecting"
  const isTotpRequired = connectionState === "totp_required"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md border border-border/70 bg-card shadow-2xl">
        <CardHeader className="relative">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          )}
          <CardTitle>
            {onClose ? "Traccar Connection" : "Login to ASAN"}
          </CardTitle>
          <CardDescription>
            {isTotpRequired
              ? "Enter the verification code from your authenticator app."
              : "Enter your Traccar server URL and credentials to connect."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
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
                  : "Connect"}
            </Button>
            {connectionError && !isTotpRequired ? (
              <p className="text-xs text-destructive">{connectionError}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
