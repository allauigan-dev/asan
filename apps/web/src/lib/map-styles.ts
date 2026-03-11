/**
 * Map style configurations for Asan fleet tracking app.
 * Supports multiple tile providers and 3D rendering options.
 */

export type MapStyleConfig = {
  id: string
  name: string
  description: string
  light: string
  dark: string
  /** Whether this style supports 3D buildings and terrain */
  supports3D?: boolean
  /** Default pitch (tilt) when switching to this style */
  defaultPitch?: number
}

/**
 * Available map styles with light and dark theme variants.
 * Styles are stored in localStorage under 'asan:mapStyle' key.
 */
export const MAP_STYLES: Record<string, MapStyleConfig> = {
  carto: {
    id: "carto",
    name: "Carto (Default)",
    description: "Clean, minimal style perfect for fleet tracking",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    supports3D: false,
    defaultPitch: 0,
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    description: "Detailed street map with rich geographic data",
    light: "https://tiles.openfreemap.org/styles/bright",
    dark: "https://tiles.openfreemap.org/styles/dark",
    supports3D: false,
    defaultPitch: 0,
  },
  osm3d: {
    id: "osm3d",
    name: "OpenStreetMap 3D",
    description: "3D buildings and terrain visualization",
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/liberty",
    supports3D: true,
    defaultPitch: 60,
  },
  satellite: {
    id: "satellite",
    name: "Satellite",
    description: "Satellite imagery view",
    light: "https://tiles.openfreemap.org/styles/satellite",
    dark: "https://tiles.openfreemap.org/styles/satellite",
    supports3D: false,
    defaultPitch: 0,
  },
}

const STORAGE_KEY = "asan:mapStyle"

/**
 * Get the currently selected map style from localStorage.
 * Defaults to 'carto' if not set or invalid.
 */
export function getStoredMapStyle(): MapStyleConfig {
  if (typeof window === "undefined") return MAP_STYLES.carto

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && MAP_STYLES[stored]) {
      return MAP_STYLES[stored]
    }
  } catch {
    // Ignore localStorage errors
  }

  return MAP_STYLES.carto
}

/**
 * Save the selected map style to localStorage.
 */
export function saveMapStyle(styleId: string): void {
  if (typeof window === "undefined") return

  try {
    if (MAP_STYLES[styleId]) {
      localStorage.setItem(STORAGE_KEY, styleId)
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get all available map styles as an array.
 */
export function getAvailableStyles(): MapStyleConfig[] {
  return Object.values(MAP_STYLES)
}

/**
 * A minimal style map that matches the `CustomStyleExample` UI.
 * - `default` uses the Map component's built-in Carto styles (pass `undefined`)
 * - other values pass a single URL for both light and dark
 */
export const CUSTOM_STYLE_EXAMPLE_STYLES = {
  default: undefined,
  openstreetmap: MAP_STYLES.osm.light,
  openstreetmap3d: MAP_STYLES.osm3d.light,
} as const

export type CustomStyleExampleStyleKey =
  keyof typeof CUSTOM_STYLE_EXAMPLE_STYLES

export function resolveCustomStyleExampleMapStyles(
  style: CustomStyleExampleStyleKey
): { light: string; dark: string } | undefined {
  const url = CUSTOM_STYLE_EXAMPLE_STYLES[style]
  return url ? { light: url, dark: url } : undefined
}

export function resolveCustomStyleExamplePitch(
  style: CustomStyleExampleStyleKey
): number {
  return style === "openstreetmap3d" ? (MAP_STYLES.osm3d.defaultPitch ?? 60) : 0
}
