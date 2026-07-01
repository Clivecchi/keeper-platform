/**
 * Shared helpers for entity cover images stored on theme JSON or presenceSchema.
 */

import {
  applyObjectThemeUpload,
  getActiveVisualKey,
  getActiveVisualUrl,
} from "./objectTheme.js"

export type { ObjectTheme, ObjectThemeBit, ObjectThemeBitRole } from "./objectTheme.js"
export {
  applyObjectThemeUpload,
  extractObjectTheme,
  getActiveVisualKey,
  getActiveVisualUrl,
  getLatestObjectThemeBit,
} from "./objectTheme.js"

export type PresenceCoverFields = {
  coverImage?: string | null
  coverImageKey?: string | null
}

export type PresenceAvatarFields = {
  avatar?: string | null
  avatarKey?: string | null
}

export function extractPresenceCover(schema: unknown): PresenceCoverFields {
  return {
    coverImage: getActiveVisualUrl(schema, "cover"),
    coverImageKey: getActiveVisualKey(schema, "cover"),
  }
}

export function extractPresenceAvatar(schema: unknown): PresenceAvatarFields {
  return {
    avatar: getActiveVisualUrl(schema, "avatar"),
    avatarKey: getActiveVisualKey(schema, "avatar"),
  }
}

export function extractDomainThemeCover(theme: unknown): PresenceCoverFields {
  return extractPresenceCover(theme)
}

export function mergePresenceSchemaCover(
  existing: unknown,
  coverImage: string | null,
  coverImageKey?: string | null,
): Record<string, unknown> {
  return applyObjectThemeUpload(existing, "cover", coverImage, coverImageKey)
}

export function mergePresenceSchemaAvatar(
  existing: unknown,
  avatar: string | null,
  avatarKey?: string | null,
): Record<string, unknown> {
  return applyObjectThemeUpload(existing, "avatar", avatar, avatarKey)
}
