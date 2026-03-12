import { useCallback, useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import {
  Bell,
  Clock,
  Fence,
  FolderOpen,
  Function,
  Person,
  ShieldCheck,
  Terminal,
  Truck,
  Users,
  Wrench,
} from "@/components/icons"
import type { IconProps } from "@/components/icons"
import { readStoredConfig, toConfig } from "@/lib/config"
import {
  getAllCalendars,
  getAllCommands,
  getAllComputedAttributes,
  getAllDevices,
  getAllDrivers,
  getAllGeofences,
  getAllGroups,
  getAllMaintenance,
  getAllNotifications,
  getAttributesByUser,
  getCalendarsByUser,
  getCommandsByUser,
  getDevicesByUser,
  getDriversByUser,
  getGeofencesByUser,
  getGroupsByUser,
  getManagedUsersByUser,
  getMaintenanceByUser,
  getNotificationsByUser,
  getUsers,
  linkPermission,
  unlinkPermission,
  type TraccarConfig,
  type TraccarPermission,
} from "@/lib/traccar"

type FlatItem = { id: number; title: string }

type CategoryDef = {
  id: string
  label: string
  permKey: keyof Omit<TraccarPermission, "userId">
  icon: React.ComponentType<IconProps>
  fetchAll: (config: TraccarConfig) => Promise<FlatItem[]>
  fetchLinked: (
    config: TraccarConfig,
    userId: number
  ) => Promise<{ id: number }[]>
}

function formatNotificationType(type: string) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "devices",
    label: "Devices",
    permKey: "deviceId",
    icon: Truck,
    fetchAll: async (config) => {
      const items = await getAllDevices(config)
      return items.map((d) => ({
        id: d.id,
        title: `${d.name} (${d.uniqueId})`,
      }))
    },
    fetchLinked: (config, userId) => getDevicesByUser(config, userId),
  },
  {
    id: "groups",
    label: "Groups",
    permKey: "groupId",
    icon: FolderOpen,
    fetchAll: async (config) => {
      const items = await getAllGroups(config)
      return items.map((g) => ({ id: g.id, title: g.name }))
    },
    fetchLinked: (config, userId) => getGroupsByUser(config, userId),
  },
  {
    id: "geofences",
    label: "Geofences",
    permKey: "geofenceId",
    icon: Fence,
    fetchAll: async (config) => {
      const items = await getAllGeofences(config)
      return items.map((g) => ({ id: g.id, title: g.name }))
    },
    fetchLinked: (config, userId) => getGeofencesByUser(config, userId),
  },
  {
    id: "notifications",
    label: "Notifications",
    permKey: "notificationId",
    icon: Bell,
    fetchAll: async (config) => {
      const items = await getAllNotifications(config)
      return items.map((n) => ({
        id: n.id,
        title: n.description?.trim()
          ? n.description
          : formatNotificationType(n.type),
      }))
    },
    fetchLinked: (config, userId) => getNotificationsByUser(config, userId),
  },
  {
    id: "calendars",
    label: "Calendars",
    permKey: "calendarId",
    icon: Clock,
    fetchAll: async (config) => {
      const items = await getAllCalendars(config)
      return items.map((c) => ({ id: c.id, title: c.name }))
    },
    fetchLinked: (config, userId) => getCalendarsByUser(config, userId),
  },
  {
    id: "users",
    label: "Managed Users",
    permKey: "managedUserId",
    icon: Users,
    fetchAll: async (config) => {
      const items = await getUsers(config)
      return items.map((u) => ({
        id: u.id,
        title: `${u.name} (${u.email})`,
      }))
    },
    fetchLinked: (config, userId) => getManagedUsersByUser(config, userId),
  },
  {
    id: "attributes",
    label: "Attributes",
    permKey: "attributeId",
    icon: Function,
    fetchAll: async (config) => {
      const items = await getAllComputedAttributes(config)
      return items.map((a) => ({ id: a.id, title: a.description }))
    },
    fetchLinked: (config, userId) => getAttributesByUser(config, userId),
  },
  {
    id: "drivers",
    label: "Drivers",
    permKey: "driverId",
    icon: Person,
    fetchAll: async (config) => {
      const items = await getAllDrivers(config)
      return items.map((d) => ({
        id: d.id,
        title: `${d.name} (${d.uniqueId})`,
      }))
    },
    fetchLinked: (config, userId) => getDriversByUser(config, userId),
  },
  {
    id: "commands",
    label: "Commands",
    permKey: "commandId",
    icon: Terminal,
    fetchAll: async (config) => {
      const items = await getAllCommands(config)
      return items
        .filter((c) => c.id != null)
        .map((c) => ({
          id: c.id!,
          title: c.description?.trim() ? c.description : c.type,
        }))
    },
    fetchLinked: async (config, userId) => {
      const items = await getCommandsByUser(config, userId)
      return items.filter((c) => c.id != null).map((c) => ({ id: c.id! }))
    },
  },
  {
    id: "maintenance",
    label: "Maintenance",
    permKey: "maintenanceId",
    icon: Wrench,
    fetchAll: async (config) => {
      const items = await getAllMaintenance(config)
      return items.map((m) => ({ id: m.id, title: m.name }))
    },
    fetchLinked: (config, userId) => getMaintenanceByUser(config, userId),
  },
]

