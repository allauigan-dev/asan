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

export const LogOut = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </IconBase>
)

export type { IconProps }
