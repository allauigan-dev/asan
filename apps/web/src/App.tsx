import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Toaster } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapDrawLayer,
  MapMarker,
  MapPolygonLayer,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  type MapRef,
} from "@workspace/ui/components/ui/map"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { preloadDeviceIcons } from "@/lib/map-optimizations"
import { FleetSidebar } from "@/components/fleet-sidebar"
import {
  BatteryIndicator,
  ChevronLeft,
  ChevronRight,
  Fence,
  LogOut,
  MapPinned,
  Moon,
  Navigation,
  Pencil,
  Radio,
  RefreshCw,
  Route,
  Settings,
  StopCircle,
  SunMedium,
  Zap,
} from "@/components/icons"
import { LiveTelemetryPanel } from "@/components/live-telemetry-panel"
import { MetricBar } from "@/components/metric-bar"
import { ReplayController } from "@/components/replay-controller"
import { ReplayPanel } from "@/components/replay-panel"
import { SettingsPage } from "@/components/settings-page"
import { StopTable } from "@/components/stop-table"
import { TripTable } from "@/components/trip-table"
import { AuthImage } from "@/components/auth-image"
import { useFleet, type View } from "@/hooks/use-fleet"
import {
  createGeofence,
  type TraccarDevice,
  type TraccarPosition,
} from "@/lib/traccar"
import { readStoredConfig, toConfig } from "@/lib/config"
import { useTheme } from "@/components/theme-provider"
import {
  durationLabel,
  formatTimestamp,
  getBatteryLevel,
  getDeviceIcon,
  relativeTime,
  toKph,
} from "@/lib/utils"
import { getStoredMapStyle, MAP_STYLES, saveMapStyle } from "@/lib/map-styles"

/**
 * Convert a pair of raw WKT numbers to a MapLibre [lon, lat] pair.
 *
 * Traccar's server uses "lat lon" ordering for both CIRCLE and POLYGON WKT,
 * while standard WKT uses "lon lat". Rather than hard-coding either assumption,
 * we detect which value must be longitude: if the second value exceeds the
 * valid latitude range [-90, 90] it is clearly longitude, so we swap; if the
 * first value exceeds the range, it is clearly longitude and we keep the order;
 * otherwise we fall back to standard "lon lat" (first = lon, second = lat).
 */
function wktPointToLngLat(a: number, b: number): [number, number] {
  if (Math.abs(b) > 90) return [b, a] // b is lon → data is "lat lon"
  if (Math.abs(a) > 90) return [a, b] // a is lon → data is "lon lat"
  return [a, b] // ambiguous — assume standard "lon lat"
}

function parseGeofenceCenter(area: string): [number, number] | null {
  const circleMatch = area.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,/i)
  if (circleMatch) {
    // CIRCLE is always "lat lon" in Traccar
    return [Number(circleMatch[2]), Number(circleMatch[1])]
  }
  const polyMatch = area.match(/POLYGON\s*\(\(([^)]+)\)/i)
  if (polyMatch) {
    const points = polyMatch[1].split(",").map((p) => {
      const parts = p.trim().split(/\s+/).map(Number)
      return wktPointToLngLat(parts[0]!, parts[1]!)
    })
    if (points.length > 0) {
      const avgLon = points.reduce((s, p) => s + p[0], 0) / points.length
      const avgLat = points.reduce((s, p) => s + p[1], 0) / points.length
      return [avgLon, avgLat]
    }
  }
  return null
}

/** Approximate a circle (lat/lon center, radius in meters) as a polygon ring */
function circleToPolygon(
  lat: number,
  lon: number,
  radiusMeters: number,
  numPoints = 48
): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    const dLat = (radiusMeters / 111320) * Math.cos(angle)
    const dLon =
      (radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
      Math.sin(angle)
    points.push([lon + dLon, lat + dLat])
  }
  return points
}

