export type AuthMode = "session" | "token"

export class TotpRequiredError extends Error {
  constructor() {
    super("TOTP code required")
    this.name = "TotpRequiredError"
  }
}

export type TraccarConfig = {
  serverUrl: string
  wsUrl?: string
  authMode: AuthMode
  email?: string
  password?: string
  token?: string
  code?: string
}

export type TraccarUser = {
  id: number
  name?: string
  email?: string
  administrator?: boolean
}

export type LoginResult = {
  user: TraccarUser
  token: string
}

export type TraccarDevice = {
  id: number
  name: string
  uniqueId: string
  status?: string
  disabled?: boolean
  lastUpdate?: string
  positionId?: number
  groupId?: number | null
  phone?: string | null
  model?: string | null
  contact?: string | null
  category?: string | null
  attributes?: Record<string, unknown>
}

export type TraccarPosition = {
  id: number
  deviceId: number
  latitude: number
  longitude: number
  speed?: number
  course?: number
  altitude?: number
  address?: string
  fixTime?: string
  deviceTime?: string
  serverTime?: string
  attributes?: Record<string, unknown>
}

export type TraccarEvent = {
  id: number
  deviceId: number
  type: string
  eventTime?: string
  positionId?: number
  attributes?: Record<string, unknown>
}

export type TraccarReportTrip = {
  deviceId: number
  startTime: string
  endTime: string
  distance?: number
  maxSpeed?: number
  averageSpeed?: number
  duration?: number
  startAddress?: string
  endAddress?: string
}

export type TraccarReportSummary = {
  deviceId: number
  distance?: number
  maxSpeed?: number
  averageSpeed?: number
  movingTime?: number
  engineHours?: number
}

export type TraccarServer = {
  id?: number
  registration?: boolean
  readonly?: boolean
  deviceReadonly?: boolean
  limitCommands?: boolean
  map?: string
  bingKey?: string
  mapUrl?: string
  poiLayer?: string
  announcement?: string
  latitude?: number
  longitude?: number
  zoom?: number
  version?: string
  forceSettings?: boolean
  coordinateFormat?: string
  openIdEnabled?: boolean
  openIdForce?: boolean
  attributes?: Record<string, unknown>
}

export type RealtimePayload = {
  devices?: TraccarDevice[]
  positions?: TraccarPosition[]
  events?: TraccarEvent[]
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  query?: URLSearchParams
  body?: BodyInit | null
  headers?: HeadersInit
}

function ensureProtocol(value: string, protocol: "http" | "ws") {
  if (/^https?:\/\//i.test(value) || /^wss?:\/\//i.test(value)) {
    return value
  }

  return `${protocol}://${value}`
}

function normalizeServerUrl(value: string) {
  const withProtocol = ensureProtocol(value.trim(), "http")
  const url = new URL(withProtocol)

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/api"
  }

  return trimTrailingSlash(url.toString())
}

