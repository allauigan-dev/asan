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

import { Plus, Trash, Users } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  type TraccarFullUser,
} from "@/lib/traccar"

export function UserPanel() {
  const [users, setUsers] = useState<TraccarFullUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarFullUser | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getUsers(config)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Users</h2>
            <p className="text-xs text-muted-foreground">
              Manage user accounts and permissions
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
            Add User
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No users found
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Card
                key={u.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(u)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Users className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {u.name}{" "}
                        {u.administrator && (
                          <span className="text-xs text-primary">admin</span>
                        )}
                        {u.disabled && (
                          <span className="text-xs text-destructive">
                            {" "}
                            disabled
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete user "${u.name}"?`)) return
                      const config = toConfig(readStoredConfig())
                      deleteUser(config, u.id).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <UserFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function UserFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarFullUser | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [administrator, setAdministrator] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [deviceLimit, setDeviceLimit] = useState("")
  const [expirationTime, setExpirationTime] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setEmail(item?.email ?? "")
      setPassword("")
      setAdministrator(item?.administrator ?? false)
      setDisabled(item?.disabled ?? false)
      setDeviceLimit(
        item?.deviceLimit != null ? String(item.deviceLimit) : ""
      )
      setExpirationTime(
        item?.expirationTime
          ? item.expirationTime.substring(0, 16)
          : ""
      )
    }
  }, [open, item])

  async function handleSave() {
    if (!name || !email) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      const payload: Record<string, unknown> = {
        name,
        email,
        administrator,
        disabled,
        deviceLimit: deviceLimit ? Number(deviceLimit) : -1,
        expirationTime: expirationTime
          ? new Date(expirationTime).toISOString()
          : null,
      }
      if (password) payload.password = password
      if (item) {
        await updateUser(config, item.id, {
          ...item,
          ...payload,
        } as TraccarFullUser)
      } else {
        if (!password) return
        await createUser(config, payload as Omit<TraccarFullUser, "id">)
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
          <DialogTitle>{item ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {item ? "Update user details." : "Create a new user account."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder={item ? "New password (leave blank to keep)" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Device limit (-1 = unlimited)"
            value={deviceLimit}
            onChange={(e) => setDeviceLimit(e.target.value)}
          />
          <Input
            type="datetime-local"
            placeholder="Expiration"
            value={expirationTime}
            onChange={(e) => setExpirationTime(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={administrator}
              onChange={(e) => setAdministrator(e.target.checked)}
            />
            Administrator
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Disabled
          </label>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || !email || (!item && !password) || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
