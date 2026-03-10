import type {
  TraccarDevice,
  TraccarEvent,
  TraccarPosition,
} from "@/lib/traccar"
import {
  Bike,
  Boat,
  Bus,
  Car,
  Helicopter,
  Person,
  Plane,
  Ship,
  Tractor,
  Train,
  Truck,
  type IconProps,
} from "@/components/icons"

export function getDeviceIcon(category?: string | null): React.ComponentType<IconProps> {
  switch (category) {
    case "car":
      return Car
    case "bicycle":
    case "motorcycle":
      return Bike
    case "bus":
    case "trolleybus":
      return Bus
    case "truck":
    case "pickup":
    case "van":
      return Truck
    case "boat":
      return Boat
    case "ship":
      return Ship
    case "plane":
      return Plane
    case "helicopter":
      return Helicopter
    case "train":
    case "tram":
      return Train
    case "person":
      return Person
    case "tractor":
    case "crane":
    case "offroad":
      return Tractor
    default:
      return Truck
  }
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function toIsoValue(value: string) {
  return new Date(value).toISOString()
}

export function toKph(speed?: number) {
  return Math.round((speed ?? 0) * 1.852)
}

export function distanceInKm(distance?: number) {
  return `${((distance ?? 0) / 1000).toFixed(1)} km`
}

export function durationLabel(duration?: number) {
  const totalMinutes = Math.round((duration ?? 0) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}

export function statusVariant(status: string) {
  if (status === "online") {
    return "default" as const
  }
  if (status === "offline") {
    return "destructive" as const
  }
  return "secondary" as const
}

export function formatTimestamp(value?: string) {
  if (!value) {
    return "No data"
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function relativeTime(value?: string) {
  if (!value) {
    return "No fix"
  }
  const diffMs = Date.now() - new Date(value).getTime()
  const diffMinutes = Math.round(diffMs / 60_000)
  if (diffMinutes <= 1) {
    return "Just now"
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  const hours = Math.round(diffMinutes / 60)
  return `${hours}h ago`
}

export function getBatteryLevel(position?: TraccarPosition) {
  const value = position?.attributes?.batteryLevel
  if (typeof value === "number") {
    return Math.round(value)
  }
  return null
}

export function getRouteEventPosition(
  event: TraccarEvent,
  positions: TraccarPosition[]
) {
  const matchedByPosition = positions.find(
    (position) => position.id === event.positionId
  )
  if (matchedByPosition) {
    return matchedByPosition
  }

  const attributes = event.attributes ?? {}
  const latitude = attributes.latitude
  const longitude = attributes.longitude
  if (typeof latitude === "number" && typeof longitude === "number") {
    return {
      id: event.id,
      deviceId: event.deviceId,
      latitude,
      longitude,
    } as TraccarPosition
  }

  return null
}

export function normalizeStatus(
  device: TraccarDevice,
  position?: TraccarPosition
) {
  if (device.status) {
    return device.status
  }
  const fixTime = position?.fixTime ?? position?.deviceTime
  if (!fixTime) {
    return "unknown"
  }
  const ageMinutes = (Date.now() - new Date(fixTime).getTime()) / 60_000
  if (ageMinutes > 90) {
    return "offline"
  }
  return "online"
}

export function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function createDefaultRouteWindow() {
  const now = new Date()
  const from = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  return {
    from: toDateTimeLocal(from),
    to: toDateTimeLocal(now),
  }
}

/**
 * Haversine distance between two coordinates in meters.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Total path distance of a coordinate array in meters.
 */
export function pathDistanceMeters(coords: [number, number][]) {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1]
    const [lon2, lat2] = coords[i]
    total += haversineMeters(lat1, lon1, lat2, lon2)
  }
  return total
}
