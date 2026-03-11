import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { TraccarReportStop } from "@/lib/traccar"
import { durationLabel, ensureArray, formatTimestamp } from "@/lib/utils"

type StopTableProps = {
  stops: TraccarReportStop[]
}

export function StopTable({ stops }: StopTableProps) {
  const safeStops = ensureArray<TraccarReportStop>(stops)

  if (safeStops.length === 0) {
    return null
  }

  return (
    <div className="border-t border-border/40 px-4 py-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Stops</h3>
        <p className="text-xs text-muted-foreground">
          Where and how long the device was stationary.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeStops.map((stop) => (
            <TableRow key={`${stop.startTime}-${stop.endTime}`}>
              <TableCell>{formatTimestamp(stop.startTime)}</TableCell>
              <TableCell>
                {durationLabel(stop.duration ? stop.duration * 1000 : 0)}
              </TableCell>
              <TableCell className="max-w-[160px] truncate">
                {stop.address ??
                  `${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