/** Parse a Traccar WKT area string into a polygon ring ([lon, lat] pairs, not closed). */
function parseGeofencePolygon(area: string): [number, number][] | null {
  const polyMatch = area.match(/POLYGON\s*\(\(([^)]+)\)/i)
  if (polyMatch) {
    const points = polyMatch[1].split(",").map((p) => {
      const parts = p.trim().split(/\s+/).map(Number)
      return wktPointToLngLat(parts[0]!, parts[1]!)
    })
    // Strip closing duplicate if present
    if (
      points.length > 1 &&
      points[0]![0] === points[points.length - 1]![0] &&
      points[0]![1] === points[points.length - 1]![1]
    ) {
      points.pop()
    }
    return points.length >= 3 ? points : null
  }
  const circleMatch = area.match(
    /CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i
  )
  if (circleMatch) {
    // CIRCLE is always "lat lon" in Traccar
    return circleToPolygon(
      Number(circleMatch[1]),
      Number(circleMatch[2]),
      Number(circleMatch[3])
    )
  }
  return null
}

/**
 * Convert an array of [lon, lat] vertices to a Traccar POLYGON WKT string.
 * Traccar expects "lat lon" ordering in the WKT.
 */
function polygonToWKT(coords: [number, number][]): string {
  const closed = [...coords, coords[0]!]
  return `POLYGON ((${closed.map(([lon, lat]) => `${lat} ${lon}`).join(", ")}))`
}

function deviceImageUrl(uniqueId: string, filename: string) {
  return `/api/media/${uniqueId}/${filename}`
}

type DeviceMarkerProps = {
  device: TraccarDevice
  position: TraccarPosition
  active: boolean
  onSelect: (id: number) => void
}

