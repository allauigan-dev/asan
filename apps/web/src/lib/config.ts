import {
  normalizeServerUrl,
  normalizeWsUrl,
  type AuthMode,
  type TraccarConfig,
} from "@/lib/traccar"

const ENV_SERVER_URL = import.meta.env.DEV
  ? typeof window !== "undefined"
    ? window.location.origin
    : ""
  : import.meta.env.VITE_TRACCAR_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "")
const ENV_WS_URL = import.meta.env.VITE_TRACCAR_WS_URL?.trim() || ""
const ENV_TOKEN = import.meta.env.VITE_TRACCAR_TOKEN?.trim() || ""
const ENV_EMAIL = import.meta.env.VITE_TRACCAR_EMAIL?.trim() || ""
const ENV_PASSWORD = import.meta.env.VITE_TRACCAR_PASSWORD?.trim() || ""

export const STORAGE_KEY = "asan.traccar.config"

export type ConnectionForm = {
  serverUrl: string
  wsUrl: string
  authMode: AuthMode
  email: string
  password: string
  token: string
}

export function readStoredConfig(): ConnectionForm {
  return {
    serverUrl: ENV_SERVER_URL,
    wsUrl: ENV_WS_URL,
    authMode: ENV_EMAIL && ENV_PASSWORD ? "session" : "token",
    email: ENV_EMAIL,
    password: ENV_PASSWORD,
    token: ENV_TOKEN,
  }
}

export function saveConfig(_config: ConnectionForm) {
  // Disabled local storage to strictly use .env
}

export function toConfig(form: ConnectionForm): TraccarConfig {
  return {
    serverUrl: normalizeServerUrl(form.serverUrl),
    wsUrl: normalizeWsUrl(form.wsUrl, form.serverUrl),
    authMode: form.authMode,
    email: form.email.trim(),
    password: form.password,
    token: form.token.trim(),
  }
}

export function hasStoredConnection(): boolean {
  const config = readStoredConfig()
  if (config.authMode === "token" && config.token) {
    return true
  }
  if (config.serverUrl && config.email) {
    return true
  }
  return false
}

export { ENV_TOKEN }
