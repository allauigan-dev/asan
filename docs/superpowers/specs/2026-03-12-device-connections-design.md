# Device Connections Management Design

**Date:** 2026-03-12
**Status:** Approved
**Author:** Claude Code

## Overview

Add bidirectional device connection management to the Asan fleet management dashboard. This feature enables users to link devices to geofences, notifications, drivers, computed attributes, saved commands, and maintenance items through an intuitive UI that works from both the device perspective and the entity perspective.

## Goals

- Provide a clear way to manage which devices are connected to which entities (geofences, notifications, etc.)
- Support two entry points: device-centric (device dialog) and entity-centric (entity panels)
- Ensure a responsive, error-tolerant user experience
- Integrate seamlessly with existing Traccar permission API
- Follow existing codebase patterns and conventions

## Non-Goals

- Bulk operations (connecting multiple devices to multiple entities at once)
- Connection analytics or reporting
- Import/export of connection configurations
- Real-time collaborative editing of connections

## User Requirements

**From Device Perspective:**
As a user editing a device, I want to see and modify all its connections (geofences, notifications, drivers, etc.) in one place so I can configure everything about that device without switching contexts.

**From Entity Perspective:**
As a user managing geofences (or any other entity type), I want to see which devices are connected to each geofence and quickly add/remove devices so I can configure entity-specific settings efficiently.

## Architecture Overview

### Core Concept

Connections are managed through Traccar's `/permissions` API, which links objects using a flexible permission model. The Permission object can link a device to:
- Geofences (`geofenceId`)
- Notifications (`notificationId`)
- Drivers (`driverId`)
- Computed Attributes (`attributeId`)
- Saved Commands (`commandId`)
- Maintenance items (`maintenanceId`)

### Two Entry Points

**1. Device Dialog (Review-and-Save Pattern)**
- Users edit a device and see all connection types in multi-select dropdowns
- Make multiple changes across connection types
- Review all changes before saving
- API: Batch permission changes on save (calculate diff, execute adds/removes)

**2. Entity Panels (Immediate-Save Pattern)**
- Each entity card has an expandable "Connected Devices" section
- Shows currently connected devices with remove buttons
- Add device dropdown for quick connections
- API: Single permission POST/DELETE on each action with optimistic UI updates

### Shared Infrastructure

- New API functions in `lib/traccar.ts` for permission CRUD operations
- Reusable multi-select component in `packages/ui`
- Reusable expandable device list component for entity cards
- Consistent error handling and loading states

## Component Structure

### New Components

#### 1. `packages/ui/src/components/ui/multi-select.tsx`

**Purpose:** Reusable multi-select dropdown component with badge display.

**Features:**
- Searchable dropdown list with checkboxes
- Selected items shown as dismissible badges
- Keyboard navigation (Arrow keys, Space, Escape)
- Empty state handling
- Disabled state support
- Accessible (ARIA labels, focus management)

**Props:**
```typescript
type MultiSelectProps = {
  options: Array<{ id: number; name: string }>
  selected: number[]
  onChange: (selected: number[]) => void
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
}
```

**Implementation Notes:**
- Built on Radix UI Popover + Command components (shadcn pattern)
- Virtual scrolling for lists over 100 items
- Debounced search (300ms)
- Follows existing shadcn/ui styling patterns

#### 2. `apps/web/src/components/settings/device-connections-section.tsx`

**Purpose:** Section within device edit dialog for managing all device connections.

**Features:**
- 6 multi-select dropdowns (one per connection type)
- Fetches current permissions on mount
- Tracks pending changes (added/removed items per type)
- Save/Cancel buttons at bottom
- Loading states during fetch and save
- Error display with retry option
- Shows diff summary before save (optional)

**State:**
```typescript
type ConnectionsState = {
  status: 'loading' | 'loaded' | 'saving' | 'error'
  current: ConnectionsByType
  pending: ConnectionsByType
  error?: string
}

type ConnectionsByType = {
  geofences: number[]
  notifications: number[]
  drivers: number[]
  attributes: number[]
  commands: number[]
  maintenance: number[]
}
```

**API Flow:**
1. Mount → fetch current permissions (6 parallel API calls)
2. User changes selections → update pending state only
3. Save click → calculate diff, make batch permission API calls
4. Success → close dialog, refresh parent
5. Error → show error, keep dialog open

