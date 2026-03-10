import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  type ConnectionForm,
  ENV_TOKEN,
  readStoredConfig,
  saveConfig,
  toConfig,
} from "@/lib/config"
import {
  ensureArray,
  createDefaultRouteWindow,
  normalizeStatus,
  toIsoValue,
  getRouteEventPosition,
  pathDistanceMeters,
} from "@/lib/utils"
import {
  getDevices,
  getEvents,
  getPositionHistory,
  getPositions,
  getRouteReport,
  getSummaryReport,
  getTripReport,
  login,
  parseRealtimePayload,
  toRealtimeUrl,
  type TraccarConfig,
  type TraccarDevice,
  type TraccarEvent,
  type TraccarPosition,
  type TraccarReportSummary,
  type TraccarReportTrip,
  type TraccarUser,
  type RealtimePayload,
} from "@/lib/traccar"

export type View = "live" | "replay"
export type StatusFilter = "all" | "online" | "unknown" | "offline"
export type ConnectionState = "idle" | "connecting" | "connected" | "error"
export type PlaybackSpeed = 1 | 2 | 4 | 8

export type RouteWindow = {
  from: string
  to: string
}

type FleetState = {
  devices: TraccarDevice[]
  positions: TraccarPosition[]
  routePositions: TraccarPosition[]
  trips: TraccarReportTrip[]
  summary: TraccarReportSummary[]
  events: TraccarEvent[]
}

const emptyFleet: FleetState = {
  devices: [],
  positions: [],
  routePositions: [],
  trips: [],
  summary: [],
  events: [],
}

