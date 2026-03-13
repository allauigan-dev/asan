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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { ChevronDown, Plus, Terminal, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createSavedCommand,
  deleteSavedCommand,
  getCommands,
  getCommandTypes,
  updateSavedCommand,
  type TraccarCommand,
  type TraccarCommandType,
} from "@/lib/traccar"

export function CommandPanel() {
  const [commands, setCommands] = useState<TraccarCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<TraccarCommand | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    getCommands(config)
      .then(setCommands)
      .catch(() => setCommands([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Saved Commands</h2>
            <p className="text-xs text-muted-foreground">
              Manage reusable commands that can be sent to devices
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
            Add Command
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : commands.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No saved commands configured
          </p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <Card
                key={cmd.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(cmd)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Terminal className="size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {cmd.description || cmd.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cmd.type}
                        {cmd.textChannel ? " • SMS" : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (
                        !confirm(
                          `Delete command "${cmd.description || cmd.type}"?`
                        )
                      )
                        return
                      const config = toConfig(readStoredConfig())
                      deleteSavedCommand(config, cmd.id!).then(load)
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CommandFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function CommandFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarCommand | null
  onSaved: () => void
}) {
  const [description, setDescription] = useState("")
  const [type, setType] = useState("")
  const [textChannel, setTextChannel] = useState(false)
  const [attributes, setAttributes] = useState("")
  const [types, setTypes] = useState<TraccarCommandType[]>([])
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDescription(item?.description ?? "")
      setType(item?.type ?? "")
      setTextChannel(item?.textChannel ?? false)
      setAttributes(
        item?.attributes && Object.keys(item.attributes).length > 0
          ? JSON.stringify(item.attributes)
          : ""
      )
      const config = toConfig(readStoredConfig())
      getCommandTypes(config)
        .then(setTypes)
        .catch(() => {})
    }
  }, [open, item])

  async function handleSave() {
    if (!type) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      const payload: TraccarCommand = {
        description,
        type,
        textChannel,
        attributes: attributes.trim() ? JSON.parse(attributes) : {},
      }
      if (item) {
        await updateSavedCommand(config, item.id!, { ...item, ...payload })
      } else {
        await createSavedCommand(config, payload)
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
          <DialogTitle>{item ? "Edit Command" : "Add Command"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update the saved command."
              : "Create a new saved command template."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Description (optional label)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Popover open={typePickerOpen} onOpenChange={setTypePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
              >
                {type || "Select command type"}
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search command types…" />
                <CommandList>
                  <CommandEmpty>No command types found.</CommandEmpty>
                  <CommandGroup>
                    {types.map((t) => (
                      <CommandItem
                        key={t.type}
                        value={t.type}
                        data-checked={type === t.type}
                        onSelect={(value) => {
                          setType(value)
                          setTypePickerOpen(false)
                        }}
                      >
                        {t.type}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="space-y-1">
            <Input
              placeholder='Attributes JSON (e.g. {"data": "value"})'
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Optional JSON object for command-specific parameters
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={textChannel}
              onChange={(e) => setTextChannel(e.target.checked)}
            />
            Send via SMS (text channel)
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