#### 3. `apps/web/src/components/settings/expandable-device-list.tsx`

**Purpose:** Reusable expandable section for entity cards showing connected devices.

**Features:**
- Collapsible section with chevron icon
- Header shows device count
- List of connected devices with remove buttons
- "Add Device" dropdown (single-select)
- Optimistic UI updates
- Toast notifications for errors
- Loading spinner during API calls

**Props:**
```typescript
type ExpandableDeviceListProps = {
  entityId: number
  entityType: 'geofence' | 'notification' | 'driver' | 'attribute' | 'command' | 'maintenance'
  connectedDeviceIds: number[]
  allDevices: TraccarDevice[]
  onConnectionsChange?: () => void
}
```

**API Flow:**
1. User clicks Add → show dropdown with unconnected devices
2. User selects device → optimistically add to list, POST permission
3. Success → keep updated UI, show success toast (brief)
4. Error → revert UI, show error toast with retry button
5. User clicks Remove → optimistically remove from list, DELETE permission
6. Same success/error handling as add

### Modified Components

#### 1. `apps/web/src/components/settings-page.tsx`

**Changes:**
- Update `DeviceEditDialog` component to include `DeviceConnectionsSection`
- Add separator between basic device info and connections section
- Pass device ID to connections section
- Handle connection changes refresh (reload device list on save)

**Visual Layout:**
```
Device Edit Dialog
├─ Basic Info Section (existing)
│  ├─ Name input
│  ├─ Unique ID input
│  ├─ Category select
│  └─ ... other fields
├─ Separator
├─ Device Connections Section (new)
│  ├─ Geofences multi-select
│  ├─ Notifications multi-select
│  ├─ Drivers multi-select
│  ├─ Attributes multi-select
│  ├─ Commands multi-select
│  └─ Maintenance multi-select
└─ Footer
   ├─ Cancel button
   └─ Save Changes button
```

#### 2. Entity Panel Components (6 files)

**Files to modify:**
- `components/settings/geofence-panel.tsx`
- `components/settings/notification-panel.tsx`
- `components/settings/driver-panel.tsx`
- `components/settings/attribute-panel.tsx`
- `components/settings/command-panel.tsx`
- `components/settings/maintenance-panel.tsx`

**Changes for each:**
- Fetch all devices on panel mount (for add device dropdown)
- Add `ExpandableDeviceList` component to each entity card
- Pass entity ID, type, and connected device IDs to expandable list
- Handle connection change callbacks (refresh entity list)

**Visual Integration:**
```
Entity Card (e.g., Geofence)
├─ Header (name, description)
├─ Expandable Device List (new)
│  ├─ ▼ Connected Devices (3)
│  └─ [collapsed/expanded content]
├─ Action Buttons
   ├─ Edit button
   └─ Delete button
```

#### 3. `apps/web/src/lib/traccar.ts`

**New Types:**
```typescript
export type PermissionType =
  | 'geofence'
  | 'notification'
  | 'driver'
  | 'attribute'
  | 'command'
  | 'maintenance'

export type TraccarPermission = {
  deviceId?: number
  geofenceId?: number
  notificationId?: number
  driverId?: number
  attributeId?: number
  commandId?: number
  maintenanceId?: number
}
```

**New Functions:**
```typescript
// Create a permission link
export async function createPermission(
  config: TraccarConfig,
  permission: TraccarPermission
): Promise<void>

// Delete a permission link
export async function deletePermission(
  config: TraccarConfig,
  permission: TraccarPermission
): Promise<void>

// Get all entity IDs of a given type connected to a device
export async function getDevicePermissions(
  config: TraccarConfig,
  deviceId: number,
  type: PermissionType
): Promise<number[]>

// Helper to get all devices connected to an entity
export async function getEntityDevices(
  config: TraccarConfig,
  entityId: number,
  type: PermissionType
): Promise<number[]>
```

**Implementation Notes:**
- Use existing `apiRequest` helper for HTTP calls
- Cache permission lists with 30-second TTL (same as devices)
- Clear relevant cache entries after permission changes
- Handle 400 errors (invalid permission) gracefully
- Batch requests where possible (device dialog save)

## Data Flow

### Device Dialog Flow

