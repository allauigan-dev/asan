import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { MapPinned } from "@/components/icons"
import type { TraccarReportTrip } from "@/lib/traccar"
import type { RouteWindow } from "@/hooks/use-fleet"
import {
  distanceInKm,
  durationLabel,
  ensureArray,
  formatTimestamp,
  toKph,
} from "@/lib/utils"

type ReplayPanelProps = {
  routeWindow: RouteWindow
  onRouteWindowChange: (window: RouteWindow) => void
  trips: TraccarReportTrip[]
  selectedTripIndex: number
  onSelectTrip: (index: number) => void
  isConnected: boolean
  isLoadingReplay: boolean
  onLoadReplay: () => void
}

export function ReplayPanel({
  routeWindow,
  onRouteWindowChange,
  trips,
  selectedTripIndex,
  onSelectTrip,
  isConnected,
  isLoadingReplay,
  onLoadReplay,
}: ReplayPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Controls */}
      <div className="space-y-3 border-b border-border/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Replay filters</h3>
          <p className="text-xs text-muted-foreground">
            Query Traccar reports for route, trips, summary, and events.
          </p>
        </div>
        <Input
          type="datetime-local"
          value={routeWindow.from}
          onChange={(event) =>
            onRouteWindowChange({ ...routeWindow, from: event.target.value })
          }
        />
        <Input
          type="datetime-local"
          value={routeWindow.to}
          onChange={(event) =>
            onRouteWindowChange({ ...routeWindow, to: event.target.value })
          }
        />
        <Button
          className="w-full"
          onClick={onLoadReplay}
          disabled={!isConnected || isLoadingReplay}
        >
          <MapPinned className="size-4" />
          {isLoadingReplay ? "Loading replay..." : "Update route replay"}
        </Button>
      </div>

      {/* Trip list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 px-4 py-3">
          {isLoadingReplay && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Loading route data...
            </p>
          )}
          {!isLoadingReplay &&
            ensureArray<TraccarReportTrip>(trips).map((trip, index) => (
              <button
                key={`${trip.startTime}-${trip.endTime}`}
                type="button"
                onClick={() => onSelectTrip(index)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  index === selectedTripIndex
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/70 bg-background/55 hover:bg-muted/55"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatTimestamp(trip.startTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {distanceInKm(trip.distance)} •{" "}
                      {durationLabel(trip.duration)}
                    </p>
                  </div>
                  <Badge variant="outline">{toKph(trip.maxSpeed)} km/h</Badge>
                </div>
              </button>
            ))}
          {!isLoadingReplay && trips.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No trips in this window
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
