import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { ChevronLeft, ChevronRight } from "@/components/icons"
import type {
  TraccarDevice,
  TraccarEvent,
  TraccarPosition,
} from "@/lib/traccar"
import {
  ensureArray,
  formatTimestamp,
  getBatteryLevel,
  relativeTime,
} from "@/lib/utils"

type LivePanelProps = {
  selectedDevice: TraccarDevice | null
  selectedPosition: TraccarPosition | null
  events: TraccarEvent[]
}

export function LivePanel({
  selectedDevice,
  selectedPosition,
  events,
}: LivePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <aside className="flex shrink-0 flex-col items-center border-l border-border/40 bg-background py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-border/40 bg-background">
      {/* Selected asset header */}
      <div className="flex items-start justify-between gap-2 border-b border-border/40 px-4 py-3">
        <div>
          <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            Selected asset
          </p>
          <p className="font-display text-base font-bold">
            {selectedDevice?.name ?? "No device selected"}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedDevice?.uniqueId ?? "Choose an asset"} •{" "}
            {relativeTime(selectedPosition?.fixTime)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setCollapsed(true)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Telemetry */}
      <div className="px-4 py-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Live telemetry</h3>
          <p className="text-xs text-muted-foreground">
            Current snapshot for the selected device.
          </p>
        </div>

        {selectedDevice && selectedPosition ? (
          <div className="space-y-4">
            <InfoRow
              label="Driver / asset"
              value={`${selectedDevice.name} · ${selectedDevice.uniqueId}`}
            />
            <InfoRow
              label="Last fix"
              value={formatTimestamp(
                selectedPosition.fixTime ?? selectedPosition.deviceTime
              )}
            />
            <InfoRow
              label="Heading"
              value={`${Math.round(selectedPosition.course ?? 0)}°`}
            />
            <InfoRow
              label="Battery"
              value={
                getBatteryLevel(selectedPosition) !== null
                  ? `${getBatteryLevel(selectedPosition)}%`
                  : "Unavailable"
              }
            />
            <InfoRow
              label="Coordinates"
              value={`${selectedPosition.latitude.toFixed(5)}, ${selectedPosition.longitude.toFixed(5)}`}
            />

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                Recent events
              </p>
              {ensureArray<TraccarEvent>(events)
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-border/70 bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{event.type}</p>
                      <Badge variant="outline">
                        {formatTimestamp(event.eventTime)}
                      </Badge>
                    </div>
                  </div>
                ))}
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No recent events
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
          </div>
        )}
      </div>
    </aside>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