```
User Action: Opens device edit dialog
  ↓
Component: device-connections-section.tsx mounts
  ↓
API: Fetch current permissions (6 parallel calls)
  - getDevicePermissions(deviceId, 'geofence')
  - getDevicePermissions(deviceId, 'notification')
  - ... etc
  ↓
State: Store current permissions in state
  ↓
UI: Render multi-selects with current selections
  ↓
User Action: Modifies selections in multi-selects
  ↓
State: Update pending changes (not saved yet)
  ↓
UI: Show unsaved indicator (optional)
  ↓
User Action: Clicks Save
  ↓
Logic: Calculate diff (added/removed per type)
  ↓
API: Batch permission calls
  For each added: createPermission(deviceId, entityId, type)
  For each removed: deletePermission(deviceId, entityId, type)
  ↓
Success: Close dialog, refresh device list, show success toast
Error: Show error message, keep dialog open
```

### Entity Panel Flow

```
User Action: Clicks to expand device list in entity card
  ↓
Component: expandable-device-list.tsx renders
  ↓
UI: Show currently connected devices (passed as prop)
  ↓
User Action: Clicks "Add Device" dropdown
  ↓
UI: Show list of unconnected devices
  ↓
User Action: Selects a device
  ↓
UI: Optimistically add device to list (with loading indicator)
  ↓
API: createPermission(deviceId, entityId, type)
  ↓
Success: Keep updated UI, show brief success toast, clear loading
Error: Revert UI, show error toast with retry button
  ↓
User Action: Clicks remove button on a device
  ↓
UI: Optimistically remove device from list (with loading indicator)
  ↓
API: deletePermission(deviceId, entityId, type)
  ↓
Success: Keep updated UI, show brief success toast, clear loading
Error: Revert UI, show error toast with retry button
```

## UI Design

### Multi-Select Component

**Trigger Button:**
```
┌─────────────────────────────┐
│ 3 Geofences selected     ▼ │  ← Shows count when items selected
└─────────────────────────────┘

┌─────────────────────────────┐
│ Select geofences...      ▼ │  ← Placeholder when empty
└─────────────────────────────┘
```

**Dropdown (open):**
```
┌─────────────────────────────┐
│ 🔍 Search...                │
├─────────────────────────────┤
│ ☑ Zone A                    │
│ ☐ Zone B                    │
│ ☑ Downtown                  │
│ ☑ Warehouse District        │
│ ☐ Airport                   │
└─────────────────────────────┘
```

**Selected Badges:**
```
[Zone A ×] [Downtown ×] [Warehouse District ×]
```

### Device Dialog

```
┌─ Edit Device: Truck 01 ─────────────────────┐
│                                              │
│ Basic Information                            │
│ ┌──────────────────────────────────────────┐ │
│ │ Name         [Truck 01             ]     │ │
│ │ Unique ID    [T001                 ]     │ │
│ │ Category     [Truck            ▼   ]     │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ──────────────────────────────────────────── │
│                                              │
│ Connections                                  │
│                                              │
│ Geofences                                    │
│ [2 geofences selected              ▼]       │
│ [Zone A ×] [Downtown ×]                      │
│                                              │
│ Notifications                                │
│ [Select notifications...           ▼]       │
│                                              │
│ Drivers                                      │
│ [1 driver selected                 ▼]       │
│ [John Doe ×]                                 │
│                                              │
│ Computed Attributes                          │
│ [Select attributes...              ▼]       │
│                                              │
│ Saved Commands                               │
│ [3 commands selected               ▼]       │
│ [Lock Vehicle ×] [Unlock ×] [Reboot ×]       │
│                                              │
│ Maintenance                                  │
│ [Select maintenance...             ▼]       │
│                                              │
│ ──────────────────────────────────────────── │
│                          [Cancel] [Save]     │
└──────────────────────────────────────────────┘
```

### Entity Card with Expandable Device List

**Collapsed State:**
```
┌─ Geofence Card ──────────────────────┐
│ Zone A                               │
│ Description: Downtown delivery area  │
│                                      │
│ ▶ Connected Devices (3)              │
│                                      │
│ [Edit] [Delete]                      │
└──────────────────────────────────────┘
```

