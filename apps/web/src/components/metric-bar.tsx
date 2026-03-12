import { Activity } from "@/components/icons"
import type { TraccarDevice } from "@/lib/traccar"

type MetricBarProps = {
  devices: TraccarDevice[]
}

export function MetricBar({ devices }: MetricBarProps) {
  const activeCount = devices.filter((d) => d.status === "online").length
  return (
    <div className="flex items-center gap-5">
      <MetricItem
        icon={Activity}
        label="Active units"
        value={`${activeCount} / ${devices.length}`}
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
        <p className="text-sm leading-tight font-bold">{value}</p>
      </div>
    </div>
  )
}