const DeviceMarker = memo(function DeviceMarker({
  device,
  position,
  active,
  onSelect,
}: DeviceMarkerProps) {
  const battery = getBatteryLevel(position)
  const DeviceIcon = getDeviceIcon(device.category)
  const handleClick = useCallback(
    () => onSelect(device.id),
    [onSelect, device.id]
  )

  return (
    <MapMarker
      longitude={position.longitude}
      latitude={position.latitude}
      onClick={handleClick}
    >
      <MarkerContent>
        <div
          className={`relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 shadow-xl ${
            active
              ? "border-primary/20 bg-primary text-primary-foreground"
              : "border-background/80 bg-background text-foreground"
          }`}
        >
          <DeviceIcon className="size-4" />
          {typeof device.attributes?.deviceImage === "string" && (
            <AuthImage
              src={deviceImageUrl(
                device.uniqueId,
                device.attributes.deviceImage
              )}
              alt={device.name}
              className="absolute inset-0 z-10 size-full bg-background object-cover"
            />
          )}
        </div>
        <MarkerLabel position="bottom">{device.name.split(",")[0]}</MarkerLabel>
      </MarkerContent>
      <MarkerPopup className="w-64 p-0">
        <div className="space-y-2 p-3">
          <div className="flex gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <DeviceIcon className="size-5" />
              </div>
              {typeof device.attributes?.deviceImage === "string" && (
                <AuthImage
                  src={deviceImageUrl(
                    device.uniqueId,
                    device.attributes.deviceImage
                  )}
                  alt={device.name}
                  className="absolute inset-0 z-10 size-full bg-background object-cover"
                />
              )}
            </div>
            <div>
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {device.category ?? "Device"}
              </span>
              <h3 className="leading-tight font-semibold text-foreground">
                {device.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {toKph(position.speed)} km/h
            </span>
            <span>{device.uniqueId}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{relativeTime(position.fixTime ?? position.deviceTime)}</span>
            {battery !== null && (
              <div className="flex items-center gap-1">
                <BatteryIndicator level={battery} className="size-4" />
                <span>{battery}%</span>
              </div>
            )}
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  )
})

export function App() {
  const fleet = useFleet()

  const [view, setView] = useState<View>("live")
  const [showSettings, setShowSettings] = useState(false)
  const mapRef = useRef<MapRef | null>(null)
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const lastFlewToDeviceId = useRef<number | null>(null)
  const [replayCollapsed, setReplayCollapsed] = useState(false)
  const [mapZoom, setMapZoom] = useState(11.2)
  const [mapStyleId, setMapStyleId] = useState<string>(
    () => getStoredMapStyle().id
  )

  // ── Geofence drawing state ─────────────────────────────────────────────────
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawVertices, setDrawVertices] = useState<[number, number][]>([])
  const [showDrawSave, setShowDrawSave] = useState(false)
  const [drawSaveName, setDrawSaveName] = useState("")
  const [drawSaveDesc, setDrawSaveDesc] = useState("")
  const [drawSaving, setDrawSaving] = useState(false)
  // Track whether drawing was initiated from the settings panel so we can return to it after save
  const drawFromSettings = useRef(false)

  const mapStyle = MAP_STYLES[mapStyleId] ?? MAP_STYLES.carto

  const CLUSTER_MAX_ZOOM = 10

  const deviceClusterData = useMemo(
    (): GeoJSON.FeatureCollection<GeoJSON.Point, { deviceId: number }> => ({
      type: "FeatureCollection",
      features: fleet.devices.flatMap((device) => {
        const position = fleet.positionsByDevice.get(device.id)
        if (!position) return []
        return [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [position.longitude, position.latitude],
            },
            properties: { deviceId: device.id },
          },
        ]
      }),
    }),
    [fleet.devices, fleet.positionsByDevice]
  )

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  const cycleMapStyle = () => {
    const styleIds = Object.keys(MAP_STYLES)
    const currentIndex = styleIds.indexOf(mapStyleId)
    const nextId =
      styleIds[(currentIndex >= 0 ? currentIndex + 1 : 0) % styleIds.length] ??
      "carto"

    setMapStyleId(nextId)
    saveMapStyle(nextId)

    const nextStyle = MAP_STYLES[nextId] ?? MAP_STYLES.carto
    mapRef.current?.easeTo({
      pitch: nextStyle.defaultPitch ?? 0,
      duration: 500,
    })
  }

  // ── Geofence drawing handlers ──────────────────────────────────────────────
  /** Start drawing mode. Pass `fromSettings=true` when triggered from the settings panel. */
  function startDrawing(fromSettings = false) {
    drawFromSettings.current = fromSettings
    setShowSettings(false)
    setIsDrawing(true)
    setDrawVertices([])
  }

  function cancelDrawing() {
    setIsDrawing(false)
    setDrawVertices([])
    if (drawFromSettings.current) {
      setShowSettings(true)
      drawFromSettings.current = false
    }
  }

  function finishDrawing() {
    if (drawVertices.length < 3) return
    setIsDrawing(false)
    setDrawSaveName("")
    setDrawSaveDesc("")
    setShowDrawSave(true)
  }

  function handleAddVertex(point: [number, number]) {
    setDrawVertices((prev) => [...prev, point])
  }

  function handleUndoVertex() {
    setDrawVertices((prev) => prev.slice(0, -1))
  }

  async function handleSaveDrawnGeofence() {
    if (!drawSaveName || drawVertices.length < 3) return
    setDrawSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      await createGeofence(config, {
        name: drawSaveName,
        description: drawSaveDesc,
        area: polygonToWKT(drawVertices),
      })
      setShowDrawSave(false)
      setDrawVertices([])
      fleet.handleRefresh()
      if (drawFromSettings.current) {
        setShowSettings(true)
        drawFromSettings.current = false
      }
    } finally {
      setDrawSaving(false)
    }
  }

  // Preload device icons for map rendering optimization
  useEffect(() => {
    preloadDeviceIcons().catch((err) => {
      console.warn("Failed to preload device icons:", err)
    })
  }, [])

  // 1. Live View map follow logic
  useEffect(() => {
    if (
      view !== "live" ||
      !fleet.selectedDevice ||
      !fleet.selectedPosition ||
      !mapRef.current
    )
      return

    const isNewDevice = lastFlewToDeviceId.current !== fleet.selectedDevice.id
    lastFlewToDeviceId.current = fleet.selectedDevice.id
    const currentZoom = mapRef.current.getZoom()
    mapRef.current.flyTo({
      center: [
        fleet.selectedPosition.longitude,
        fleet.selectedPosition.latitude,
      ],
      ...(isNewDevice && currentZoom < 11.8 ? { zoom: 11.8 } : {}),
      duration: 900,
    })
  }, [fleet.selectedDevice, fleet.selectedPosition, view])

  // 2. Replay View map initialization logic
  const lastFlewToTripKey = useRef<string | null>(null)

  useEffect(() => {
    if (
      view !== "replay" ||
      !fleet.selectedDevice ||
      fleet.selectedTripCoordinates.length < 2 ||
      !mapRef.current
    )
      return

    const tripKey = `${fleet.selectedDevice.id}-${fleet.selectedTripIndex}`
    if (lastFlewToTripKey.current === tripKey) return // already flew for this trip
    lastFlewToTripKey.current = tripKey

    const [totalLongitude, totalLatitude] =
      fleet.selectedTripCoordinates.reduce(
        (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
        [0, 0]
      )
    mapRef.current.flyTo({
      center: [
        totalLongitude / fleet.selectedTripCoordinates.length,
        totalLatitude / fleet.selectedTripCoordinates.length,
      ],
      zoom: 11.2,
      duration: 900,
    })
  }, [
    fleet.selectedDevice,
    fleet.selectedTripIndex,
    fleet.selectedTripCoordinates,
    view,
  ])

  const routePositions = fleet.selectedTripPositions
  const routeCoordinates = fleet.selectedTripCoordinates

  // The "played so far" slice for the trail behind the moving marker
  const playedCoordinates = routeCoordinates.slice(0, fleet.playbackIndex + 1)

  const showLogin = !fleet.user

  if (showLogin) {
    return (
      <div className="flex h-svh w-svw overflow-hidden text-sm">
        <SettingsPage
          connectionState={fleet.connectionState}
          connectionError={fleet.connectionError}
          onConnect={fleet.handleConnect}
          loginMode
        />
        <Toaster position="bottom-right" richColors />
      </div>
    )
  }

  return (
    <div className="flex h-svh w-svw flex-col overflow-hidden text-sm">
      {/* ── Header bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border/40 bg-background px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Navigation className="size-3.5" />
          </div>
          <div>
            <p className="font-display text-sm leading-tight font-bold tracking-tight">
              ASAN
            </p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              Fleet tracker
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="!h-8" />

        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="live">
              <Radio className="size-4" />
              Live
            </TabsTrigger>
            <TabsTrigger value="replay">
              <Route className="size-4" />
              Replay
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <MetricBar devices={fleet.devices} />

        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant={
              fleet.connectionState === "connected" ? "default" : "secondary"
            }
          >
            {fleet.connectionState === "connected"
              ? "Connected"
              : "Disconnected"}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={fleet.handleRefresh}
            disabled={
              fleet.connectionState !== "connected" || fleet.isRefreshing
            }
          >
            <RefreshCw
              className={fleet.isRefreshing ? "size-4 animate-spin" : "size-4"}
            />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleTheme}>
            {isDark ? (
              <SunMedium className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fleet.handleLogout}
            title="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Body: settings page or main content ── */}
      {showSettings ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SettingsPage
            connectionState={fleet.connectionState}
            connectionError={fleet.connectionError}
            onConnect={(form) => {
              fleet.handleConnect(form)
            }}
            onClose={() => setShowSettings(false)}
            onDeviceUpdate={() => fleet.handleRefresh()}
            onDrawGeofence={() => startDrawing(true)}
          />
        </div>
      ) : null}

      {/* ── Body: left sidebar | map | right sidebar ── */}
      <div className={`flex min-h-0 flex-1 ${showSettings ? "hidden" : ""}`}>
        {/* Left sidebar — Fleet list */}
        <FleetSidebar
          devices={fleet.devices}
          positionsByDevice={fleet.positionsByDevice}
          selectedDeviceId={fleet.selectedDeviceId}
          onSelectDevice={fleet.setSelectedDeviceId}
        />

        {/* Center — Map */}
        <div
          className="relative min-w-0 flex-1"
          role="application"
          aria-label="Interactive map view"
          onClick={(e) => {
            const canvas = mapRef.current?.getCanvas()
            if (canvas && e.target === canvas) {
              fleet.setSelectedDeviceId(0)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              fleet.setSelectedDeviceId(0)
            }
          }}
        >
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {import.meta.env.VITE_DEBUG === "true" && (
              <div className="rounded-md bg-black/70 px-2 py-1 font-mono text-xs text-white">
                z{mapZoom.toFixed(1)}{" "}
                <span
                  className={
                    Math.floor(mapZoom) > CLUSTER_MAX_ZOOM
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {Math.floor(mapZoom) > CLUSTER_MAX_ZOOM
                    ? "markers"
                    : "clusters"}
                </span>
              </div>
            )}
            {isDrawing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-2 shadow-sm"
                onClick={cancelDrawing}
              >
                <Pencil className="size-4" />
                Cancel Drawing
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 shadow-sm"
              onClick={cycleMapStyle}
              title="Switch map style"
            >
              <MapPinned className="size-4" />
              {mapStyle.name}
            </Button>
          </div>

          <Map
            ref={mapRef}
            className="absolute inset-0 h-full w-full"
            center={[120.9842, 14.5986]}
            zoom={11.2}
            attributionControl={false}
            onViewportChange={(vp) => setMapZoom(vp.zoom)}
            styles={
              mapStyle.id === "carto"
                ? undefined
                : { light: mapStyle.light, dark: mapStyle.dark }
            }
          >
            <MapControls
              position="bottom-right"
              className="right-4 bottom-4 z-20"
              showZoom
              showLocate
              showFullscreen
            />

            {/* Geofence polygon fills — rendered first so they appear below markers */}
            {fleet.fleet.geofences.map((gf) => {
              const polygon = parseGeofencePolygon(gf.area)
              if (!polygon) return null
              return (
                <MapPolygonLayer
                  key={`gf-poly-${gf.id}`}
                  id={`gf-${gf.id}`}
                  coordinates={polygon}
                  fillColor="#8B5CF6"
                  fillOpacity={0.12}
                  outlineColor="#8B5CF6"
                  outlineWidth={2}
                  interactive={false}
                />
              )
            })}

            {/* Draw layer — active when drawing mode is on */}
            <MapDrawLayer
              active={isDrawing}
              vertices={drawVertices}
              onAddVertex={handleAddVertex}
            />

            {/* Live cluster layer (zoomed out) */}
            {view === "live" && !isDrawing && (
              <MapClusterLayer
                data={deviceClusterData}
                clusterMaxZoom={CLUSTER_MAX_ZOOM}
                clusterRadius={60}
                clusterColors={["#0d9488", "#0891b2", "#6366f1"]}
                clusterThresholds={[10, 25]}
                pointColor="transparent"
                onPointClick={(feature) =>
                  fleet.setSelectedDeviceId(feature.properties.deviceId)
                }
              />
            )}

            {/* Live markers (zoomed in) */}
            {view === "live" &&
              !isDrawing &&
              Math.floor(mapZoom) > CLUSTER_MAX_ZOOM &&
              fleet.devices.map((device) => {
                const position = fleet.positionsByDevice.get(device.id)
                if (!position) return null
                return (
                  <DeviceMarker
                    key={device.id}
                    device={device}
                    position={position}
                    active={device.id === fleet.selectedDevice?.id}
                    onSelect={fleet.setSelectedDeviceId}
                  />
                )
              })}

            {/* Live trail for selected device */}
            {view === "live" && !isDrawing && fleet.selectedDeviceTrail.length > 1 && (
              <MapRoute
                coordinates={fleet.selectedDeviceTrail}
                color="#4f9cf9"
                width={4}
                opacity={0.7}
              />
            )}

            {/* Replay route — full path (dim) */}
            {view === "replay" && routeCoordinates.length > 1 && (
              <MapRoute
                coordinates={routeCoordinates}
                color="#4f9cf9"
                width={4}
                opacity={0.25}
                dashArray={[4, 4]}
              />
            )}

            {/* Replay route — played portion (bright) */}
            {view === "replay" && playedCoordinates.length > 1 && (
              <MapRoute
                coordinates={playedCoordinates}
                color="#4f9cf9"
                width={5}
                opacity={0.9}
              />
            )}

            {/* Replay start marker */}
            {view === "replay" && routePositions.at(0) && (
              <MapMarker
                longitude={routePositions[0].longitude}
                latitude={routePositions[0].latitude}
              >
                <MarkerContent>
                  <div className="flex size-8 items-center justify-center rounded-full border-4 border-emerald-400/20 bg-emerald-500 text-white shadow-lg">
                    <Radio className="size-3" />
                  </div>
                  <MarkerLabel position="bottom">Start</MarkerLabel>
                </MarkerContent>
              </MapMarker>
            )}

            {/* Replay end marker */}
            {view === "replay" && routePositions.at(-1) && (
              <MapMarker
                longitude={routePositions.at(-1)!.longitude}
                latitude={routePositions.at(-1)!.latitude}
              >
                <MarkerContent>
                  <div className="flex size-8 items-center justify-center rounded-full border-4 border-red-400/20 bg-red-500 text-white shadow-lg">
                    <MapPinned className="size-3" />
                  </div>
                  <MarkerLabel position="bottom">End</MarkerLabel>
                </MarkerContent>
              </MapMarker>
            )}

            {/* Animated vehicle marker — current playback position */}
            {view === "replay" &&
              fleet.currentPlaybackPosition &&
              fleet.selectedDevice &&
              (() => {
                const ReplayDeviceIcon = getDeviceIcon(
                  fleet.selectedDevice.category
                )
                return (
                  <MapMarker
                    longitude={fleet.currentPlaybackPosition.longitude}
                    latitude={fleet.currentPlaybackPosition.latitude}
                  >
                    <MarkerContent>
                      <div className="relative flex size-10 items-center justify-center">
                        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                        <div className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-primary/30 bg-primary text-primary-foreground shadow-xl">
                          <ReplayDeviceIcon className="size-4" />
                          {typeof fleet.selectedDevice?.attributes
                            ?.deviceImage === "string" && (
                            <AuthImage
                              src={deviceImageUrl(
                                fleet.selectedDevice.uniqueId,
                                fleet.selectedDevice.attributes.deviceImage
                              )}
                              alt={fleet.selectedDevice.name}
                              className="absolute inset-0 z-10 size-full bg-background object-cover"
                            />
                          )}
                        </div>
                      </div>
                      <MarkerLabel position="bottom">
                        {toKph(fleet.currentPlaybackPosition.speed)} km/h
                      </MarkerLabel>
                    </MarkerContent>
                  </MapMarker>
                )
              })()}

            {/* Replay event markers */}
            {view === "replay" &&
              fleet.eventMarkers.map(({ event, position }) =>
                position ? (
                  <MapMarker
                    key={event.id}
                    longitude={position.longitude}
                    latitude={position.latitude}
                  >
                    <MarkerContent>
                      <div className="flex size-8 items-center justify-center rounded-full border-4 border-amber-400/20 bg-amber-500 text-white shadow-lg">
                        <Zap className="size-3" />
                      </div>
                      <MarkerLabel position="bottom">{event.type}</MarkerLabel>
                    </MarkerContent>
                    <MarkerPopup className="w-52 p-0">
                      <div className="space-y-1 p-3">
                        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Event
                        </span>
                        <h3 className="leading-tight font-semibold text-foreground">
                          {event.type}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(event.eventTime)}
                        </p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                ) : null
              )}
            {/* Replay stop markers */}
            {view === "replay" &&
              fleet.fleet.stops.map((stop) => (
                <MapMarker
                  key={`stop-${stop.startTime}`}
                  longitude={stop.lon}
                  latitude={stop.lat}
                >
                  <MarkerContent>
                    <div className="flex size-6 items-center justify-center rounded-full border-2 border-orange-400/30 bg-orange-500 text-white shadow-lg">
                      <StopCircle className="size-3" />
                    </div>
                    <MarkerLabel position="bottom">
                      {durationLabel(stop.duration ? stop.duration * 1000 : 0)}
                    </MarkerLabel>
                  </MarkerContent>
                  <MarkerPopup className="w-52 p-0">
                    <div className="space-y-1 p-3">
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Stop
                      </span>
                      <h3 className="leading-tight font-semibold text-foreground">
                        {durationLabel(
                          stop.duration ? stop.duration * 1000 : 0
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {stop.address ??
                          `${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(stop.startTime)}
                      </p>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              ))}

            {/* Geofence name pins — hidden while drawing so they don't clutter vertex placement */}
            {!isDrawing && fleet.fleet.geofences.map((gf) => {
              const center = parseGeofenceCenter(gf.area)
              if (!center) return null
              return (
                <Fragment key={gf.id}>
                  <MapMarker longitude={center[0]} latitude={center[1]}>
                    <MarkerContent>
                      <div className="flex size-6 items-center justify-center rounded-full border-2 border-violet-400/30 bg-violet-500/80 text-white">
                        <Fence className="size-3" />
                      </div>
                      <MarkerLabel position="bottom">{gf.name}</MarkerLabel>
                    </MarkerContent>
                  </MapMarker>
                </Fragment>
              )
            })}
          </Map>

          {/* Drawing instruction overlay */}
          {isDrawing && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border/60 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">
                  <Pencil className="size-3.5" />
                </div>
                <div className="text-sm">
                  <span className="font-medium">
                    {drawVertices.length === 0
                      ? "Click on the map to place vertices"
                      : drawVertices.length < 3
                        ? `${drawVertices.length} point${drawVertices.length > 1 ? "s" : ""} — need at least 3`
                        : `${drawVertices.length} points`}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    {drawVertices.length >= 3 && "· click to add more"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={handleUndoVertex}
                    disabled={drawVertices.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 bg-violet-500 px-3 text-xs text-white hover:bg-violet-600"
                    onClick={finishDrawing}
                    disabled={drawVertices.length < 3}
                  >
                    Finish
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Replay playback controller overlay */}
          {view === "replay" && (
            <ReplayController
              positions={fleet.selectedTripPositions}
              playbackIndex={fleet.playbackIndex}
              isPlaying={fleet.isPlaying}
              playbackSpeed={fleet.playbackSpeed}
              currentPosition={fleet.currentPlaybackPosition}
              tripStartTime={fleet.selectedTrip?.startTime}
              tripEndTime={fleet.selectedTrip?.endTime}
              onPlayPause={fleet.handlePlayPause}
              onScrub={fleet.handleScrub}
              onSetSpeed={fleet.handleSetPlaybackSpeed}
            />
          )}

          {/* Live telemetry floating panel */}
          {view === "live" && (
            <LiveTelemetryPanel
              selectedDevice={fleet.selectedDevice}
              selectedPosition={fleet.selectedPosition}
              events={fleet.fleet.events}
              onClose={() => fleet.setSelectedDeviceId(0)}
              onViewReplay={() => setView("replay")}
              onDeviceUpdate={() => fleet.handleRefresh()}
            />
          )}
        </div>

        {/* Right sidebar — Replay */}
        {view === "replay" &&
          (replayCollapsed ? (
            <aside className="flex shrink-0 flex-col items-center border-l border-border/40 bg-background py-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setReplayCollapsed(false)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </aside>
          ) : (
            <aside className="flex w-[320px] shrink-0 flex-col border-l border-border/40 bg-background">
              {/* Replay window header */}
              <div className="flex items-start justify-between gap-2 border-b border-border/40 px-4 py-3">
                <div>
                  <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                    Replay window
                  </p>
                  <p className="font-display text-base font-bold">
                    {fleet.selectedDevice?.name ?? "Route replay"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fleet.selectedTrip
                      ? `${formatTimestamp(fleet.selectedTrip.startTime)} to ${formatTimestamp(fleet.selectedTrip.endTime)}`
                      : "Load route data to inspect trip history"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setReplayCollapsed(true)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <ReplayPanel
                routeWindow={fleet.routeWindow}
                onRouteWindowChange={fleet.setRouteWindow}
                trips={fleet.fleet.trips}
                selectedTripIndex={fleet.selectedTripIndex}
                onSelectTrip={fleet.setSelectedTripIndex}
                isConnected={fleet.connectionState === "connected"}
                isLoadingReplay={fleet.isLoadingReplay}
                onLoadReplay={fleet.handleLoadReplay}
                deviceId={fleet.selectedDeviceId}
              />

              <TripTable trips={fleet.fleet.trips} />
              <StopTable stops={fleet.fleet.stops} />
            </aside>
          ))}
      </div>

      {/* Connection error toast */}
      {fleet.connectionError && !showSettings && (
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive shadow-lg backdrop-blur">
            {fleet.connectionError}
          </div>
        </div>
      )}

      {/* Save drawn geofence dialog */}
      <Dialog open={showDrawSave} onOpenChange={setShowDrawSave}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Geofence</DialogTitle>
            <DialogDescription>
              {drawVertices.length} vertices drawn. Give this zone a name to
              save it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name (required)"
              value={drawSaveName}
              onChange={(e) => setDrawSaveName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={drawSaveDesc}
              onChange={(e) => setDrawSaveDesc(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDrawSave(false)
                setIsDrawing(true)
              }}
              disabled={drawSaving}
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleSaveDrawnGeofence}
              disabled={!drawSaveName || drawSaving}
            >
              {drawSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}