**Expanded State:**
```
┌─ Geofence Card ──────────────────────┐
│ Zone A                               │
│ Description: Downtown delivery area  │
│                                      │
│ ▼ Connected Devices (3)              │
│ ┌──────────────────────────────────┐ │
│ │ • Truck 01        [Remove ×]     │ │
│ │ • Van 02          [Remove ×]     │ │
│ │ • Car 03          [Remove ×]     │ │
│ │                                  │ │
│ │ [+ Add Device            ▼]      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Edit] [Delete]                      │
└──────────────────────────────────────┘
```

### Visual Indicators

**Device List (optional enhancement):**
Add connection count badge to device cards:
```
┌─ Device Card ────────────┐
│ Truck 01          🔗 12  │  ← Shows total connections
│ Online • 45 km/h         │
└──────────────────────────┘
```

**Entity Card Header:**
Show device count in expandable section header:
```
▶ Connected Devices (3)
```

## Error Handling

### Device Dialog Errors

**Scenario: API call fails during save**
- **UI:** Show inline error message above Save button
- **Message:** "Failed to save connections: [error details]"
- **Actions:** Retry button, Cancel button
- **State:** Keep dialog open with pending changes intact

**Scenario: Partial save failure**
- **UI:** Show detailed error with list of failed operations
- **Message:** "Some connections could not be saved:"
  - "✓ Geofences updated"
  - "✗ Notifications failed: [error]"
  - "✓ Drivers updated"
- **Actions:** Retry failed operations, Close anyway, Cancel
- **State:** Update current state with successful changes

**Scenario: Concurrent modification**
- **Detection:** Compare timestamps on reload
- **UI:** Warning banner: "This device was modified elsewhere. Your changes may conflict."
- **Actions:** Reload and lose changes, Save anyway, Cancel
- **Prevention:** Consider optimistic locking if Traccar API supports it

### Entity Panel Errors

