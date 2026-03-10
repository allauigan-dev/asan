export type AuthMode = "session" | "token"

export type TraccarConfig = {
  serverUrl: string
  wsUrl?: string
  authMode: AuthMode
  email?: string
  password?: string
  token?: string
}

export type TraccarUser = {
  id: number
  name?: string
  email?: string
  administrator?: boolean
}

export type TraccarDevice = {
  id: number
  name: string
  uniqueId: string
  status?: string
  lastUpdate?: string
  positionId?: number
  category?: string
  model?: string
  contact?: string
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

export type RealtimePayload = {
  devices?: TraccarDevice[]
  positions?: TraccarPosition[]
  events?: TraccarEvent[]
}

type RequestOptions = {
  method?: "GET" | "POST"
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

function createHeaders(config: TraccarConfig, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)

  if (config.authMode === "token" && config.token) {
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
    credentials: "include",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

async function login(config: TraccarConfig) {
  if (config.authMode !== "session") {
    await getDevices(config)
    return {
      id: 0,
      name: "Token session",
      email: "Bearer token",
    }
  }

  const body = new URLSearchParams({
    email: config.email ?? "",
    password: config.password ?? "",
  })

  return request<TraccarUser>(config, "/session", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
}

function getSession(config: TraccarConfig) {
  return request<TraccarUser>(config, "/session")
}

function logout(config: TraccarConfig) {
  return request<string>(config, "/session", { method: "POST" })
}

function getDevices(config: TraccarConfig) {
  return request<TraccarDevice[]>(config, "/devices")
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

function toRealtimeUrl(config: TraccarConfig) {
  const url = new URL(normalizeWsUrl(config.wsUrl ?? "", config.serverUrl))

  // Browsers can't attach Authorization headers to WebSocket requests,
  // so token auth needs to flow through the URL when the server supports it.
  if (config.authMode === "token" && config.token) {
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
  getDevices,
  getEvents,
  getPositionHistory,
  getPositions,
  getRouteReport,
  getSession,
  getSummaryReport,
  getTripReport,
  login,
  logout,
  normalizeServerUrl,
  normalizeWsUrl,
  parseRealtimePayload,
  toRealtimeUrl,
}
