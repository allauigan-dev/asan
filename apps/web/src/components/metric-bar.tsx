import { Activity, Gauge, Zap } from "@/components/icons"
import type {
  TraccarDevice,
  TraccarPosition,
  TraccarReportSummary,
  TraccarReportTrip,
} from "@/lib/traccar"
import { distanceInKm, toKph } from "@/lib/utils"

type MetricBarProps = {
  devices: TraccarDevice[]
  selectedPosition: TraccarPosition | null
  selectedSummary: TraccarReportSummary | null
  selectedTrip: TraccarReportTrip | null
}

export function MetricBar({
  devices,
  selectedPosition,
  selectedSummary,
  selectedTrip,
}: MetricBarProps) {
  return (
    <div className="flex items-center gap-5">
      <MetricItem
        icon={Activity}
        label="Active units"
        value={String(devices.filter((d) => d.status === "online").length)}
      />
      <MetricItem
        icon={Gauge}
        label="Selected speed"
        value={`${toKph(selectedPosition?.speed)} km/h`}
      />
      <MetricItem
        icon={Zap}
        label="Trip distance"
        value={distanceInKm(
          selectedSummary?.distance ?? selectedTrip?.distance
        )}
      />
    </div>
  )
}

function MetricItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-[10px] leading-tight tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-sm font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}