**Scenario: Add device fails**
- **UI:** Revert optimistic update
- **Notification:** Toast message "Failed to add Truck 01: [error]" with Retry button
- **Duration:** Persistent (doesn't auto-dismiss)
- **Action:** Click Retry to attempt again, or dismiss

**Scenario: Remove device fails**
- **UI:** Revert optimistic update (device reappears in list)
- **Notification:** Toast message "Failed to remove Truck 01: [error]" with Retry button
- **Duration:** Persistent
- **Action:** Click Retry to attempt again, or dismiss

**Scenario: Network timeout**
- **UI:** Show loading spinner for max 10 seconds, then timeout
- **Notification:** Toast message "Connection timeout. Check your network."
- **State:** Revert to last known good state
- **Action:** Retry button in toast

### Edge Cases

**1. Empty States**

**No entities exist:**
- **Device dialog:** Disable multi-select with tooltip "No geofences available. Create one in the Geofences tab."
- **Visual:** Grey out multi-select trigger

**No devices connected:**
- **Entity panel expandable:** Show "No devices connected yet" with helpful text
- **Visual:** Empty state illustration (optional)

**2. Large Lists**

**100+ entities in multi-select:**
- **Solution:** Implement virtual scrolling (react-virtual or similar)
- **Search:** Always show search box for lists over 20 items
- **Performance:** Debounce search input (300ms)

**Many devices (50+):**
- **Entity panel add dropdown:** Add search filter
- **Alternative:** Consider pagination or infinite scroll

**3. Permissions & Access Control**

**User lacks permission to modify:**
- **Detection:** API returns 403 error
- **UI:** Disable add/remove buttons, show tooltip "Insufficient permissions"
- **Message:** Toast on attempted action: "You don't have permission to modify connections"

**Read-only mode:**
- **Detection:** Check user.administrator or device.readonly
- **UI:** Show connections but disable all modification controls
- **Visual:** Add "(view only)" to section headers

**4. Deletion Conflicts**

**Deleting a device with connections:**
- **Behavior:** Traccar API automatically removes all permissions (no action needed)
- **UI:** No special handling required

**Deleting an entity with device connections:**
- **Warning:** Before delete, show "3 devices are connected to this geofence. Continue?"
- **Action:** User confirms → delete entity → Traccar removes permissions automatically
- **Alternative:** Add "Remove all connections first" checkbox

**5. Offline/Network Issues**

**Offline detection:**
- **Detection:** Navigator.onLine API + failed API calls
- **UI:** Show banner: "You appear to be offline. Connection changes disabled."
- **State:** Disable all add/remove/save buttons
- **Recovery:** Re-enable when online detected

**Slow network:**
- **Timeout:** Set 10-second timeout for permission API calls
- **UI:** Show loading spinner with "This is taking longer than usual..." after 3 seconds
- **Action:** Allow user to cancel operation

## User Feedback & Notifications

### Success Feedback

**Device dialog save:**
- **Toast:** "Device connections updated" (brief, 2-second auto-dismiss)
- **Action:** Close dialog, refresh device list

**Entity panel add device:**
- **Toast:** "Truck 01 connected" (brief, 2-second auto-dismiss)
- **UI:** Device appears in list with subtle highlight animation

**Entity panel remove device:**
- **Toast:** "Truck 01 removed" (brief, 2-second auto-dismiss)
- **UI:** Device fades out from list

### Error Feedback

**General pattern:**
- **Duration:** Persistent (doesn't auto-dismiss)
- **Color:** Destructive/error color scheme
- **Icon:** ⚠ warning icon
- **Action:** Retry button (if applicable), Dismiss button
- **Details:** Expand/collapse for technical error details

**Example error toast:**
```
┌────────────────────────────────────────┐
│ ⚠ Failed to add Truck 01               │
│ Network timeout. Please try again.     │
│                                        │
│ [Retry] [Dismiss]     [▼ Details]     │
└────────────────────────────────────────┘
```

### Loading States

**Device dialog initial load:**
- **UI:** Skeleton loaders for each multi-select
- **Message:** "Loading connections..." (optional)

**Device dialog save:**
- **UI:** Disable Save button, show spinner inside button
- **Text:** "Saving..." in button
- **Duration:** Until API calls complete

**Entity panel add/remove:**
- **UI:** Show inline spinner next to device being added/removed
- **Duration:** Until API call completes
- **Optimistic:** Device appears/disappears immediately, spinner shows pending state

## Performance Considerations

### Lazy Loading
- Only fetch permissions when device dialog opens or entity section expands
- Don't pre-fetch all permissions for all devices on page load

### Caching
- Cache permission lists for 30 seconds (same TTL as device list)
- Clear cache after any permission modification
- Use existing cache mechanism in `traccar.ts`

### Debouncing
- Search input in multi-select: 300ms debounce
- Prevent rapid add/remove clicks: Disable button during API call

### Virtual Scrolling
- Implement for multi-select dropdowns with 100+ items
- Use react-virtual or similar library
- Only render visible items + buffer

### Batch Operations
- Device dialog: Calculate diff and batch all permission changes in parallel
- Use `Promise.all()` for independent permission calls
- Report partial failures clearly

### API Call Optimization
- Parallel requests where possible (fetching different permission types)
- Sequential only when necessary (add, then refresh)
- Cancel in-flight requests if component unmounts

## Testing Strategy

### Manual Testing Scenarios

**1. Device Dialog Happy Path**
- Open device dialog
- Add connections to multiple types (geofences, notifications, etc.)
- Remove some existing connections
- Save successfully
- Verify connections persist on re-open

**2. Entity Panel Happy Path**
- Expand device section in geofence card
- Add a device from dropdown
- Verify device appears in list
- Remove a device
- Verify device removed from list
- Check connection from device dialog side

**3. Error Handling**
- Simulate network failure during save (DevTools offline mode)
- Verify error message and retry functionality
- Test partial save failure scenario
- Verify optimistic updates revert on error

**4. Edge Cases**
- Test with empty states (no geofences, no devices)
- Test with large lists (100+ entities)
- Test concurrent editing (two users modifying same device)
- Test permission denied scenario

**5. Performance**
- Test with 50+ geofences in multi-select
- Verify virtual scrolling works smoothly
- Test search debouncing
- Monitor API call count (should batch properly)

**6. Accessibility**
- Keyboard navigation through multi-select
- Screen reader announces selections
- Focus management in dialogs
- All interactive elements have labels

### Automated Testing (Optional)

**Unit Tests:**
- Permission API functions (create, delete, get)
- Diff calculation logic in device dialog
- Multi-select component behavior

**Integration Tests:**
- Device dialog save flow
- Entity panel add/remove flow
- Error handling paths

**Note:** Given the UI-heavy nature of this feature, manual testing is the priority. Automated tests can be added incrementally if needed.

## Implementation Plan

### Phase 1: Foundation (Day 1)
1. Create multi-select component in `packages/ui`
2. Add permission types and API functions to `lib/traccar.ts`
3. Test API functions with manual calls

### Phase 2: Device Dialog (Day 2-3)
1. Create `device-connections-section.tsx`
2. Integrate into device edit dialog
3. Implement fetch, edit, save flow
4. Add error handling and loading states
5. Manual testing of device dialog flows

### Phase 3: Entity Panels (Day 4-5)
1. Create `expandable-device-list.tsx`
2. Integrate into all 6 entity panel components
3. Implement optimistic updates and error handling
4. Manual testing of entity panel flows

### Phase 4: Polish & Testing (Day 6)
1. Add visual indicators (connection counts)
2. Improve loading/error states
3. Add empty state handling
4. Comprehensive manual testing
5. Performance testing with large datasets
6. Accessibility audit

### Rollout Strategy

**Incremental Deployment:**
- Can deploy device dialog first, then entity panels separately
- Feature is purely additive, no breaking changes
- No database migrations needed

**Rollback Plan:**
- If issues arise, can disable new UI components via feature flag
- Existing functionality unaffected (permissions still work via Traccar API)

## Future Enhancements (Out of Scope)

1. **Bulk Operations**
   - Select multiple devices, connect to one geofence at once
   - Select multiple geofences, connect to one device at once
   - Useful for initial setup or large fleets

2. **Connection Templates**
   - Save common connection patterns as templates
   - Apply template to new devices
   - Example: "Delivery truck" template with standard geofences/notifications

3. **Connection Analytics**
   - Show most connected devices/entities
   - Identify unused entities (no device connections)
   - Connection history/audit log

4. **Import/Export**
   - Export all connections as JSON/CSV
   - Import connections from file
   - Useful for backup/restore or migrating setups

5. **Real-time Collaboration**
   - Show when another user is editing same device
   - Live updates when connections change
   - Conflict resolution UI

6. **Smart Suggestions**
   - Suggest geofences based on device category
   - Recommend notifications based on device usage
   - ML-based connection recommendations

## Success Metrics

**Usability:**
- Users can successfully add/remove connections without confusion
- Error states are clear and actionable
- Loading states don't block other interactions

**Performance:**
- Multi-select dropdowns render smoothly with 100+ items
- API calls complete within 2 seconds (normal network)
- No unnecessary re-renders or API calls

**Reliability:**
- Error recovery works (optimistic updates revert, retry works)
- No data loss on partial failures
- Concurrent edits don't cause corruption

## Appendix

### Traccar API Reference

**Permission Object:**
```json
{
  "deviceId": 123,
  "geofenceId": 456
}
```

**Create Permission:**
```
POST /api/permissions
Content-Type: application/json

{
  "deviceId": 123,
  "geofenceId": 456
}

Response: 204 No Content
```

**Delete Permission:**
```
DELETE /api/permissions
Content-Type: application/json

{
  "deviceId": 123,
  "geofenceId": 456
}

Response: 204 No Content
```

**Get Devices (includes permissions in some Traccar versions):**
```
GET /api/devices

Response: 200 OK
[
  {
    "id": 123,
    "name": "Truck 01",
    ...
  }
]
```

**Note:** The permissions API might require fetching devices and cross-referencing. Check Traccar documentation for the exact endpoint to retrieve existing permissions.

### Design Decisions

**Why multi-select in device dialog vs tabs?**
- Tabs would spread connections across multiple views, requiring more clicks
- Multi-selects keep all connection types visible at once
- Easier to see the full picture of device connections

**Why expandable sections in entity cards vs separate dialog?**
- Reduces modal overload (already have edit/delete dialogs)
- Keeps user in context of the entity they're managing
- Quicker for simple add/remove operations

**Why hybrid save pattern (batch vs immediate)?**
- Device dialog: multiple changes across types benefit from review-before-save
- Entity panel: single action (add/remove one device) feels natural with immediate feedback
- Matches user mental models for each context

**Why optimistic updates in entity panels?**
- Immediate feedback feels responsive and modern
- Single actions (add/remove one device) are low risk
- Easy to revert on error without complex state management

**Why not use a global permission cache?**
- Permissions are specific to device-entity pairs, complex to cache globally
- Cache at API function level is simpler and effective
- 30-second TTL balances freshness and performance