function normalizeWsUrl(value: string, serverUrl: string) {
  if (!value.trim()) {
    return normalizeServerUrl(serverUrl)
      .replace(/^http:\/\//i, "ws://")
      .replace(/^https:\/\//i, "wss://")
      .replace(/\/api$/, "/api/socket")
  }

  const withProtocol = ensureProtocol(value.trim(), "ws")
  return trimTrailingSlash(new URL(withProtocol).toString())
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

// Always attach bearer token if available — no cookie auth.
function createHeaders(config: TraccarConfig, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)

  if (config.token) {
    nextHeaders.set("Authorization", `Bearer ${config.token}`)
  }

  return nextHeaders
}

async function request<T>(
  config: TraccarConfig,
  path: string,
  options: RequestOptions = {}
) {
  const url = new URL(`${normalizeServerUrl(config.serverUrl)}${path}`)
  if (options.query) {
    url.search = options.query.toString()
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    body: options.body,
    headers: createHeaders(config, options.headers),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid credentials or session expired.")
    }
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

/**
 * Login to Traccar and obtain a bearer token for all subsequent requests.
 *
 * For "session" auth (email/password):
 *   1. Use HTTP Basic Auth to call POST /session/token → returns a bearer token string.
 *   2. Use GET /session?token=<token> → returns the User object.
 *
 * For "token" auth (pre-existing API token):
 *   1. Validate via GET /session?token=<token> → returns the User object.
 */
async function login(config: TraccarConfig): Promise<LoginResult> {
  if (config.authMode === "token" && config.token) {
    // Validate the token by fetching session info
    const tokenConfig: TraccarConfig = { ...config }
    const query = new URLSearchParams({ token: config.token })
    const user = await request<TraccarUser>(tokenConfig, "/session", { query })
    return { user, token: config.token }
  }

  // Session auth: generate a bearer token using Basic Auth
  const basicCredentials = btoa(
    `${config.email ?? ""}:${config.password ?? ""}`
  )
  const serverUrl = normalizeServerUrl(config.serverUrl)

  // If a TOTP code is provided, we must first create a cookie-based session
  // via POST /session (form-encoded) since Basic Auth alone can't carry the
  // TOTP code to the /session/token endpoint.
  if (config.code) {
    const params = new URLSearchParams()
    params.set("email", config.email ?? "")
    params.set("password", config.password ?? "")
    params.set("code", config.code)
    const sessionResponse = await fetch(new URL(`${serverUrl}/session`), {
      method: "POST",
      body: params,
      credentials: "include",
    })

    if (!sessionResponse.ok) {
      if (sessionResponse.status === 401) {
        // If server still asks for TOTP, the code was wrong
        if (sessionResponse.headers.get("WWW-Authenticate") === "TOTP") {
          throw new Error("Invalid TOTP code.")
        }
        throw new Error("Invalid email or password.")
      }
      const message = await sessionResponse.text()
      throw new Error(
        message || `Login failed with status ${sessionResponse.status}`
      )
    }

    const user = (await sessionResponse.json()) as TraccarUser

    // Now generate a bearer token using the established session cookie
    const tokenUrl = new URL(`${serverUrl}/session/token`)
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      body: new URLSearchParams(),
      credentials: "include",
    })

    if (!tokenResponse.ok) {
      // Token generation failed, but session is valid — fall back to
      // cookie-only mode by using the email as a pseudo-token identifier.
      // This won't work for WebSocket auth, but at least the user is in.
      throw new Error("Session created but failed to generate bearer token.")
    }

    const rawToken = await tokenResponse.text()
    if (!rawToken || rawToken.trim().length === 0) {
      throw new Error("Server returned an empty token.")
    }

    return { user, token: rawToken.trim() }
  }

  // Step 1: POST /session/token with Basic Auth to get a bearer token
  const tokenUrl = new URL(`${serverUrl}/session/token`)
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(),
  })

  if (!tokenResponse.ok) {
    if (tokenResponse.status === 401) {
      // Check if server is requesting a TOTP code
      if (tokenResponse.headers.get("WWW-Authenticate") === "TOTP") {
        throw new TotpRequiredError()
      }
      throw new Error("Invalid email or password.")
    }
    const message = await tokenResponse.text()
    throw new Error(
      message || `Login failed with status ${tokenResponse.status}`
    )
  }

  const token = await tokenResponse.text()

  if (!token || token.trim().length === 0) {
    throw new Error("Server returned an empty token.")
  }

  const activeToken = token.trim()

  // Step 2: GET /session?token=<token> to retrieve user info
  const sessionUrl = new URL(`${serverUrl}/session`)
  sessionUrl.searchParams.set("token", activeToken)
  const sessionResponse = await fetch(sessionUrl, {
    method: "GET",
  })

  if (!sessionResponse.ok) {
    throw new Error("Failed to retrieve session after login.")
  }

  const user = (await sessionResponse.json()) as TraccarUser

  return { user, token: activeToken }
}

/**
 * Revoke a bearer token via POST /session/token/revoke.
 * Best-effort — errors are swallowed by the caller.
 */
async function revokeToken(config: TraccarConfig) {
  if (!config.token) return

  const serverUrl = normalizeServerUrl(config.serverUrl)
  const url = new URL(`${serverUrl}/session/token/revoke`)

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token: config.token }),
  })
}

function getSession(config: TraccarConfig) {
  return request<TraccarUser>(config, "/session")
}