type CatState = {
  allItems: FlatItem[]
  linkedIds: Set<number>
  loading: boolean
  error: string | null
}

function ItemRow({
  item,
  linked,
  busy,
  onToggle,
}: {
  item: FlatItem
  linked: boolean
  busy: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition ${
        linked
          ? "bg-primary/10 hover:bg-primary/15"
          : "bg-background hover:bg-muted/50"
      } ${busy ? "opacity-50" : ""}`}
    >
      <span
        className={`min-w-0 flex-1 text-sm break-words ${
          linked ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
      >
        {item.title}
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition ${
          linked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {linked && (
          <svg
            viewBox="0 0 12 12"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </span>
    </button>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  userName: string
}

export function UserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: Props) {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id)
  const [catData, setCatData] = useState<Record<string, CatState>>({})
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  // track which categories have been fetched so we don't double-fetch
  const fetchedRef = useRef<Set<string>>(new Set())

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setActiveId(CATEGORIES[0].id)
      setCatData({})
      fetchedRef.current = new Set()
    }
  }, [open])

  const loadCategory = useCallback(
    async (catId: string) => {
      if (fetchedRef.current.has(catId)) return
      fetchedRef.current.add(catId)

      setCatData((prev) => ({
        ...prev,
        [catId]: {
          allItems: [],
          linkedIds: new Set(),
          loading: true,
          error: null,
        },
      }))

      const cat = CATEGORIES.find((c) => c.id === catId)
      if (!cat) return

      try {
        const config = toConfig(readStoredConfig())
        const [all, linked] = await Promise.all([
          cat.fetchAll(config),
          cat.fetchLinked(config, userId),
        ])
        const linkedIds = new Set(linked.map((l) => Number(l.id)))
        setCatData((prev) => ({
          ...prev,
          [catId]: { allItems: all, linkedIds, loading: false, error: null },
        }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load"
        fetchedRef.current.delete(catId) // allow retry
        setCatData((prev) => ({
          ...prev,
          [catId]: {
            allItems: [],
            linkedIds: new Set(),
            loading: false,
            error: msg,
          },
        }))
      }
    },
    [userId]
  )

  // Load when active category changes
  useEffect(() => {
    if (open) loadCategory(activeId)
  }, [open, activeId, loadCategory])

  async function handleToggle(cat: CategoryDef, itemId: number) {
    const key = `${cat.id}-${itemId}`
    if (toggling.has(key)) return

    const state = catData[cat.id]
    if (!state) return

    const wasLinked = state.linkedIds.has(itemId)
    const permission: TraccarPermission = {
      userId,
      [cat.permKey]: itemId,
    }

    // Optimistic update
    setToggling((prev) => new Set([...prev, key]))
    setCatData((prev) => {
      const s = prev[cat.id]
      if (!s) return prev
      const nextIds = new Set(s.linkedIds)
      wasLinked ? nextIds.delete(itemId) : nextIds.add(itemId)
      return { ...prev, [cat.id]: { ...s, linkedIds: nextIds } }
    })

    try {
      const config = toConfig(readStoredConfig())
      if (wasLinked) {
        await unlinkPermission(config, permission)
      } else {
        await linkPermission(config, permission)
      }
    } catch {
      // Revert on failure
      setCatData((prev) => {
        const s = prev[cat.id]
        if (!s) return prev
        const nextIds = new Set(s.linkedIds)
        wasLinked ? nextIds.add(itemId) : nextIds.delete(itemId)
        return { ...prev, [cat.id]: { ...s, linkedIds: nextIds } }
      })
    } finally {
      setToggling((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const activeCat = CATEGORIES.find((c) => c.id === activeId)!
  const activeState = catData[activeId]

  const linkedItems = activeState
    ? activeState.allItems
        .filter((i) => activeState.linkedIds.has(Number(i.id)))
        .sort((a, b) => a.title.localeCompare(b.title))
    : []
  const unlinkedItems = activeState
    ? activeState.allItems
        .filter((i) => !activeState.linkedIds.has(Number(i.id)))
        .sort((a, b) => a.title.localeCompare(b.title))
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[680px] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        style={{ display: "flex", flexDirection: "column", padding: 0, gap: 0 }}
      >
        {/* Dialog header */}
        <DialogHeader className="flex-none border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <DialogTitle>Permissions — {userName}</DialogTitle>
          </div>
          <DialogDescription>
            Toggle which entities this user has access to.
          </DialogDescription>
        </DialogHeader>

        {/* Two-column body — fills remaining height */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar — fixed w-64, scrollable */}
          <nav className="w-44 shrink-0 overflow-y-auto border-r border-border/40 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const count = catData[cat.id]?.linkedIds.size ?? null
              const isActive = cat.id === activeId
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{cat.label}</span>
                  {count !== null && count > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Main panel — flex-1, min-w-0 prevents overflow, column for header + list */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Pinned panel header */}
            <div className="flex-none border-b border-border/40 px-5 py-3">
              <p className="text-sm font-semibold">{activeCat.label}</p>
              <p className="text-xs text-muted-foreground">
                {activeState?.linkedIds.size ?? 0} of{" "}
                {activeState?.allItems.length ?? "–"} linked
              </p>
            </div>

            {/* Scrollable list — overflow-y-auto with pr to keep content clear of scrollbar */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-4 p-4 pr-5">
                {!activeState || activeState.loading ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : activeState.error ? (
                  <p className="py-10 text-center text-xs text-destructive">
                    {activeState.error}
                  </p>
                ) : activeState.allItems.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    No {activeCat.label.toLowerCase()} available
                  </p>
                ) : (
                  <>
                    {linkedItems.length > 0 && (
                      <div>
                        <p className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
                          Linked ({linkedItems.length})
                        </p>
                        <div className="divide-y divide-border/30 overflow-hidden rounded-lg border border-primary/30">
                          {linkedItems.map((item) => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              linked={true}
                              busy={toggling.has(`${activeId}-${item.id}`)}
                              onToggle={() => handleToggle(activeCat, item.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Available ({unlinkedItems.length})
                      </p>
                      <div className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/40">
                        {unlinkedItems.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            linked={false}
                            busy={toggling.has(`${activeId}-${item.id}`)}
                            onToggle={() => handleToggle(activeCat, item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
