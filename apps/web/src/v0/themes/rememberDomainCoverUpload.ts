import { applyObjectThemeUpload } from "@keeper/shared"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { patchDomainSwitcherCacheEntry } from "../boards/domain/domainSwitcherData"
import {
  patchCachedDomainBySlug,
  type DomainBySlugRecord,
} from "../boards/domain/domainShellCache"
import type { ChronicleCoverMedia } from "../presence/chronicleConfig/ChronicleCoverField"

export function rememberDomainCoverUpload(params: {
  slug: string
  existingTheme?: Record<string, unknown>
  cover: ChronicleCoverMedia
}): Record<string, unknown> {
  const nextTheme = applyObjectThemeUpload(
    params.existingTheme,
    "cover",
    params.cover?.url ?? null,
    params.cover?.key ?? null,
  )
  patchCachedDomainBySlug(params.slug, {
    theme: nextTheme as DomainBySlugRecord["theme"],
  })
  patchDomainSwitcherCacheEntry(params.slug, {
    coverImageUrl: params.cover?.url ? getBlobProxyUrl(params.cover.url) : null,
  })
  return nextTheme
}
