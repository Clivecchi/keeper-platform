import { applyObjectThemeUpload, type ExtractedImagePalette } from "@keeper/shared"
import { apiFetch } from "../../lib/apiFetch"
import { createLibraryItem } from "../presence/integrationChronicle/libraryNavCreate"
import { extractPaletteFromImageSource } from "./extractImagePalette"

export type ApplyDomainVisualFromImageParams = {
  domainId: string
  domainSlug: string
  existingTheme?: Record<string, unknown>
  imageUrl: string
  imageKey?: string | null
  file?: File | null
  createLibraryItem?: boolean
  userId?: string
  displayLabel?: string | null
  activeKeeperId?: string | null
  activeAgentId?: string | null
}

export type ApplyDomainVisualFromImageResult = {
  libraryItemId?: string
  palette: ExtractedImagePalette | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

async function extractPalette(
  file: File | null | undefined,
  imageUrl: string,
): Promise<ExtractedImagePalette | null> {
  try {
    if (file) return await extractPaletteFromImageSource(file)
    if (imageUrl.trim()) return await extractPaletteFromImageSource(imageUrl)
    return null
  } catch (error) {
    console.warn("[applyDomainVisualFromImage] palette extraction skipped:", error)
    return null
  }
}

/**
 * One image upload → Library row (optional) + domain cover + extracted Treatment.
 * Cover and Treatment still apply when Library create fails.
 */
export async function applyDomainVisualFromImage(
  params: ApplyDomainVisualFromImageParams,
): Promise<ApplyDomainVisualFromImageResult> {
  let libraryItemId: string | undefined

  if (params.createLibraryItem && params.userId) {
    try {
      const row = await createLibraryItem({
        domainId: params.domainId,
        userId: params.userId,
        sourceType: "upload",
        sourceRef: params.imageUrl,
        displayLabel: params.displayLabel,
        activeKeeperId: params.activeKeeperId,
        activeAgentId: params.activeAgentId,
      })
      libraryItemId = row.id
    } catch (error) {
      console.warn("[applyDomainVisualFromImage] library item skipped:", error)
    }
  }

  const palette = await extractPalette(params.file, params.imageUrl)
  const nextTheme = applyObjectThemeUpload(
    params.existingTheme,
    "cover",
    params.imageUrl,
    params.imageKey ?? null,
  )

  if (palette) {
    const existingColors = isRecord(nextTheme.colors) ? nextTheme.colors : {}
    nextTheme.colors = {
      ...existingColors,
      primary: palette.primary,
      accent: palette.accent,
      surface: palette.surface,
    }
  }

  await apiFetch(`/api/domains/${encodeURIComponent(params.domainId)}`, {
    method: "PATCH",
    body: JSON.stringify({ theme: nextTheme }),
  })

  if (palette) {
    await apiFetch(`/api/domains/${encodeURIComponent(params.domainSlug)}/frame`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatment: {
          name: "From image",
          palette: {
            background: palette.background,
            accent: palette.accent,
          },
        },
        theme: {
          colors: {
            primary: palette.primary,
            accent: palette.accent,
            surface: palette.surface,
          },
        },
      }),
    })
  }

  return { libraryItemId, palette }
}
