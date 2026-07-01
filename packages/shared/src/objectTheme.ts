/**
 * Object theme — ordered visual upload inspirations on a record.
 * Each upload appends a theme bit; active cover/avatar fields mirror the latest bit of that role.
 */

export type ObjectThemeBitRole = "cover" | "avatar" | "inspiration"

export type ObjectThemeBit = {
  id: string
  role: ObjectThemeBitRole
  url: string
  key?: string | null
  uploadedAt: string
}

export type ObjectTheme = {
  bits: ObjectThemeBit[]
}

const ROLE_URL_FIELD: Record<ObjectThemeBitRole, string> = {
  cover: "coverImage",
  avatar: "avatar",
  inspiration: "inspirationImage",
}

const ROLE_KEY_FIELD: Record<ObjectThemeBitRole, string> = {
  cover: "coverImageKey",
  avatar: "avatarKey",
  inspiration: "inspirationImageKey",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseThemeBit(value: unknown): ObjectThemeBit | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || !value.id.trim()) return null
  if (value.role !== "cover" && value.role !== "avatar" && value.role !== "inspiration") {
    return null
  }
  if (typeof value.url !== "string" || !value.url.trim()) return null
  return {
    id: value.id.trim(),
    role: value.role,
    url: value.url.trim(),
    key: typeof value.key === "string" && value.key.trim() ? value.key.trim() : null,
    uploadedAt:
      typeof value.uploadedAt === "string" && value.uploadedAt.trim()
        ? value.uploadedAt.trim()
        : new Date(0).toISOString(),
  }
}

export function extractObjectTheme(container: unknown): ObjectTheme {
  if (!isRecord(container)) return { bits: [] }
  const raw = container.objectTheme
  if (!isRecord(raw) || !Array.isArray(raw.bits)) return { bits: [] }
  const bits = raw.bits.map(parseThemeBit).filter((bit): bit is ObjectThemeBit => bit !== null)
  return { bits }
}

export function getLatestObjectThemeBit(
  container: unknown,
  role: ObjectThemeBitRole,
): ObjectThemeBit | null {
  const { bits } = extractObjectTheme(container)
  for (let i = bits.length - 1; i >= 0; i -= 1) {
    if (bits[i].role === role) return bits[i]
  }
  return null
}

export function getActiveVisualUrl(container: unknown, role: ObjectThemeBitRole): string | null {
  if (!isRecord(container)) return null
  const urlField = ROLE_URL_FIELD[role]
  const direct = container[urlField]
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  return getLatestObjectThemeBit(container, role)?.url ?? null
}

export function getActiveVisualKey(
  container: unknown,
  role: ObjectThemeBitRole,
): string | null {
  if (!isRecord(container)) return null
  const keyField = ROLE_KEY_FIELD[role]
  const direct = container[keyField]
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  return getLatestObjectThemeBit(container, role)?.key ?? null
}

function newBitId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `theme-bit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function syncActiveFields(base: Record<string, unknown>, role: ObjectThemeBitRole): void {
  const latest = getLatestObjectThemeBit(base, role)
  const urlField = ROLE_URL_FIELD[role]
  const keyField = ROLE_KEY_FIELD[role]
  if (latest) {
    base[urlField] = latest.url
    if (latest.key) base[keyField] = latest.key
    else delete base[keyField]
  } else {
    delete base[urlField]
    delete base[keyField]
  }
}

/**
 * Append a visual upload as a theme bit and set the active field for that role.
 * Pass url=null to remove the latest bit of that role and re-sync the active field.
 */
export function applyObjectThemeUpload(
  existing: unknown,
  role: ObjectThemeBitRole,
  url: string | null,
  key?: string | null,
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {}
  const theme = extractObjectTheme(base)

  if (url === null) {
    let removed = false
    const nextBits: ObjectThemeBit[] = []
    for (let i = theme.bits.length - 1; i >= 0; i -= 1) {
      const bit = theme.bits[i]
      if (!removed && bit.role === role) {
        removed = true
        continue
      }
      nextBits.unshift(bit)
    }
    base.objectTheme = { bits: nextBits }
    syncActiveFields(base, role)
    return base
  }

  const trimmedUrl = url.trim()
  const bit: ObjectThemeBit = {
    id: newBitId(),
    role,
    url: trimmedUrl,
    key: key?.trim() || null,
    uploadedAt: new Date().toISOString(),
  }

  base.objectTheme = { bits: [...theme.bits, bit] }
  base[ROLE_URL_FIELD[role]] = trimmedUrl
  if (bit.key) base[ROLE_KEY_FIELD[role]] = bit.key
  else delete base[ROLE_KEY_FIELD[role]]

  return base
}
