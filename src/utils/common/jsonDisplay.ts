const tryParseJson = (value: string): unknown => {
  const trimmed = value.trim()
  if (!trimmed) return value
  if (
    !(
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    )
  ) {
    return value
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const normalizeJsonValue = (value: unknown, depth = 0): unknown => {
  if (depth > 6 || value == null) return value
  if (typeof value === 'string') {
    const parsed = tryParseJson(value)
    return parsed === value ? value : normalizeJsonValue(parsed, depth + 1)
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item, depth + 1))
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeJsonValue(item, depth + 1)])
    )
  }
  return value
}

/** Pretty-print JSON for UI details; also unwrap nested JSON strings. */
export const formatJsonDisplay = (value: unknown): string => {
  if (value == null || value === '') return ''
  try {
    const normalized = normalizeJsonValue(value)
    if (typeof normalized === 'string') {
      const parsed = tryParseJson(normalized)
      return typeof parsed === 'string' ? normalized : JSON.stringify(parsed, null, 2)
    }
    return JSON.stringify(normalized, null, 2)
  } catch {
    return String(value)
  }
}