function logout(config: TraccarConfig) {
  return request<string>(config, "/session", { method: "DELETE" })
}

function getDevices(config: TraccarConfig) {
  return request<TraccarDevice[]>(config, "/devices")
}

function createDevice(config: TraccarConfig, device: Omit<TraccarDevice, "id">) {
  return request<TraccarDevice>(config, "/devices", {
    method: "POST",
    body: JSON.stringify(device),
    headers: { "Content-Type": "application/json" },
  })
}

function updateDevice(config: TraccarConfig, id: number, device: TraccarDevice) {
  return request<TraccarDevice>(config, `/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(device),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteDevice(config: TraccarConfig, id: number) {
  return request<void>(config, `/devices/${id}`, {
    method: "DELETE",
  })
}

export type TraccarGroup = {
  id: number
  name: string
  groupId?: number
  attributes?: Record<string, unknown>
}

function getGroups(config: TraccarConfig) {
  return request<TraccarGroup[]>(config, "/groups")
}

export type TraccarCalendar = {
  id: number
  name: string
  data?: string
  attributes?: Record<string, unknown>
}

function getCalendars(config: TraccarConfig) {
  return request<TraccarCalendar[]>(config, "/calendars")
}

function getPositions(config: TraccarConfig) {
  return request<TraccarPosition[]>(config, "/positions")
}

function getPositionHistory(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({ deviceId: String(deviceId), from, to })
  return request<TraccarPosition[]>(config, "/positions", { query })
}

function getRouteReport(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })

  return request<TraccarPosition[]>(config, "/reports/route", { query })
}

function getTripReport(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })

  return request<TraccarReportTrip[]>(config, "/reports/trips", { query })
}

function getSummaryReport(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })

  return request<TraccarReportSummary[]>(config, "/reports/summary", { query })
}

function getEvents(
  config: TraccarConfig,
  deviceId: number,
  from: string,
  to: string
) {
  const query = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })

  return request<TraccarEvent[]>(config, "/reports/events", { query })
}

function getServer(config: TraccarConfig) {
  return request<TraccarServer>(config, "/server")
}

function updateServer(config: TraccarConfig, data: TraccarServer) {
  return request<TraccarServer>(config, "/server", {
    method: "PUT" as const,
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  })
}

function getServerTimezones(config: TraccarConfig) {
  return request<string[]>(config, "/server/timezones")
}

function getServerCache(config: TraccarConfig) {
  return request<string>(config, "/server/cache")
}

function triggerServerGc(config: TraccarConfig) {
  return request<void>(config, "/server/gc")
}

function rebootServer(config: TraccarConfig) {
  return request<void>(config, "/server/reboot", { method: "POST" })
}

function toRealtimeUrl(config: TraccarConfig) {
  const url = new URL(normalizeWsUrl(config.wsUrl ?? "", config.serverUrl))

  // Browsers can't attach Authorization headers to WebSocket requests,
  // so token auth needs to flow through the URL when the server supports it.
  if (config.token) {
    url.searchParams.set("token", config.token)
  }

  return url.toString()
}

function parseRealtimePayload(raw: string): RealtimePayload {
  const parsed = JSON.parse(raw) as
    | RealtimePayload
    | TraccarPosition[]
    | TraccarDevice[]

  if (Array.isArray(parsed)) {
    const firstItem = parsed.at(0)
    if (firstItem && "deviceId" in firstItem) {
      return { positions: parsed as TraccarPosition[] }
    }

    return { devices: parsed as TraccarDevice[] }
  }

  return parsed
}

export {
  createDevice,
  deleteDevice,
  getCalendars,
  getDevices,
  getEvents,
  getGroups,
  getPositionHistory,
  getPositions,
  getRouteReport,
  getServer,
  getServerCache,
  getServerTimezones,
  getSession,
  getSummaryReport,
  getTripReport,
  login,
  logout,
  normalizeServerUrl,
  normalizeWsUrl,
  parseRealtimePayload,
  rebootServer,
  revokeToken,
  toRealtimeUrl,
  triggerServerGc,
  updateDevice,
  updateServer,
}
