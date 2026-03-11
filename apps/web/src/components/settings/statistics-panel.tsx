import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { BarChart } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import { getStatistics, type TraccarStatistics } from "@/lib/traccar"
import { formatTimestamp, toIsoValue } from "@/lib/utils"
import { createDefaultRouteWindow } from "@/lib/utils"

export function StatisticsPanel() {
  const defaultWindow = createDefaultRouteWindow()
  const [from, setFrom] = useState(defaultWindow.from)
  const [to, setTo] = useState(defaultWindow.to)
  const [stats, setStats] = useState<TraccarStatistics[]>([])
  const [loading, setLoading] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getStatistics(config, toIsoValue(from), toIsoValue(to))
      .then(setStats)
      .catch(() => setStats([]))
      .finally(() => setLoading(false))
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">Server Statistics</h2>
          <p className="text-xs text-muted-foreground">
            View server usage statistics over a time range
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={load} disabled={loading}>
            <BarChart className="size-4" />
            {loading ? "Loading…" : "Load"}
          </Button>
        </div>

        {stats.length > 0 && (
          <div className="rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Devices</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Stored</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.captureTime}>
                    <TableCell className="text-xs">
                      {formatTimestamp(s.captureTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{s.activeUsers}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{s.activeDevices}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.messagesReceived.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.messagesStored.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && stats.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Select a date range and click Load to view statistics
          </p>
        )}
      </div>
    </ScrollArea>
  )
}
