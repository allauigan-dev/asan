import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Plus, Trash, Wrench } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createMaintenance,
  deleteMaintenance,
  getMaintenance,
  updateMaintenance,
  type TraccarMaintenance,
} from "@/lib/traccar"

export function MaintenancePanel() {
  const [items, setItems] = useState<TraccarMaintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarMaintenance | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getMaintenance(config)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Maintenance</h2>
            <p className="text-xs text-muted-foreground">
              Schedule maintenance based on distance or engine hours
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null)
              setShowDialog(true)
            }}
          >
            <Plus className="size-4" />
            Add Rule
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No maintenance rules configured
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <Card
                key={m.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(m)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Wrench className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.type === "totalDistance"
                          ? "Distance"
                          : "Engine Hours"}{" "}
                        — every {m.period}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete "${m.name}"?`)) return
                      const config = toConfig(readStoredConfig())
                      deleteMaintenance(config, m.id).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <MaintenanceFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function MaintenanceFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarMaintenance | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState("totalDistance")
  const [start, setStart] = useState("")
  const [period, setPeriod] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setType(item?.type ?? "totalDistance")
      setStart(item ? String(item.start) : "")
      setPeriod(item ? String(item.period) : "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !period) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      const payload = {
        name,
        type,
        start: Number(start) || 0,
        period: Number(period),
      }
      if (item) {
        await updateMaintenance(config, item.id, { ...item, ...payload })
      } else {
        await createMaintenance(config, payload)
      }
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Maintenance" : "Add Maintenance"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update maintenance rule."
              : "Create a maintenance schedule."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalDistance">Total Distance</SelectItem>
              <SelectItem value="hours">Engine Hours</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Start value"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Period (interval)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !period || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
