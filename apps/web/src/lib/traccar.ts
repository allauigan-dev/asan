export type AuthMode = "session" | "token"

export class TotpRequiredError extends Error {
  constructor() {
    super("TOTP code required")
    this.name = "TotpRequiredError"
  }
}

// ── Simple cache mechanism ────────────────────────────────────────────────────

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCacheKey(config: TraccarConfig, endpoint: string): string {
  return `${config.serverUrl}:${endpoint}`
}

function getCached<T>(
  config: TraccarConfig,
  endpoint: string,
  ttlMs: number
): T | null {
  const key = getCacheKey(config, endpoint)
  const entry = cache.get(key) as CacheEntry<T> | undefined

  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > ttlMs) {
    cache.delete(key)
    return null
  }

  return entry.data
}

function setCached<T>(config: TraccarConfig, endpoint: string, data: T): void {
  const key = getCacheKey(config, endpoint)
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache(endpoint?: string): void {
  if (endpoint) {
    for (const key of cache.keys()) {
      if (key.endsWith(`:${endpoint}`)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
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

export type TraccarCommand = {
  id?: number
  deviceId?: number
  description?: string
  type: string
  textChannel?: boolean
  attributes?: Record<string, unknown>
}

export type TraccarCommandType = {
  type: string
}

export type TraccarGeofence = {
  id: number
  name: string
  description?: string
  area: string
  calendarId?: number
  attributes?: Record<string, unknown>
}

export type TraccarNotification = {
  id: number
  type: string
  description?: string | null
  always?: boolean
  commandId?: number
  notificators?: string
  calendarId?: number
  attributes?: Record<string, unknown>
}

export type TraccarNotificationType = {
  type: string
}

export type TraccarDriver = {
  id: number
  name: string
  uniqueId: string
  attributes?: Record<string, unknown>
}

export type TraccarAttribute = {
  id: number
  description: string
  attribute: string
  expression: string
  type: string
}

export type TraccarMaintenance = {
  id: number
  name: string
  type: string
  start: number
  period: number
  attributes?: Record<string, unknown>
}

export type TraccarStatistics = {
  captureTime: string
  activeUsers: number
  activeDevices: number
  requests: number
  messagesReceived: number
  messagesStored: number
}

export type TraccarReportStop = {
  deviceId: number
  deviceName?: string
  duration: number
  startTime: string
  endTime: string
  address?: string
  lat: number
  lon: number
  spentFuel?: number
  engineHours?: number
}

export type TraccarReportGeofence = {
  deviceId: number
  deviceName?: string
  geofenceId: number
  startTime: string
  endTime: string
}

export type TraccarPermission = {
  userId?: number
  deviceId?: number
  groupId?: number
  geofenceId?: number
  notificationId?: number
  calendarId?: number
  attributeId?: number
  driverId?: number
  managedUserId?: number
  commandId?: number
  maintenanceId?: number
  orderId?: number
}

export type TraccarDeviceAccumulators = {
  deviceId: number
  totalDistance?: number
  hours?: number
}

export type TraccarFullUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  readonly?: boolean
  administrator?: boolean
  disabled?: boolean
  expirationTime?: string | null
  deviceLimit?: number
  userLimit?: number
  deviceReadonly?: boolean
  limitCommands?: boolean
  password?: string
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
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
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

async function getDevices(config: TraccarConfig) {
  const CACHE_TTL = 30 * 1000 // 30 seconds (devices update frequently)
  const cached = getCached<TraccarDevice[]>(config, "/devices", CACHE_TTL)
  if (cached) return cached

  const devices = await request<TraccarDevice[]>(config, "/devices")
  setCached(config, "/devices", devices)
  return devices
}

function geocode(config: TraccarConfig, latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  })
  return request<string>(config, `/server/geocode?${params}`)
}

async function createDevice(
  config: TraccarConfig,
  device: Omit<TraccarDevice, "id">
) {
  const result = await request<TraccarDevice>(config, "/devices", {
    method: "POST",
    body: JSON.stringify(device),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/devices")
  return result
}

async function updateDevice(
  config: TraccarConfig,
  id: number,
  device: TraccarDevice
) {
  const result = await request<TraccarDevice>(config, `/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(device),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/devices")
  return result
}

async function deleteDevice(config: TraccarConfig, id: number) {
  await request<void>(config, `/devices/${id}`, {
    method: "DELETE",
  })
  clearCache("/devices")
}

async function uploadDeviceImage(
  config: TraccarConfig,
  id: number,
  imageFile: File
): Promise<string> {
  const url = new URL(
    `${normalizeServerUrl(config.serverUrl)}/devices/${id}/image`
  )

  const response = await fetch(url, {
    method: "POST",
    body: imageFile,
    headers: createHeaders(config, {
      "Content-Type": imageFile.type || "image/*",
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid credentials or session expired.")
    }
    if (response.status === 400) {
      throw new Error("Invalid image type or size.")
    }
    if (response.status === 404) {
      throw new Error("Device not found.")
    }
    const message = await response.text()
    throw new Error(message || `Upload failed with status ${response.status}`)
  }

  return await response.text()
}

export type TraccarGroup = {
  id: number
  name: string
  groupId?: number
  attributes?: Record<string, unknown>
}

async function getGroups(config: TraccarConfig) {
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const cached = getCached<TraccarGroup[]>(config, "/groups", CACHE_TTL)
  if (cached) return cached

  const groups = await request<TraccarGroup[]>(config, "/groups")
  setCached(config, "/groups", groups)
  return groups
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

// ── Commands ──────────────────────────────────────────────────────────────────

function getCommands(config: TraccarConfig, deviceId?: number) {
  const query = deviceId
    ? new URLSearchParams({ deviceId: String(deviceId) })
    : undefined
  return request<TraccarCommand[]>(config, "/commands", { query })
}

function getSavedCommandsForDevice(config: TraccarConfig, deviceId: number) {
  const query = new URLSearchParams({ deviceId: String(deviceId) })
  return request<TraccarCommand[]>(config, "/commands/send", { query })
}

function sendCommand(config: TraccarConfig, command: TraccarCommand) {
  return request<TraccarCommand>(config, "/commands/send", {
    method: "POST",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function getCommandTypes(config: TraccarConfig, deviceId?: number) {
  const query = deviceId
    ? new URLSearchParams({ deviceId: String(deviceId) })
    : undefined
  return request<TraccarCommandType[]>(config, "/commands/types", { query })
}

function createSavedCommand(config: TraccarConfig, command: TraccarCommand) {
  return request<TraccarCommand>(config, "/commands", {
    method: "POST",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function updateSavedCommand(
  config: TraccarConfig,
  id: number,
  command: TraccarCommand
) {
  return request<TraccarCommand>(config, `/commands/${id}`, {
    method: "PUT",
    body: JSON.stringify(command),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteSavedCommand(config: TraccarConfig, id: number) {
  return request<void>(config, `/commands/${id}`, { method: "DELETE" })
}

// ── Geofences ─────────────────────────────────────────────────────────────────

function getGeofences(config: TraccarConfig) {
  return request<TraccarGeofence[]>(config, "/geofences")
}

function createGeofence(
  config: TraccarConfig,
  geofence: Omit<TraccarGeofence, "id">
) {
  return request<TraccarGeofence>(config, "/geofences", {
    method: "POST",
    body: JSON.stringify(geofence),
    headers: { "Content-Type": "application/json" },
  })
}

function updateGeofence(
  config: TraccarConfig,
  id: number,
  geofence: TraccarGeofence
) {
  return request<TraccarGeofence>(config, `/geofences/${id}`, {
    method: "PUT",
    body: JSON.stringify(geofence),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteGeofence(config: TraccarConfig, id: number) {
  return request<void>(config, `/geofences/${id}`, { method: "DELETE" })
}

function getGeofenceReport(
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
  return request<TraccarReportGeofence[]>(config, "/reports/geofences", {
    query,
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

function getNotifications(config: TraccarConfig) {
  return request<TraccarNotification[]>(config, "/notifications")
}

function createNotification(
  config: TraccarConfig,
  notification: Omit<TraccarNotification, "id">
) {
  return request<TraccarNotification>(config, "/notifications", {
    method: "POST",
    body: JSON.stringify(notification),
    headers: { "Content-Type": "application/json" },
  })
}

function updateNotification(
  config: TraccarConfig,
  id: number,
  notification: TraccarNotification
) {
  return request<TraccarNotification>(config, `/notifications/${id}`, {
    method: "PUT",
    body: JSON.stringify(notification),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteNotification(config: TraccarConfig, id: number) {
  return request<void>(config, `/notifications/${id}`, { method: "DELETE" })
}

function getNotificationTypes(config: TraccarConfig) {
  return request<TraccarNotificationType[]>(config, "/notifications/types")
}

function testNotification(config: TraccarConfig) {
  return request<void>(config, "/notifications/test", { method: "POST" })
}

// ── Drivers ───────────────────────────────────────────────────────────────────

function getDrivers(config: TraccarConfig, groupId?: number) {
  const query = groupId
    ? new URLSearchParams({ groupId: String(groupId) })
    : undefined
  return request<TraccarDriver[]>(config, "/drivers", { query })
}

function createDriver(
  config: TraccarConfig,
  driver: Omit<TraccarDriver, "id">
) {
  return request<TraccarDriver>(config, "/drivers", {
    method: "POST",
    body: JSON.stringify(driver),
    headers: { "Content-Type": "application/json" },
  })
}

function updateDriver(
  config: TraccarConfig,
  id: number,
  driver: TraccarDriver
) {
  return request<TraccarDriver>(config, `/drivers/${id}`, {
    method: "PUT",
    body: JSON.stringify(driver),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteDriver(config: TraccarConfig, id: number) {
  return request<void>(config, `/drivers/${id}`, { method: "DELETE" })
}

// ── Computed Attributes ────────────────────────────────────────────────────────

function getComputedAttributes(config: TraccarConfig) {
  return request<TraccarAttribute[]>(config, "/attributes/computed")
}

function createComputedAttribute(
  config: TraccarConfig,
  attribute: Omit<TraccarAttribute, "id">
) {
  return request<TraccarAttribute>(config, "/attributes/computed", {
    method: "POST",
    body: JSON.stringify(attribute),
    headers: { "Content-Type": "application/json" },
  })
}

function updateComputedAttribute(
  config: TraccarConfig,
  id: number,
  attribute: TraccarAttribute
) {
  return request<TraccarAttribute>(config, `/attributes/computed/${id}`, {
    method: "PUT",
    body: JSON.stringify(attribute),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteComputedAttribute(config: TraccarConfig, id: number) {
  return request<void>(config, `/attributes/computed/${id}`, {
    method: "DELETE",
  })
}

// ── Maintenance ───────────────────────────────────────────────────────────────

function getMaintenance(config: TraccarConfig) {
  return request<TraccarMaintenance[]>(config, "/maintenance")
}

function createMaintenance(
  config: TraccarConfig,
  maintenance: Omit<TraccarMaintenance, "id">
) {
  return request<TraccarMaintenance>(config, "/maintenance", {
    method: "POST",
    body: JSON.stringify(maintenance),
    headers: { "Content-Type": "application/json" },
  })
}

function updateMaintenance(
  config: TraccarConfig,
  id: number,
  maintenance: TraccarMaintenance
) {
  return request<TraccarMaintenance>(config, `/maintenance/${id}`, {
    method: "PUT",
    body: JSON.stringify(maintenance),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteMaintenance(config: TraccarConfig, id: number) {
  return request<void>(config, `/maintenance/${id}`, { method: "DELETE" })
}

// ── Statistics ────────────────────────────────────────────────────────────────

function getStatistics(config: TraccarConfig, from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return request<TraccarStatistics[]>(config, "/statistics", { query })
}

// ── Stops Report ──────────────────────────────────────────────────────────────

function getStopsReport(
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
  return request<TraccarReportStop[]>(config, "/reports/stops", { query })
}

// ── Permissions ───────────────────────────────────────────────────────────────

function linkPermission(config: TraccarConfig, permission: TraccarPermission) {
  return request<void>(config, "/permissions", {
    method: "POST",
    body: JSON.stringify(permission),
    headers: { "Content-Type": "application/json" },
  })
}

function unlinkPermission(
  config: TraccarConfig,
  permission: TraccarPermission
) {
  return request<void>(config, "/permissions", {
    method: "DELETE",
    body: JSON.stringify(permission),
    headers: { "Content-Type": "application/json" },
  })
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

function getUsers(config: TraccarConfig) {
  return request<TraccarFullUser[]>(config, "/users")
}

function createUser(config: TraccarConfig, user: Omit<TraccarFullUser, "id">) {
  return request<TraccarFullUser>(config, "/users", {
    method: "POST",
    body: JSON.stringify(user),
    headers: { "Content-Type": "application/json" },
  })
}

function updateUser(config: TraccarConfig, id: number, user: TraccarFullUser) {
  return request<TraccarFullUser>(config, `/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(user),
    headers: { "Content-Type": "application/json" },
  })
}

function deleteUser(config: TraccarConfig, id: number) {
  return request<void>(config, `/users/${id}`, { method: "DELETE" })
}

// ── Groups CRUD ───────────────────────────────────────────────────────────────

async function createGroup(
  config: TraccarConfig,
  group: Omit<TraccarGroup, "id">
) {
  const result = await request<TraccarGroup>(config, "/groups", {
    method: "POST",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/groups")
  return result
}

async function updateGroup(
  config: TraccarConfig,
  id: number,
  group: TraccarGroup
) {
  const result = await request<TraccarGroup>(config, `/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify(group),
    headers: { "Content-Type": "application/json" },
  })
  clearCache("/groups")
  return result
}

async function deleteGroup(config: TraccarConfig, id: number) {
  await request<void>(config, `/groups/${id}`, { method: "DELETE" })
  clearCache("/groups")
}

// ── Device Accumulators ───────────────────────────────────────────────────────

function updateDeviceAccumulators(
  config: TraccarConfig,
  id: number,
  accumulators: TraccarDeviceAccumulators
) {
  return request<void>(config, `/devices/${id}/accumulators`, {
    method: "PUT",
    body: JSON.stringify(accumulators),
    headers: { "Content-Type": "application/json" },
  })
}

// ── Device Sharing ────────────────────────────────────────────────────────────

function shareDevice(
  config: TraccarConfig,
  deviceId: number,
  expiration: string
) {
  return request<string>(config, "/devices/share", {
    method: "POST",
    body: new URLSearchParams({
      deviceId: String(deviceId),
      expiration,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}

// ── Export ─────────────────────────────────────────────────────────────────────

async function downloadExport(
  config: TraccarConfig,
  format: "csv" | "gpx" | "kml",
  deviceId: number,
  from: string,
  to: string
) {
  const base = normalizeServerUrl(config.serverUrl)
  const params = new URLSearchParams({
    deviceId: String(deviceId),
    from,
    to,
  })
  const url = `${base}/positions/${format}?${params}`

  const response = await fetch(url, {
    headers: createHeaders(config),
  })

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = `positions-${deviceId}.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

// ── Health ─────────────────────────────────────────────────────────────────────

function getHealth(config: TraccarConfig) {
  return request<string>(config, "/health")
}

// ── Events by ID ──────────────────────────────────────────────────────────────

function getEventById(config: TraccarConfig, id: number) {
  return request<TraccarEvent>(config, `/events/${id}`)
}

export {
  createComputedAttribute,
  createDevice,
  createDriver,
  createGeofence,
  createGroup,
  createMaintenance,
  createNotification,
  createSavedCommand,
  createUser,
  deleteComputedAttribute,
  deleteDevice,
  deleteDriver,
  deleteGeofence,
  deleteGroup,
  deleteMaintenance,
  deleteNotification,
  deleteSavedCommand,
  deleteUser,
  geocode,
  getComputedAttributes,
  getCalendars,
  getCommandTypes,
  getCommands,
  getDevices,
  getEventById,
  getEvents,
  downloadExport,
  getGeofenceReport,
  getGeofences,
  getGroups,
  getHealth,
  getMaintenance,
  getNotificationTypes,
  getNotifications,
  getDrivers,
  getPositionHistory,
  getPositions,
  getRouteReport,
  getSavedCommandsForDevice,
  getServer,
  getServerCache,
  getServerTimezones,
  getSession,
  getStatistics,
  getStopsReport,
  getSummaryReport,
  getTripReport,
  getUsers,
  linkPermission,
  login,
  logout,
  normalizeServerUrl,
  normalizeWsUrl,
  parseRealtimePayload,
  rebootServer,
  revokeToken,
  sendCommand,
  shareDevice,
  testNotification,
  toRealtimeUrl,
  triggerServerGc,
  unlinkPermission,
  updateComputedAttribute,
  updateDevice,
  updateDeviceAccumulators,
  updateDriver,
  updateGeofence,
  updateGroup,
  updateMaintenance,
  updateNotification,
  updateSavedCommand,
  updateServer,
  updateUser,
  uploadDeviceImage,
}
