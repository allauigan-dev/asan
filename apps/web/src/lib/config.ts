import {
  normalizeServerUrl,
  normalizeWsUrl,
  type AuthMode,
  type TraccarConfig,
} from "@/lib/traccar"

export const STORAGE_KEY = "asan.traccar.config"

export type ConnectionForm = {
  serverUrl: string
  authMode: AuthMode
  email: string
  password: string
  token: string
  /** TOTP code for two-factor authentication. */
  code: string
  /** Bearer token obtained after login — used for all API requests. */
  activeToken: string
}

const emptyForm: ConnectionForm = {
  serverUrl: "",
  authMode: "session",
  email: "",
  password: "",
  token: "",
  code: "",
  activeToken: "",
}

export function readStoredConfig(): ConnectionForm {
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as ConnectionForm
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { ...emptyForm }
}

export function saveConfig(config: ConnectionForm) {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // Ignore storage errors
    }
  }
}

export function clearConfig() {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Convert the form into a TraccarConfig suitable for API calls.
 * Always uses the activeToken (obtained during login) as the bearer token.
 */
export function toConfig(form: ConnectionForm): TraccarConfig {
  const serverUrl = normalizeServerUrl(form.serverUrl)
  return {
    serverUrl,
    wsUrl: normalizeWsUrl("", form.serverUrl),
    authMode: form.authMode,
    email: form.email.trim(),
    password: form.password,
    token: form.activeToken || form.token.trim(),
    code: form.code.trim() || undefined,
  }
}

export function hasStoredConnection(): boolean {
  const config = readStoredConfig()
  if (!config.serverUrl) {
    return false
  }
  // If we have an active token from a previous login, we can reconnect
  if (config.activeToken) {
    return true
  }
  if (config.authMode === "token" && config.token) {
    return true
  }
  if (config.authMode === "session" && config.email) {
    return true
  }
  return false
}