export function useFleet() {
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(() =>
    readStoredConfig()
  )
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ENV_TOKEN ? "connecting" : "idle"
  )
  const [connectionError, setConnectionError] = useState("")
  const [user, setUser] = useState<TraccarUser | null>(null)
  const [fleet, setFleet] = useState<FleetState>(emptyFleet)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(0)
  const [selectedTripIndex, setSelectedTripIndex] = useState(0)
  const [routeWindow, setRouteWindow] = useState<RouteWindow>(() =>
    createDefaultRouteWindow()
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingReplay, setIsLoadingReplay] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Accumulate position history per device for live trail rendering.
  // Key = deviceId, Value = array of [longitude, latitude] in chronological order.
  const positionHistory = useRef<globalThis.Map<number, [number, number][]>>(
    new globalThis.Map()
  )
  const MAX_TRAIL_POINTS = 500
  // Counter bumped on every history mutation so useMemo can react.
  const [trailVersion, setTrailVersion] = useState(0)

  function appendToHistory(deviceId: number, lng: number, lat: number) {
    const history = positionHistory.current
    let trail = history.get(deviceId)
    if (!trail) {
      trail = []
      history.set(deviceId, trail)
    }
    // Skip duplicate of last point
    const last = trail.at(-1)
    if (last && last[0] === lng && last[1] === lat) return
    trail.push([lng, lat])
    if (trail.length > MAX_TRAIL_POINTS) {
      trail.splice(0, trail.length - MAX_TRAIL_POINTS)
    }
  }

  function seedHistory(positions: TraccarPosition[]) {
    positionHistory.current.clear()
    for (const pos of positions) {
      appendToHistory(pos.deviceId, pos.longitude, pos.latitude)
    }
    setTrailVersion((v) => v + 1)
  }

  function seedDeviceTrail(deviceId: number, positions: TraccarPosition[]) {
    const coords: [number, number][] = positions.map((p) => [
      p.longitude,
      p.latitude,
    ])
    positionHistory.current.set(deviceId, coords.slice(-MAX_TRAIL_POINTS))
    setTrailVersion((v) => v + 1)
  }

  const positionsByDevice = useMemo(() => {
    return new globalThis.Map(
      fleet.positions.map((position) => [position.deviceId, position])
    )
  }, [fleet.positions])

  const devices = useMemo(() => {
    return fleet.devices.map((device) => {
      const position = positionsByDevice.get(device.id)
      return {
        ...device,
        status: normalizeStatus(device, position),
      }
    })
  }, [fleet.devices, positionsByDevice])

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ??
    devices[0] ??
    null
  const selectedPosition = selectedDevice
    ? (positionsByDevice.get(selectedDevice.id) ?? null)
    : null
  const selectedSummary =
    ensureArray<TraccarReportSummary>(fleet.summary).find(
      (item) => item.deviceId === selectedDevice?.id
    ) ?? null
  const selectedTrip =
    ensureArray<TraccarReportTrip>(fleet.trips)[selectedTripIndex] ??
    ensureArray<TraccarReportTrip>(fleet.trips)[0] ??
    null
  const selectedRouteCoordinates = useMemo(() => {
    return ensureArray<TraccarPosition>(fleet.routePositions).map(
      (position) => [position.longitude, position.latitude]
    ) as [number, number][]
  }, [fleet.routePositions])

  const eventMarkers = useMemo(() => {
    return fleet.events
      .map((event) => ({
        event,
        position: getRouteEventPosition(event, fleet.routePositions),
      }))
      .filter((item) => item.position)
  }, [fleet.events, fleet.routePositions])

  // Positions for the selected trip only (filtered by trip start/end time)
  const selectedTripPositions = useMemo(() => {
    const allPositions = ensureArray<TraccarPosition>(fleet.routePositions)
    if (!selectedTrip) return allPositions

    const from = new Date(selectedTrip.startTime).getTime()
    const to = new Date(selectedTrip.endTime).getTime()

    const filtered = allPositions.filter((p) => {
      const t = new Date(
        p.fixTime ?? p.deviceTime ?? p.serverTime ?? 0
      ).getTime()
      return t >= from && t <= to
    })

    // Fall back to full route if trip filter yields nothing (e.g. timestamps mismatch)
    return filtered.length > 1 ? filtered : allPositions
  }, [fleet.routePositions, selectedTrip])

  const selectedTripCoordinates = useMemo(() => {
    return selectedTripPositions.map((p) => [p.longitude, p.latitude]) as [
      number,
      number,
    ][]
  }, [selectedTripPositions])

  // Current animated position along the route
  const currentPlaybackPosition = selectedTripPositions[playbackIndex] ?? null

  // Advance playback index on a timer
  useEffect(() => {
    if (!isPlaying || selectedTripPositions.length < 2) return

    // Base tick: advance one position every 1000ms (1 second), scaled by speed
    const interval = Math.max(16, Math.round(1000 / playbackSpeed))

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= selectedTripPositions.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, interval)

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    }
  }, [isPlaying, playbackSpeed, selectedTripPositions.length])

  // Reset playback when trip changes or new replay data loads
  useEffect(() => {
    setPlaybackIndex(0)
    setIsPlaying(false)
  }, [selectedTripIndex, fleet.routePositions])

  // Live trail for the selected device. Only returns coordinates if path >= 1km.
  const selectedDeviceTrail = useMemo(() => {
    // trailVersion is used to trigger re-computation when history changes
    void trailVersion
    if (!selectedDeviceId) return []
    const trail = positionHistory.current.get(selectedDeviceId)
    if (!trail || trail.length < 2) return []
    const distance = pathDistanceMeters(trail)
    if (distance < 1000) return []
    return trail
  }, [selectedDeviceId, trailVersion])

  // Auto-select first device
  useEffect(() => {
    if (!selectedDevice && devices[0]) {
      setSelectedDeviceId(devices[0].id)
    }
  }, [devices, selectedDevice])

  // Fetch route history for the selected device to seed live trail
  useEffect(() => {
    if (connectionState !== "connected" || !selectedDeviceId) return

    const config = toConfig(connectionForm)
    const now = new Date()
    const from = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()

    let cancelled = false

    getRouteReport(config, selectedDeviceId, from, to)
      .then((positions) => {
        if (cancelled) return
        const safePositions = ensureArray<TraccarPosition>(positions)
        if (safePositions.length > 0) {
          seedDeviceTrail(selectedDeviceId, safePositions)
        }
      })
      .catch(() => {
        // Trail fetch is best-effort; don't surface errors
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, connectionState])

  // Realtime websocket with batching to avoid per-message re-renders
  const pendingPayloads = useRef<RealtimePayload[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPayloads = useEffectEvent(() => {
    const batch = pendingPayloads.current
    if (batch.length === 0) return
    pendingPayloads.current = []

    // Merge all buffered payloads into one combined update
    const merged: RealtimePayload = { devices: [], positions: [], events: [] }
    for (const payload of batch) {
      if (payload.devices) merged.devices!.push(...payload.devices)
      if (payload.positions) merged.positions!.push(...payload.positions)
      if (payload.events) merged.events!.push(...payload.events)
    }

    // Deduplicate: keep only the latest per device
    const deviceMap = new globalThis.Map(merged.devices!.map((d) => [d.id, d]))
    merged.devices = [...deviceMap.values()]

    const positionMap = new globalThis.Map(
      merged.positions!.map((p) => [p.deviceId, p])
    )
    merged.positions = [...positionMap.values()]

    // Append new positions to trail history
    for (const pos of merged.positions) {
      appendToHistory(pos.deviceId, pos.longitude, pos.latitude)
    }
    setTrailVersion((v) => v + 1)

    startTransition(() => {
      setFleet((current) => ({
        ...current,
        devices:
          merged.devices!.length > 0
            ? current.devices.map((device) => {
                const nextDevice = merged.devices!.find(
                  (item) => item.id === device.id
                )
                return nextDevice ? { ...device, ...nextDevice } : device
              })
            : current.devices,
        positions:
          merged.positions!.length > 0
            ? [
                ...merged.positions!,
                ...current.positions.filter(
                  (position) =>
                    !merged.positions!.some(
                      (incoming) => incoming.deviceId === position.deviceId
                    )
                ),
              ]
            : current.positions,
        events:
          merged.events!.length > 0
            ? [...merged.events!, ...current.events].slice(0, 16)
            : current.events,
      }))
    })
  })

  useEffect(() => {
    if (connectionState !== "connected") {
      return undefined
    }

    const config = toConfig(connectionForm)
    const socket = new WebSocket(toRealtimeUrl(config))

    const FLUSH_INTERVAL = 2000

    socket.onmessage = (event) => {
      try {
        pendingPayloads.current.push(parseRealtimePayload(event.data))
      } catch {
        // Ignore malformed realtime frames.
        return
      }

      // Schedule a flush if one isn't already pending
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => {
          flushTimer.current = null
          flushPayloads()
        }, FLUSH_INTERVAL)
      }
    }

    socket.onerror = () => {
      // Intentionally ignoring websocket errors as REST polling handles fallback
      // console.warn("WebSocket connection error. Falling back to REST updates.")
    }

    return () => {
      socket.close()
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
        flushTimer.current = null
      }
      pendingPayloads.current = []
    }
  }, [connectionForm, connectionState])

  // Data fetchers
  async function refreshLiveData(config: TraccarConfig) {
    const [devicesResponse, positionsResponse] = await Promise.all([
      getDevices(config),
      getPositions(config),
    ])

    const safeDevices = ensureArray<TraccarDevice>(devicesResponse)
    const safePositions = ensureArray<TraccarPosition>(positionsResponse)

    // Seed trail history from initial REST positions
    seedHistory(safePositions)

    setFleet((current) => ({
      ...current,
      devices: safeDevices,
      positions: safePositions,
    }))

    const nextDeviceId =
      safeDevices.find((item) => item.id === selectedDeviceId)?.id ??
      safeDevices[0]?.id ??
      0

    if (nextDeviceId && nextDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(nextDeviceId)
    }

    return nextDeviceId
  }

  async function loadReplayData(
    config: TraccarConfig,
    deviceId: number,
    from: string,
    to: string
  ) {
    setIsLoadingReplay(true)
    try {
      // Try /positions first (raw position history, no Reports module needed).
      // Fall back to /reports/route if it returns nothing or errors.
      let routePositions: TraccarPosition[] = []
      try {
        const raw = await getPositionHistory(config, deviceId, from, to)
        routePositions = ensureArray<TraccarPosition>(raw)
        console.log(
          `[replay] /positions returned ${routePositions.length} points`
        )
      } catch {
        console.warn("[replay] /positions failed, trying /reports/route")
      }

      if (routePositions.length === 0) {
        try {
          const raw = await getRouteReport(config, deviceId, from, to)
          routePositions = ensureArray<TraccarPosition>(raw)
          console.log(
            `[replay] /reports/route returned ${routePositions.length} points`
          )
        } catch {
          console.warn("[replay] /reports/route also failed")
        }
      }

      const [trips, summary, events] = await Promise.all([
        getTripReport(config, deviceId, from, to),
        getSummaryReport(config, deviceId, from, to),
        getEvents(config, deviceId, from, to),
      ])

      setFleet((current) => ({
        ...current,
        routePositions,
        trips: ensureArray<TraccarReportTrip>(trips),
        summary: ensureArray<TraccarReportSummary>(summary),
        events: ensureArray<TraccarEvent>(events),
      }))
      setSelectedTripIndex(0)
    } finally {
      setIsLoadingReplay(false)
    }
  }

  // Auto-connect on mount
  useEffect(() => {
    const storedConfig = readStoredConfig()
    if (!storedConfig.serverUrl) {
      setConnectionState("idle")
      return
    }

    const config = toConfig(storedConfig)
    setConnectionState("connecting")

    const initialize = async () => {
      if (config.authMode === "token" && config.token) {
        const activeDeviceId = await refreshLiveData(config)
        if (activeDeviceId) {
          await loadReplayData(
            config,
            activeDeviceId,
            toIsoValue(routeWindow.from),
            toIsoValue(routeWindow.to)
          )
        }
        setUser({
          id: 0,
          name: "Token session",
          email: "Bearer token",
        })
        return
      }

      // Instead of getting the session, we need to explicitly login
      const sessionUser = await login(config)
      setUser(sessionUser)
      const activeDeviceId = await refreshLiveData(config)
      if (activeDeviceId) {
        await loadReplayData(
          config,
          activeDeviceId,
          toIsoValue(routeWindow.from),
          toIsoValue(routeWindow.to)
        )
      }
    }

    initialize()
      .then(() => {
        setConnectionForm(storedConfig)
        setConnectionState("connected")
      })
      .catch((error) => {
        setConnectionState("error")
        setConnectionError(
          error instanceof Error ? error.message : "Auto-connect failed."
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnect(form: ConnectionForm) {
    const config = toConfig(form)
    setConnectionForm(form)
    setConnectionState("connecting")
    setConnectionError("")

    try {
      const sessionUser = await login(config)
      saveConfig(form)
      setUser(sessionUser)
      const activeDeviceId = await refreshLiveData(config)
      if (activeDeviceId) {
        await loadReplayData(
          config,
          activeDeviceId,
          toIsoValue(routeWindow.from),
          toIsoValue(routeWindow.to)
        )
      }
      setConnectionState("connected")
    } catch (error) {
      setConnectionState("error")
      setConnectionError(
        error instanceof Error ? error.message : "Unable to connect to Traccar."
      )
    }
  }

  async function handleRefresh() {
    if (connectionState !== "connected") {
      return
    }

    const config = toConfig(connectionForm)
    setIsRefreshing(true)
    try {
      await refreshLiveData(config)
      if (selectedDevice) {
        await loadReplayData(
          config,
          selectedDevice.id,
          toIsoValue(routeWindow.from),
          toIsoValue(routeWindow.to)
        )
      }
      setConnectionError("")
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Refresh failed."
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleLoadReplay() {
    if (connectionState !== "connected" || !selectedDevice) {
      return
    }

    try {
      await loadReplayData(
        toConfig(connectionForm),
        selectedDevice.id,
        toIsoValue(routeWindow.from),
        toIsoValue(routeWindow.to)
      )
      setConnectionError("")
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Route replay failed to load."
      )
    }
  }

  function handlePlayPause() {
    if (playbackIndex >= selectedTripPositions.length - 1) {
      // Restart from beginning
      setPlaybackIndex(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }

  function handleScrub(index: number) {
    setPlaybackIndex(index)
    setIsPlaying(false)
  }

  function handleSetPlaybackSpeed(speed: PlaybackSpeed) {
    setPlaybackSpeed(speed)
  }

  return {
    connectionForm,
    setConnectionForm,
    connectionState,
    connectionError,
    user,
    devices,
    positionsByDevice,
    fleet,
    selectedDevice,
    selectedPosition,
    selectedSummary,
    selectedTrip,
    selectedRouteCoordinates,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedTripIndex,
    setSelectedTripIndex,
    routeWindow,
    setRouteWindow,
    isRefreshing,
    isLoadingReplay,
    eventMarkers,
    selectedDeviceTrail,
    // Replay playback
    selectedTripPositions,
    selectedTripCoordinates,
    currentPlaybackPosition,
    playbackIndex,
    playbackSpeed,
    isPlaying,
    handlePlayPause,
    handleScrub,
    handleSetPlaybackSpeed,
    handleConnect,
    handleRefresh,
    handleLoadReplay,
  }
}
