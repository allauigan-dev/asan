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

import { Bell, Plus, Send, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createNotification,
  deleteNotification,
  getNotifications,
  getNotificationTypes,
  testNotification,
  updateNotification,
  type TraccarNotification,
  type TraccarNotificationType,
} from "@/lib/traccar"

export function NotificationPanel() {
  const [items, setItems] = useState<TraccarNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarNotification | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getNotifications(config)
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
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              Configure event-based alerts and delivery channels
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
            Add Notification
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No notifications configured
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(n)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{n.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.notificators || "web"} {n.always ? "• always" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Test"
                      onClick={(e) => {
                        e.stopPropagation()
                        const config = toConfig(readStoredConfig())
                        testNotification(config)
                      }}
                    >
                      <Send className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirm("Delete this notification?")) return
                        const config = toConfig(readStoredConfig())
                        deleteNotification(config, n.id).then(load)
                      }}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <NotificationFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function NotificationFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarNotification | null
  onSaved: () => void
}) {
  const [type, setType] = useState("")
  const [notificators, setNotificators] = useState("")
  const [always, setAlways] = useState(false)
  const [types, setTypes] = useState<TraccarNotificationType[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType(item?.type ?? "")
      setNotificators(item?.notificators ?? "")
      setAlways(item?.always ?? false)
      const config = toConfig(readStoredConfig())
      getNotificationTypes(config)
        .then(setTypes)
        .catch(() => {})
    }
  }, [open, item])

  async function handleSave() {
    if (!type) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      if (item) {
        await updateNotification(config, item.id, {
          ...item,
          type,
          notificators,
          always,
        })
      } else {
        await createNotification(config, { type, notificators, always })
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
            {item ? "Edit Notification" : "Add Notification"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update notification settings."
              : "Create a new notification rule."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.type} value={t.type}>
                  {t.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Notificators (web, mail, sms, firebase)"
            value={notificators}
            onChange={(e) => setNotificators(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={always}
              onChange={(e) => setAlways(e.target.checked)}
            />
            Always notify (all devices)
          </label>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!type || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
