import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { TraccarReportTrip } from "@/lib/traccar"
import {
  distanceInKm,
  durationLabel,
  ensureArray,
  formatTimestamp,
  toKph,
} from "@/lib/utils"

type TripTableProps = {
  trips: TraccarReportTrip[]
}

export function TripTable({ trips }: TripTableProps) {
  const safeTrips = ensureArray<TraccarReportTrip>(trips)

  if (safeTrips.length === 0) {
    return null
  }

  return (
    <div className="border-t border-border/40 px-4 py-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Trip breakdown</h3>
        <p className="text-xs text-muted-foreground">
          Summary from Traccar report endpoints.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Max speed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeTrips.map((trip) => (
            <TableRow key={`${trip.startTime}-${trip.endTime}`}>
              <TableCell>{formatTimestamp(trip.startTime)}</TableCell>
              <TableCell>{formatTimestamp(trip.endTime)}</TableCell>
              <TableCell>{distanceInKm(trip.distance)}</TableCell>
              <TableCell>{durationLabel(trip.duration)}</TableCell>
              <TableCell>{toKph(trip.maxSpeed)} km/h</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
