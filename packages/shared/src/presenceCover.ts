/**
 * Shared helpers for entity cover images stored on theme JSON or presenceSchema.
 */

export type PresenceCoverFields = {
  coverImage?: string | null
  coverImageKey?: string | null
}

export function extractPresenceCover(schema: unknown): PresenceCoverFields {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return {}
  }
  const record = schema as Record<string, unknown>
  return {
    coverImage:
      typeof record.coverImage === "string" && record.coverImage.trim()
        ? record.coverImage.trim()
        : null,
    coverImageKey:
      typeof record.coverImageKey === "string" && record.coverImageKey.trim()
        ? record.coverImageKey.trim()
        : null,
  }
}

export function extractDomainThemeCover(theme: unknown): PresenceCoverFields {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return {}
  }
  const record = theme as Record<string, unknown>
  return {
    coverImage:
      typeof record.coverImage === "string" && record.coverImage.trim()
        ? record.coverImage.trim()
        : null,
    coverImageKey:
      typeof record.coverImageKey === "string" && record.coverImageKey.trim()
        ? record.coverImageKey.trim()
        : null,
  }
}

export function mergePresenceSchemaCover(
  existing: unknown,
  coverImage: string | null,
  coverImageKey?: string | null,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}

  if (coverImage === null) {
    delete base.coverImage
    delete base.coverImageKey
    return base
  }

  base.coverImage = coverImage
  if (coverImageKey === null) {
    delete base.coverImageKey
  } else if (typeof coverImageKey === "string" && coverImageKey.trim()) {
    base.coverImageKey = coverImageKey.trim()
  }

  return base
}
