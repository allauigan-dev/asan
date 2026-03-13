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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import {
  Edit,
  FolderOpen,
  Person,
  Plus,
  Trash,
  Truck,
} from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createGroup,
  deleteGroup,
  getDevices,
  getDrivers,
  getGroups,
  getGroupUsers,
  updateGroup,
  type TraccarDevice,
  type TraccarDriver,
  type TraccarFullUser,
  type TraccarGroup,
} from "@/lib/traccar"

export function GroupPanel() {
  const [groups, setGroups] = useState<TraccarGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarGroup | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [membersGroup, setMembersGroup] = useState<TraccarGroup | null>(null)
  const [showMembersDialog, setShowMembersDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getGroups(config)
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Groups</h2>
            <p className="text-xs text-muted-foreground">
              Organize devices into groups
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null)
              setShowEditDialog(true)
            }}
          >
            <Plus className="size-4" />
            Add Group
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No groups configured
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer"
                onClick={() => {
                  setMembersGroup(g)
                  setShowMembersDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{g.name}</p>
                      {g.groupId ? (
                        <p className="text-xs text-muted-foreground">
                          Parent:{" "}
                          {groups.find((p) => p.id === g.groupId)?.name ??
                            g.groupId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditItem(g)
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirm(`Delete group "${g.name}"?`)) return
                        const config = toConfig(readStoredConfig())
                        deleteGroup(config, g.id).then(load)
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

        <GroupFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          item={editItem}
          groups={groups}
          onSaved={load}
        />

        <GroupMembersDialog
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
          group={membersGroup}
        />
      </div>
    </ScrollArea>
  )
}

// ── Group members dialog ───────────────────────────────────────────────────────

function GroupMembersDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: TraccarGroup | null
}) {
  const [devices, setDevices] = useState<TraccarDevice[]>([])
  const [drivers, setDrivers] = useState<TraccarDriver[]>([])
  const [users, setUsers] = useState<TraccarFullUser[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!open || !group) return
    const config = toConfig(readStoredConfig())

    setLoadingDevices(true)
    getDevices(config)
      .then((all) => setDevices(all.filter((d) => d.groupId === group.id)))
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false))

    setLoadingDrivers(true)
    getDrivers(config, group.id)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoadingDrivers(false))

    setLoadingUsers(true)
    getGroupUsers(config, group.id)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [open, group])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group?.name ?? "Group"}</DialogTitle>
          <DialogDescription>
            Devices, drivers, and users linked to this group
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="devices">
          <TabsList>
            <TabsTrigger value="devices">
              <Truck className="mr-1.5 size-3.5" />
              Devices
              {!loadingDevices && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {devices.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drivers">
              <Person className="mr-1.5 size-3.5" />
              Drivers
              {!loadingDrivers && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {drivers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Person className="mr-1.5 size-3.5" />
              Users
              {!loadingUsers && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {users.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-3">
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5 pr-1">
                {loadingDevices ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : devices.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No devices in this group
                  </p>
                ) : (
                  devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Truck className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.uniqueId}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="drivers" className="mt-3">
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5 pr-1">
                {loadingDrivers ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : drivers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No drivers linked to this group
                  </p>
                ) : (
                  drivers.map((dr) => (
                    <div
                      key={dr.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Person className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {dr.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {dr.uniqueId}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="users" className="mt-3">
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5 pr-1">
                {loadingUsers ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : users.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No users linked to this group
                  </p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Person className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.name || u.email}
                        </p>
                        {u.name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ── Group form dialog ──────────────────────────────────────────────────────────

function GroupFormDialog({
  open,
  onOpenChange,
  item,
  groups,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarGroup | null
  groups: TraccarGroup[]
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [groupId, setGroupId] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "")
      setGroupId(item?.groupId ? String(item.groupId) : "")
    }
  }, [open, item])

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      const payload = {
        name,
        groupId: groupId ? Number(groupId) : undefined,
      }
      if (item) {
        await updateGroup(config, item.id, { ...item, ...payload })
      } else {
        await createGroup(config, payload)
      }
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const parentOptions = groups.filter((g) => g.id !== item?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Group" : "Add Group"}</DialogTitle>
          <DialogDescription>
            {item ? "Update group details." : "Create a new device group."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            value={groupId || "none"}
            onValueChange={(v) => setGroupId(v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Parent group (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {parentOptions.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
