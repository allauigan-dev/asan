type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>

function toClassName(value: ClassValue): string[] {
  if (!value) {
    return []
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap(toClassName)
  }

  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className)
}

function cn(...inputs: ClassValue[]) {
  return inputs.flatMap(toClassName).join(" ")
}

export { cn }
