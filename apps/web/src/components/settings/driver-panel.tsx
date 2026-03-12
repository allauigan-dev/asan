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
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Person, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createDriver,
  deleteDriver,
  getDrivers,
  updateDriver,
  type TraccarDriver,
} from "@/lib/traccar"

export function DriverPanel() {
  const [drivers, setDrivers] = useState<TraccarDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<TraccarDriver | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    setError(null)
    getDrivers(config)
      .then((data) => {
        setDrivers(data)
      })
      .catch((err: unknown) => {
        setDrivers([])
        setError(err instanceof Error ? err.message : "Failed to load drivers")
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Drivers</h2>
            <p className="text-xs text-muted-foreground">
              Manage drivers and assign them to devices
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
            Add Driver
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-xs text-destructive">{error}</p>
        ) : drivers.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No drivers configured
          </p>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(driver)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Person className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.uniqueId}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete driver "${driver.name}"?`)) return
                      const config = toConfig(readStoredConfig())
                      deleteDriver(config, driver.id).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DriverFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function DriverFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarDriver | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [uniqueId, setUniqueId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setUniqueId(item?.uniqueId ?? "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !uniqueId) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      if (item) {
        await updateDriver(config, item.id, { ...item, name, uniqueId })
      } else {
        await createDriver(config, { name, uniqueId })
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
          <DialogTitle>{item ? "Edit Driver" : "Add Driver"}</DialogTitle>
          <DialogDescription>
            {item ? "Update driver details." : "Register a new driver."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Unique ID (iButton, RFID, etc.)"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
            disabled={!!item}
          />
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !uniqueId || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
