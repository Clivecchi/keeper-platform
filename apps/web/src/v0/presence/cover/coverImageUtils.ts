import { extractDomainThemeCover, extractPresenceCover, extractPresenceAvatar } from "@keeper/shared"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

export function resolveCoverAvatarDisplay(
  coverUrl: string | undefined | null,
  fallback: string,
): string {
  const trimmed = coverUrl?.trim()
  if (!trimmed) return fallback
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("data:image/")
  ) {
    return getBlobProxyUrl(trimmed)
  }
  return trimmed
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
  if (fromPresence.coverImage) {
    return {
      coverImage: fromPresence.coverImage,
      coverImageKey: fromPresence.coverImageKey ?? null,
    }
  }

  if (typeof record.coverImage === "string" && record.coverImage.trim()) {
    return {
      coverImage: record.coverImage.trim(),
      coverImageKey:
        typeof record.coverImageKey === "string" && record.coverImageKey.trim()
          ? record.coverImageKey.trim()
          : null,
    }
  }

  return { coverImage: null, coverImageKey: null }
}

/** Chronicle card hero — cover first, then avatar, so Domain/Keeper/Agent share one reader. */
export function heroImageFromRecord(record: Record<string, unknown>): {
  url: string | null
  key: string | null
} {
  const cover = coverFromRecord(record)
  if (cover.coverImage) {
    return { url: cover.coverImage, key: cover.coverImageKey }
  }
  const avatar = avatarFromRecord(record)
  return { url: avatar.avatar, key: avatar.avatarKey }
}

export function avatarFromRecord(record: Record<string, unknown>): {
  avatar: string | null
  avatarKey: string | null
} {
  const fromPresence = extractPresenceAvatar(record.presenceSchema)
  if (fromPresence.avatar) {
    return {
      avatar: fromPresence.avatar,
      avatarKey: fromPresence.avatarKey ?? null,
    }
  }
  if (typeof record.avatar === "string" && record.avatar.trim()) {
    return { avatar: record.avatar.trim(), avatarKey: null }
  }
  return { avatar: null, avatarKey: null }
}

export function themeContainerFromRecord(record: Record<string, unknown>): unknown {
  if (record.theme && typeof record.theme === "object") return record.theme
  return record.presenceSchema
}
