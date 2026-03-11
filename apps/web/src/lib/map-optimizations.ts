/**
 * Map performance optimizations inspired by Traccar web application.
 * Includes icon preloading, dynamic throttling, and resource management.
 */

import type { TraccarDevice, TraccarPosition } from "@/lib/traccar"

// ── Icon Preloading ───────────────────────────────────────────────────────────

type DeviceCategory =
  | "car"
  | "bicycle"
  | "motorcycle"
  | "bus"
  | "trolleybus"
  | "truck"
  | "pickup"
  | "van"
  | "boat"
  | "ship"
  | "plane"
  | "helicopter"
  | "train"
  | "tram"
  | "person"
  | "tractor"
  | "crane"
  | "offroad"
  | "animal"
  | "default"

const iconCache = new Map<string, HTMLImageElement>()
let preloadPromise: Promise<void> | null = null

/**
 * Preload device category icons for map rendering.
 * This prevents flash-of-missing-icon when markers are first rendered.
 */
export async function preloadDeviceIcons(): Promise<void> {
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    const categories: DeviceCategory[] = [
      "car",
      "bicycle",
      "motorcycle",
      "bus",
      "truck",
      "boat",
      "ship",
      "plane",
      "helicopter",
      "train",
      "person",
      "tractor",
      "default",
    ]

    const promises = categories.flatMap((category) => {
      // Preload both light and dark variants if you have them
      const variants = ["default", "active", "offline"]
      return variants.map((variant) => {
        const key = `${category}-${variant}`
        return new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            iconCache.set(key, img)
            resolve()
          }
          img.onerror = () => resolve() // Don't fail entire preload on one icon
          // In a real implementation, you'd set src to actual icon paths
          // img.src = `/icons/${category}-${variant}.svg`
          resolve() // For now, resolve immediately
        })
      })
    })

    await Promise.allSettled(promises)
  })()

  return preloadPromise
}

export function getPreloadedIcon(
  category: string,
  variant: string = "default"
): HTMLImageElement | null {
  return iconCache.get(`${category}-${variant}`) ?? null
}

// ── Dynamic Position Update Throttling ────────────────────────────────────────

type PositionUpdate = {
  deviceId: number
  position: TraccarPosition
  timestamp: number
}

type ThrottleConfig = {
  minInterval: number // Minimum time between flushes (ms)
  maxInterval: number // Maximum time between flushes (ms)
  maxBatchSize: number // Max updates to batch before forcing flush
}

export class PositionUpdateThrottler {
  private pending: Map<number, PositionUpdate> = new Map()
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastFlushTime = 0
  private config: ThrottleConfig

  // Dynamic interval adjustment based on update frequency
  private currentInterval: number
  private updateCount = 0
  private intervalWindowStart = Date.now()

  constructor(
    private onFlush: (updates: Map<number, PositionUpdate>) => void,
    config: Partial<ThrottleConfig> = {}
  ) {
    this.config = {
      minInterval: config.minInterval ?? 100, // 100ms min
      maxInterval: config.maxInterval ?? 2000, // 2s max
      maxBatchSize: config.maxBatchSize ?? 50,
    }
    this.currentInterval = this.config.maxInterval
  }

  /**
   * Add a position update to the batch.
   * Automatically adjusts throttling based on update frequency.
   */
  addUpdate(deviceId: number, position: TraccarPosition): void {
    this.pending.set(deviceId, {
      deviceId,
      position,
      timestamp: Date.now(),
    })

    this.updateCount++

    // Adjust interval dynamically (similar to Traccar's tick function)
    this.adjustThrottleInterval()

    // Force flush if batch is too large
    if (this.pending.size >= this.config.maxBatchSize) {
      this.flush()
      return
    }

    // Schedule flush if not already scheduled
    if (!this.timer) {
      const now = Date.now()
      const timeSinceLastFlush = now - this.lastFlushTime
      const delay = Math.max(0, this.currentInterval - timeSinceLastFlush)

      this.timer = setTimeout(() => {
        this.flush()
      }, delay)
    }
  }

  /**
   * Dynamically adjust throttle interval based on update frequency.
   * High-frequency updates use shorter intervals for responsiveness.
   * Low-frequency updates use longer intervals to batch more efficiently.
   */
  private adjustThrottleInterval(): void {
    const now = Date.now()
    const windowDuration = now - this.intervalWindowStart

    // Adjust every 5 seconds
    if (windowDuration >= 5000) {
      const updatesPerSecond = this.updateCount / (windowDuration / 1000)

      if (updatesPerSecond > 20) {
        // High frequency: use minimum interval for responsiveness
        this.currentInterval = this.config.minInterval
      } else if (updatesPerSecond > 5) {
        // Medium frequency: use balanced interval
        this.currentInterval = Math.floor(
          (this.config.minInterval + this.config.maxInterval) / 2
        )
      } else {
        // Low frequency: use maximum interval for batching
        this.currentInterval = this.config.maxInterval
      }

      // Reset window
      this.updateCount = 0
      this.intervalWindowStart = now
    }
  }

  /**
   * Immediately flush all pending updates.
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.pending.size === 0) return

    const updates = new Map(this.pending)
    this.pending.clear()
    this.lastFlushTime = Date.now()
    this.onFlush(updates)
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.pending.clear()
  }

  /**
   * Get current throttle statistics for debugging.
   */
  getStats() {
    return {
      pendingCount: this.pending.size,
      currentInterval: this.currentInterval,
      updateCount: this.updateCount,
      hasScheduledFlush: this.timer !== null,
    }
  }
}

// ── Map Layer Management ──────────────────────────────────────────────────────

/**
 * Cleanup utility for map layers and sources to prevent memory leaks.
 * Call this when removing dynamic map overlays or changing map content.
 */
export function cleanupMapLayers(
  map: maplibregl.Map,
  layerIds: string[],
  sourceIds: string[]
): void {
  // Remove layers first (layers depend on sources)
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }

  // Then remove sources
  for (const sourceId of sourceIds) {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId)
    }
  }
}

/**
 * Check if a map is fully loaded and ready for operations.
 */
export function isMapReady(map: maplibregl.Map | null): boolean {
  return map !== null && map.loaded()
}

// ── Device State Management ───────────────────────────────────────────────────

/**
 * Efficiently merge device updates with existing device list.
 * Preserves device order and only updates changed fields.
 */
export function mergeDeviceUpdates(
  existing: TraccarDevice[],
  updates: TraccarDevice[]
): TraccarDevice[] {
  if (updates.length === 0) return existing

  const updateMap = new Map(updates.map((d) => [d.id, d]))

  return existing.map((device) => {
    const update = updateMap.get(device.id)
    return update ? { ...device, ...update } : device
  })
}

/**
 * Efficiently merge position updates with existing positions.
 * Keeps only the latest position per device.
 */
export function mergePositionUpdates(
  existing: TraccarPosition[],
  updates: TraccarPosition[]
): TraccarPosition[] {
  if (updates.length === 0) return existing

  const updateMap = new Map(updates.map((p) => [p.deviceId, p]))

  // Replace existing positions with updates, keep non-updated ones
  return [...updates, ...existing.filter((p) => !updateMap.has(p.deviceId))]
}
