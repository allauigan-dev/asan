import { useDeferredValue, useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { ChevronLeft, ChevronRight, Search, Truck } from "@/components/icons"
import type { TraccarDevice, TraccarPosition } from "@/lib/traccar"
import {
  getBatteryLevel,
  relativeTime,
  statusVariant,
  toKph,
} from "@/lib/utils"
import type { StatusFilter } from "@/hooks/use-fleet"

type FleetSidebarProps = {
  devices: TraccarDevice[]
  positionsByDevice: Map<number, TraccarPosition>
  selectedDeviceId: number
  onSelectDevice: (id: number) => void
}

export function FleetSidebar({
  devices,
  positionsByDevice,
  selectedDeviceId,
  onSelectDevice,
}: FleetSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearch = useDeferredValue(searchTerm)

  const filteredDevices = devices.filter((device) => {
    const matchesStatus =
      statusFilter === "all" ? true : device.status === statusFilter
    const needle = deferredSearch.trim().toLowerCase()
    const matchesSearch =
      needle.length === 0
        ? true
        : [device.name, device.uniqueId, device.model, device.contact]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(needle))
    return matchesStatus && matchesSearch
  })

  if (collapsed) {
    return (
      <aside className="flex shrink-0 flex-col items-center border-r border-border/40 bg-background py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/40 bg-background">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fleet
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search driver, asset, or unit ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(["all", "online", "unknown", "offline"] as StatusFilter[]).map(
            (value) => (
              <Button
                key={value}
                variant={statusFilter === value ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setStatusFilter(value)}
              >
                {value}
              </Button>
            )
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        <div className="space-y-2">
          {filteredDevices.map((device) => {
            const position = positionsByDevice.get(device.id)
            const battery = getBatteryLevel(position)
            const active = device.id === selectedDeviceId
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => onSelectDevice(device.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-primary/30 bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-border/70 bg-background/55 hover:bg-muted/55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={statusVariant(device.status ?? "unknown")}
                      >
                        {device.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {device.uniqueId}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.model ?? "Tracked device"} •{" "}
                      {toKph(position?.speed)} km/h
                    </p>
                  </div>
                  <Truck className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {relativeTime(position?.fixTime ?? position?.deviceTime)}
                  </span>
                  <span>
                    {battery !== null
                      ? `${battery}% battery`
                      : "No battery data"}
                  </span>
                </div>
              </button>
            )
          })}
          {filteredDevices.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No devices found
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
