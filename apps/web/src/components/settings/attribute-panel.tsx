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

import { Function, Plus, Trash } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  createComputedAttribute,
  deleteComputedAttribute,
  getComputedAttributes,
  updateComputedAttribute,
  type TraccarAttribute,
} from "@/lib/traccar"

export function AttributePanel() {
  const [items, setItems] = useState<TraccarAttribute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<TraccarAttribute | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  function load() {
    const config = toConfig(readStoredConfig())
    setLoading(true)
    setError(null)
    getComputedAttributes(config)
      .then(setItems)
      .catch((err: unknown) => {
        setItems([])
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load computed attributes"
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Computed Attributes</h2>
            <p className="text-xs text-muted-foreground">
              Define custom expressions evaluated on each position update
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
            Add Attribute
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-xs text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No computed attributes configured
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((attr) => (
              <Card
                key={attr.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditItem(attr)
                  setShowDialog(true)
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Function className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">{attr.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{attr.attribute}</span>
                        {" = "}
                        <span className="font-mono">{attr.expression}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {attr.type || "String"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirm(`Delete "${attr.description}"?`)) return
                        const config = toConfig(readStoredConfig())
                        deleteComputedAttribute(config, attr.id).then(load)
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

        <AttributeFormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          item={editItem}
          onSaved={load}
        />
      </div>
    </ScrollArea>
  )
}

function AttributeFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TraccarAttribute | null
  onSaved: () => void
}) {
  const [description, setDescription] = useState("")
  const [attribute, setAttribute] = useState("")
  const [expression, setExpression] = useState("")
  const [type, setType] = useState("String")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDescription(item?.description ?? "")
      setAttribute(item?.attribute ?? "")
      setExpression(item?.expression ?? "")
      setType(item?.type ?? "String")
    }
  }, [open, item])

  async function handleSave() {
    if (!description || !attribute || !expression) return
    setSaving(true)
    try {
      const config = toConfig(readStoredConfig())
      const payload = { description, attribute, expression, type }
      if (item) {
        await updateComputedAttribute(config, item.id, { ...item, ...payload })
      } else {
        await createComputedAttribute(config, payload)
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
            {item ? "Edit Attribute" : "Add Computed Attribute"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update the computed attribute."
              : "Define an expression evaluated on each position update."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Description (e.g. Speed in km/h)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Attribute key (e.g. speedKph)"
            value={attribute}
            onChange={(e) => setAttribute(e.target.value)}
          />
          <Input
            placeholder="Expression (e.g. speed * 1.852)"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="font-mono text-sm"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="String">String</SelectItem>
              <SelectItem value="Number">Number</SelectItem>
              <SelectItem value="Boolean">Boolean</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!description || !attribute || !expression || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
