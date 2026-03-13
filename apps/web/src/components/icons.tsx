import type { ReactNode } from "react"

type IconProps = {
  className?: string
}

function IconBase({
  className,
  children,
  viewBox = "0 0 24 24",
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const Activity = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </IconBase>
)

export const Gauge = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M4.5 15a7.5 7.5 0 1 1 15 0" />
    <path d="m12 12 4-4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </IconBase>
)

export const MapPinned = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 21s6-5.25 6-11a6 6 0 1 0-12 0c0 5.75 6 11 6 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </IconBase>
)

export const MapPin = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
)

export const Moon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5Z" />
  </IconBase>
)

export const Navigation = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m12 3 7 18-7-4-7 4 7-18Z" />
  </IconBase>
)

export const Radio = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="2" />
    <path d="M7.8 7.8a6 6 0 0 1 8.4 0" />
    <path d="M4.6 4.6a10.5 10.5 0 0 1 14.8 0" />
  </IconBase>
)

export const Loader = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </IconBase>
)

export const RefreshCw = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 12a9 9 0 0 1-15.4 6.4" />
    <path d="M3 12A9 9 0 0 1 18.4 5.6" />
    <path d="M3 16v2.5h2.5" />
    <path d="M21 8V5.5h-2.5" />
  </IconBase>
)

export const Route = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h4a4 4 0 0 0 4-4V8" />
  </IconBase>
)

export const Search = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.2-4.2" />
  </IconBase>
)

export const ShieldCheck = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
    <path d="m9.5 12 1.8 1.8 3.8-3.8" />
  </IconBase>
)

export const SunMedium = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </IconBase>
)

export const Truck = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 7h10v8H3z" />
    <path d="M13 10h4l3 3v2h-7z" />
    <circle cx="7" cy="17" r="1.8" />
    <circle cx="17" cy="17" r="1.8" />
  </IconBase>
)

export const WifiOff = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m2 2 20 20" />
    <path d="M8.5 8.5A7 7 0 0 1 19 12" />
    <path d="M4.9 4.9A12 12 0 0 1 21 12" />
    <path d="M12 20h.01" />
  </IconBase>
)

export const Zap = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
  </IconBase>
)

export const Settings = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
)

export const ChevronLeft = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m15 18-6-6 6-6" />
  </IconBase>
)

export const ChevronRight = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m9 18 6-6-6-6" />
  </IconBase>
)

export const ChevronDown = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 9 6 6 6-6" />
  </IconBase>
)

export const ChevronUp = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m18 15-6-6-6 6" />
  </IconBase>
)

export const X = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </IconBase>
)

export const Play = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M6 3l14 9-14 9V3Z" fill="currentColor" stroke="none" />
  </IconBase>
)

export const Pause = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    <rect
      x="14"
      y="4"
      width="4"
      height="16"
      fill="currentColor"
      stroke="none"
    />
  </IconBase>
)

export const RotateCcw = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </IconBase>
)

export const Server = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <line
      x1="6"
      y1="6"
      x2="6.01"
      y2="6"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="6"
      y1="18"
      x2="6.01"
      y2="18"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </IconBase>
)

export const LogOut = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </IconBase>
)

export const Plus = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
)

export const Terminal = ({ className }: IconProps) => (
  <IconBase className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </IconBase>
)

export const Edit = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </IconBase>
)

export const MoreVertical = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </IconBase>
)

export const Car = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M14 16H9m10 0h3l-3-4h-2.5M7 16H4m0 0v-5l2-6h12l2 6v5M4 16l1.5-4.5m13 4.5-1.5-4.5" />
    <circle cx="7" cy="16" r="1.5" />
    <circle cx="17" cy="16" r="1.5" />
  </IconBase>
)

export const Bike = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    <path d="m12 17.5 3.5-7 1.5.5-2 5.5" />
    <path d="M6 15.5 12 6l4 1" />
  </IconBase>
)

export const Bus = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M8 6v6M16 6v6M2 12h19.5M4.5 17.5h15M6 20v-2M18 20v-2" />
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </IconBase>
)

export const Ship = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M2 21a3 3 0 1 0 6 0M22 21a3 3 0 1 1-6 0M6 21V7M18 21V7M6 4h12" />
    <path d="M6 4 4 7M18 4l2 3" />
  </IconBase>
)

export const Plane = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </IconBase>
)

export const Train = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="4" y="3" width="16" height="16" rx="2" />
    <path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3" />
    <circle cx="9" cy="15" r="1" />
    <circle cx="15" cy="15" r="1" />
  </IconBase>
)

export const Person = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </IconBase>
)

export const Tractor = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="7" cy="15" r="4" />
    <circle cx="18" cy="17" r="2" />
    <path d="M11 15h4v-4l-4-2V6h-1V4h2" />
    <path d="M7 15h4" />
  </IconBase>
)

export const Boat = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M2 21a3 3 0 1 0 6 0M22 21a3 3 0 1 1-6 0" />
    <path d="M6 21V7l-4 4M18 21V7l4 4" />
    <path d="M6 4h12v3H6z" />
  </IconBase>
)

export const Helicopter = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 10h18M10 10V3h4v7" />
    <rect x="6" y="10" width="12" height="6" rx="2" />
    <path d="M6 16v3M18 16v3M9 19h6M2 3h20" />
  </IconBase>
)

export const Bell = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </IconBase>
)

export const Users = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
)

export const Wrench = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </IconBase>
)

export const Fence = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 6h18M3 18h18M6 6v12M18 6v12M10 6v12M14 6v12" />
  </IconBase>
)

export const Download = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </IconBase>
)

export const Share = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </IconBase>
)

export const BarChart = ({ className }: IconProps) => (
  <IconBase className={className}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </IconBase>
)

export const StopCircle = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <rect
      x="9"
      y="9"
      width="6"
      height="6"
      rx="1"
      fill="currentColor"
      stroke="none"
    />
  </IconBase>
)

export const Copy = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </IconBase>
)

export const Link2 = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
    <line x1="8" x2="16" y1="12" y2="12" />
  </IconBase>
)

export const Trash = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </IconBase>
)

export const Send = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="m22 2-11 11" />
  </IconBase>
)

export const FolderOpen = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </IconBase>
)

export const Clock = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconBase>
)

export const Pencil = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </IconBase>
)

export const Function = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="4" y="13" width="4" height="7" rx="1" />
    <path d="M4 13V7a4 4 0 0 1 8 0v10a4 4 0 0 0 8 0v-6" />
    <rect x="16" y="4" width="4" height="7" rx="1" />
  </IconBase>
)

export function BatteryIndicator({
  level,
  className,
}: {
  level: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, level))
  const fillWidth = Math.round((clamped / 100) * 14)
  const colorClass =
    clamped <= 20
      ? "text-red-500"
      : clamped <= 40
        ? "text-orange-500"
        : clamped <= 60
          ? "text-yellow-500"
          : "text-green-500"

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${colorClass}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {/* Battery body */}
      <rect
        x="1"
        y="6"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Terminal nib */}
      <rect
        x="19"
        y="10"
        width="3"
        height="4"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
      {/* Fill level */}
      {fillWidth > 0 && (
        <rect
          x="3"
          y="8.5"
          width={fillWidth}
          height="7"
          rx="1"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  )
}

export type { IconProps }
