import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { Copy, Share } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import { shareDevice } from "@/lib/traccar"

type ShareDeviceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: number
  deviceName: string
}

export function ShareDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
}: ShareDeviceDialogProps) {
  const [hours, setHours] = useState("24")
  const [shareToken, setShareToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    setLoading(true)
    setError("")
    setShareToken("")
    try {
      const config = toConfig(readStoredConfig())
      const expiration = new Date(
        Date.now() + Number(hours) * 60 * 60 * 1000
      ).toISOString()
      const token = await shareDevice(config, deviceId, expiration)
      setShareToken(token)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate share link"
      )
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!shareToken) return
    navigator.clipboard.writeText(shareToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Location</DialogTitle>
          <DialogDescription>
            Generate a temporary share token for {deviceName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Duration (hours)
            </label>
            <Input
              type="number"
              min="1"
              max="720"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleShare} disabled={loading}>
            <Share className="size-4" />
            {loading ? "Generating…" : "Generate Share Token"}
          </Button>

          {shareToken && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Share Token
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy token"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-muted-foreground">
                  Copied to clipboard
                </p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
