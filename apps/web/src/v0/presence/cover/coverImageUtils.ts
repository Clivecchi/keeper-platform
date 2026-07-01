import { extractDomainThemeCover, extractPresenceCover } from "@keeper/shared"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

export function resolveCoverAvatarDisplay(
  coverUrl: string | undefined | null,
  fallback: string,
): string {
  const trimmed = coverUrl?.trim()
  if (!trimmed) return fallback
  return getBlobProxyUrl(trimmed)
}

export function coverFromRecord(record: Record<string, unknown>): {
  coverImage: string | null
  coverImageKey: string | null
} {
  const theme =
    record.theme && typeof record.theme === "object"
      ? extractDomainThemeCover(record.theme)
      : extractDomainThemeCover(undefined)

  if (theme.coverImage) {
    return {
      coverImage: theme.coverImage,
      coverImageKey: theme.coverImageKey ?? null,
    }
  }

  const fromPresence = extractPresenceCover(record.presenceSchema)
  return {
    coverImage: fromPresence.coverImage ?? null,
    coverImageKey: fromPresence.coverImageKey ?? null,
  }
}
