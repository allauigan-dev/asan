import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Map,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  type MapRef,
} from "@workspace/ui/components/ui/map"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { FleetSidebar } from "@/components/fleet-sidebar"
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPinned,
  Moon,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Settings,
  SunMedium,
  Truck,
  Zap,
} from "@/components/icons"
import { LivePanel } from "@/components/live-panel"
import { MetricBar } from "@/components/metric-bar"
import { ReplayController } from "@/components/replay-controller"
import { ReplayPanel } from "@/components/replay-panel"
import { SettingsPage } from "@/components/settings-page"
import { TripTable } from "@/components/trip-table"
import { AuthImage } from "@/components/auth-image"
import { useFleet, type View } from "@/hooks/use-fleet"
import { useTheme } from "@/components/theme-provider"
import {
  formatTimestamp,
  getBatteryLevel,
  relativeTime,
  toKph,
} from "@/lib/utils"

export function App() {
  const fleet = useFleet()

  function deviceImageUrl(uniqueId: string, filename: string) {
    return `/api/media/${uniqueId}/${filename}`
  }

  const [view, setView] = useState<View>("live")
  const [showSettings, setShowSettings] = useState(false)
  const mapRef = useRef<MapRef | null>(null)
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const lastFlewToDeviceId = useRef<number | null>(null)
  const [replayCollapsed, setReplayCollapsed] = useState(false)
  const [mapZoom, setMapZoom] = useState(11.2)

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
    mapRef.current.flyTo({
      center: [
        fleet.selectedPosition.longitude,
        fleet.selectedPosition.latitude,
      ],
      ...(isNewDevice ? { zoom: 11.8 } : {}),
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
      <div className="flex h-svh w-svw flex-col items-center justify-center overflow-hidden bg-muted/40 text-sm">
        <SettingsPage
          connectionState={fleet.connectionState}
          connectionError={fleet.connectionError}
          onConnect={fleet.handleConnect}
        />
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

        <MetricBar
          devices={fleet.devices}
          selectedPosition={fleet.selectedPosition}
          selectedSummary={fleet.selectedSummary}
          selectedTrip={fleet.selectedTrip}
        />

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

      {/* ── Body: left sidebar | map | right sidebar ── */}
      <div className="flex min-h-0 flex-1">
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
          onClick={(e) => {
            const canvas = mapRef.current?.getCanvas()
            if (canvas && e.target === canvas) {
              fleet.setSelectedDeviceId(0)
            }
          }}
        >
          <Map
            ref={mapRef}
            className="absolute inset-0 h-full w-full"
            center={[120.9842, 14.5986]}
            zoom={11.2}
            attributionControl={false}
            onViewportChange={(vp) => setMapZoom(vp.zoom)}
          >
            <MapControls
              position="bottom-right"
              className="right-4 bottom-4 z-20"
              showZoom
              showLocate
              showFullscreen
            />

            {/* Live cluster layer (zoomed out) */}
            {view === "live" && (
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
              mapZoom > CLUSTER_MAX_ZOOM &&
              fleet.devices.map((device) => {
                const position = fleet.positionsByDevice.get(device.id)
                if (!position) return null
                const active = device.id === fleet.selectedDevice?.id
                const battery = getBatteryLevel(position)
                return (
                  <MapMarker
                    key={device.id}
                    longitude={position.longitude}
                    latitude={position.latitude}
                    onClick={() => fleet.setSelectedDeviceId(device.id)}
                  >
                    <MarkerContent>
                      <div
                        className={`relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 transition-transform hover:scale-110 ${
                          active
                            ? "border-primary/20 bg-primary text-primary-foreground"
                            : "border-background/80 bg-background text-foreground"
                        } shadow-xl`}
                      >
                        <Truck className="size-4" />
                        {typeof device.attributes?.deviceImage === "string" && (
                          <AuthImage
                            src={deviceImageUrl(device.uniqueId, device.attributes.deviceImage)}
                            alt={device.name}
                            className="absolute inset-0 z-10 size-full bg-background object-cover"
                          />
                        )}
                      </div>
                      <MarkerLabel position="bottom">
                        {device.name.split(",")[0]}
                      </MarkerLabel>
                    </MarkerContent>
                    <MarkerPopup className="w-64 p-0">
                      <div className="space-y-2 p-3">
                        <div className="flex gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              <Truck className="size-5" />
                            </div>
                            {typeof device.attributes?.deviceImage === "string" && (
                              <AuthImage
                                src={deviceImageUrl(device.uniqueId, device.attributes.deviceImage)}
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
                          <span>
                            {relativeTime(
                              position.fixTime ?? position.deviceTime
                            )}
                          </span>
                          {battery !== null && <span>{battery}% battery</span>}
                        </div>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                )
              })}

            {/* Live trail for selected device */}
            {view === "live" && fleet.selectedDeviceTrail.length > 1 && (
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
            {view === "replay" && fleet.currentPlaybackPosition && (
              <MapMarker
                longitude={fleet.currentPlaybackPosition.longitude}
                latitude={fleet.currentPlaybackPosition.latitude}
              >
                <MarkerContent>
                  <div className="relative flex size-10 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                    <div className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-primary/30 bg-primary text-primary-foreground shadow-xl">
                      <Truck className="size-4" />
                      {typeof fleet.selectedDevice?.attributes?.deviceImage === "string" && (
                        <AuthImage
                          src={deviceImageUrl(fleet.selectedDevice.uniqueId, fleet.selectedDevice.attributes.deviceImage)}
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
            )}

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
          </Map>

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
        </div>

        {/* Right sidebar — Live telemetry */}
        {view === "live" && (
          <LivePanel
            selectedDevice={fleet.selectedDevice}
            selectedPosition={fleet.selectedPosition}
            events={fleet.fleet.events}
          />
        )}

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
              />

              <TripTable trips={fleet.fleet.trips} />
            </aside>
          ))}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPage
          connectionState={fleet.connectionState}
          connectionError={fleet.connectionError}
          onConnect={(form) => {
            fleet.handleConnect(form)
            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Connection error toast */}
      {fleet.connectionError && !showSettings && (
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive shadow-lg backdrop-blur">
            {fleet.connectionError}
          </div>
        </div>
      )}
    </div>
  )
}
