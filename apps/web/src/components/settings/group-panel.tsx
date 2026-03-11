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

import { FolderOpen, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
  type TraccarGroup,
} from "@/lib/traccar"

export function GroupPanel() {
  const [groups, setGroups] = useState<TraccarGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarGroup | null>(null)
  const [showDialog, setShowDialog] = useState(false)

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
              setShowDialog(true)
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
                  setEditItem(g)
                  setShowDialog(true)
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete group "${g.name}"?`)) return
                      const config = toConfig(readStoredConfig())
                      deleteGroup(config, g.id).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <GroupFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          groups={groups}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

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

  // Exclude current item from parent options to prevent self-reference
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
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Parent group (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
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
