import { useEffect, useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

import { Send } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  getCommandTypes,
  getSavedCommandsForDevice,
  sendCommand,
  type TraccarCommand,
  type TraccarCommandType,
} from "@/lib/traccar"

type SendCommandDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: number
  deviceName: string
}

export function SendCommandDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
}: SendCommandDialogProps) {
  const [commandTypes, setCommandTypes] = useState<TraccarCommandType[]>([])
  const [savedCommands, setSavedCommands] = useState<TraccarCommand[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [customAttributes, setCustomAttributes] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    status: "success" | "error"
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !deviceId) return
    setLoading(true)
    setResult(null)
    setSelectedType("")
    setCustomAttributes("")

    const config = toConfig(readStoredConfig())
    Promise.all([
      getCommandTypes(config, deviceId),
      getSavedCommandsForDevice(config, deviceId).catch(() => []),
    ])
      .then(([types, saved]) => {
        setCommandTypes(types)
        setSavedCommands(saved)
      })
      .catch(() => {
        setCommandTypes([])
        setSavedCommands([])
      })
      .finally(() => setLoading(false))
  }, [open, deviceId])

  async function handleSend() {
    if (!selectedType) return
    setSending(true)
    setResult(null)

    try {
      const config = toConfig(readStoredConfig())

      const saved = savedCommands.find((c) => c.type === selectedType && c.id)
      const command: TraccarCommand = saved
        ? { ...saved, deviceId }
        : {
            deviceId,
            type: selectedType,
            attributes: customAttributes.trim()
              ? JSON.parse(customAttributes)
              : {},
          }

      await sendCommand(config, command)
      setResult({ status: "success", message: "Command sent successfully" })
    } catch (err) {
      setResult({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to send command",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Command</DialogTitle>
          <DialogDescription>Send a command to {deviceName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            Loading available commands…
          </div>
        ) : (
          <div className="space-y-4">
            {savedCommands.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Saved Commands
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedCommands.map((cmd) => (
                    <Button
                      key={cmd.id ?? cmd.type}
                      variant={
                        selectedType === cmd.type ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedType(cmd.type)}
                    >
                      {cmd.description || cmd.type}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Command Type
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select command type" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-48">
                    {commandTypes.map((ct) => (
                      <SelectItem key={ct.type} value={ct.type}>
                        {ct.type}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Attributes (JSON, optional)
              </label>
              <Input
                value={customAttributes}
                onChange={(e) => setCustomAttributes(e.target.value)}
                placeholder='{"data": "value"}'
                disabled={sending}
              />
            </div>

            {result && (
              <Badge
                variant={
                  result.status === "success" ? "default" : "destructive"
                }
              >
                {result.message}
              </Badge>
            )}

            <Button
              className="w-full"
              onClick={handleSend}
              disabled={!selectedType || sending}
            >
              <Send className="size-4" />
              {sending ? "Sending…" : "Send Command"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
