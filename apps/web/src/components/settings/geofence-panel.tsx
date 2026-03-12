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

import { Fence, Pencil, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createGeofence,
  deleteGeofence,
  getDevices,
  getGeofences,
  updateGeofence,
  type TraccarDevice,
  type TraccarGeofence,
} from "@/lib/traccar"
import { ExpandableDeviceList } from "./expandable-device-list"

export function GeofencePanel({
  onDrawGeofence,
}: {
  onDrawGeofence?: () => void
}) {
  const [geofences, setGeofences] = useState<TraccarGeofence[]>([])
  const [devices, setDevices] = useState<TraccarDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarGeofence | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    Promise.all([getGeofences(config), getDevices(config)])
      .then(([gf, dev]) => {
        setGeofences(gf)
        setDevices(dev)
      })
      .catch(() => {
        setGeofences([])
        setDevices([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id: number) {
    if (!confirm("Delete this geofence?")) return
    const config = toConfig(readStoredConfig())
    await deleteGeofence(config, id)
    load()
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Geofences</h2>
            <p className="text-xs text-muted-foreground">
              Manage geographic zones for enter/exit alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDrawGeofence && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDrawGeofence}
                title="Draw polygon on the map"
              >
                <Pencil className="size-4" />
                Draw on Map
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditItem(null)
                setShowDialog(true)
              }}
            >
              <Plus className="size-4" />
              Add Manually
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : geofences.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No geofences configured
          </p>
        ) : (
          <div className="space-y-2">
            {geofences.map((gf) => (
              <Card key={gf.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Fence className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{gf.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {gf.area.substring(0, 60)}
                          {gf.area.length > 60 ? "…" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setEditItem(gf)
                          setShowDialog(true)
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleDelete(gf.id)}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <ExpandableDeviceList
                    entityId={gf.id}
                    entityType="geofence"
                    connectedDeviceIds={[]}
                    allDevices={devices}
                    onConnectionsChange={load}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <GeofenceFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function GeofenceFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarGeofence | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [area, setArea] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setDescription(item?.description ?? "")
      setArea(item?.area ?? "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !area) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      if (item) {
        await updateGeofence(config, item.id, {
          ...item,
          name,
          description,
          area,
        })
      } else {
        await createGeofence(config, { name, description, area })
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
          <DialogTitle>{item ? "Edit Geofence" : "Add Geofence"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update the geofence properties."
              : "Create a new geofence zone."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="space-y-1">
            <Input
              placeholder="CIRCLE (lat lon, radius) or POLYGON ((lon lat, …))"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              WKT format: CIRCLE (lat lon, radiusMeters) or POLYGON ((lon1 lat1,
              lon2 lat2, ...))
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !area || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
