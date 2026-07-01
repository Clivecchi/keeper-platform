"use client"

import * as React from "react"
import MediaUploader from "../../../components/studio/MediaUploader"
import { apiFetch } from "../../../lib/api"
import type { ObjectThemeBitRole } from "@keeper/shared"
import { extractObjectTheme } from "@keeper/shared"
import { ObjectThemeBitsStrip } from "./ObjectThemeBitsStrip"

export type ChronicleCoverMedia = {
  type: "image"
  url: string
  key?: string
} | null

export interface ChronicleVisualUploadFieldProps {
  label?: string
  description?: string
  uploadRole?: ObjectThemeBitRole
  value: ChronicleCoverMedia
  themeBits?: unknown
  disabled?: boolean
  onSaved?: () => void
  onSave: (cover: ChronicleCoverMedia) => Promise<void>
}

export async function patchDomainThemeCover(
  domainId: string,
  existingTheme: Record<string, unknown> | undefined,
  cover: ChronicleCoverMedia,
): Promise<void> {
  const { applyObjectThemeUpload } = await import("@keeper/shared")
  const nextTheme = applyObjectThemeUpload(existingTheme, "cover", cover?.url ?? null, cover?.key ?? null)
  await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`, {
    method: "PATCH",
    body: JSON.stringify({ theme: nextTheme }),
  })
}

export async function patchPresenceCover(
  endpoint: string,
  cover: ChronicleCoverMedia,
): Promise<void> {
  await apiFetch(endpoint, {
    method: "PATCH",
    body: JSON.stringify({
      coverImage: cover?.url ?? null,
      coverImageKey: cover?.key ?? null,
    }),
  })
}

export async function patchPresenceAvatar(
  endpoint: string,
  avatar: ChronicleCoverMedia,
): Promise<void> {
  await apiFetch(endpoint, {
    method: "PATCH",
    body: JSON.stringify({
      avatar: avatar?.url ?? null,
      avatarKey: avatar?.key ?? null,
    }),
  })
}

/** @deprecated Use ChronicleVisualUploadField */
export type ChronicleCoverFieldProps = ChronicleVisualUploadFieldProps

export function ChronicleVisualUploadField({
  label = "Cover image",
  description = "Shown on the entity cover in Chronicle. Each upload adds to the object theme.",
  uploadRole = "cover",
  value,
  themeBits,
  disabled = false,
  onSaved,
  onSave,
}: ChronicleVisualUploadFieldProps) {
  const [status, setStatus] = React.useState<"idle" | "saving" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const bits = React.useMemo(() => extractObjectTheme(themeBits).bits, [themeBits])

  const handleChange = async (
    media: { type: "image" | "video"; url: string; key?: string } | null,
  ) => {
    if (media && media.type !== "image") {
      setStatus("error")
      setErrorMessage("Images must be PNG, JPG, or WEBP.")
      return
    }

    setStatus("saving")
    setErrorMessage(null)
    try {
      const next: ChronicleCoverMedia =
        media && media.type === "image"
          ? { type: "image", url: media.url, key: media.key }
          : null
      await onSave(next)
      onSaved?.()
      setStatus("idle")
    } catch (error) {
      console.error("[ChronicleVisualUploadField] save failed:", error)
      setStatus("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Image could not be saved.",
      )
    }
  }

  const roleLabel = uploadRole === "avatar" ? "Avatar" : uploadRole === "cover" ? "Cover" : "Visual"

  return (
    <div className="mb-4">
      <p className="keeper-presence-field-label mb-1.5">{label ?? roleLabel}</p>
      {description ? (
        <p
          className="text-[12px] mb-2 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {description}
        </p>
      ) : null}
      <MediaUploader value={value} onChange={handleChange} disabled={disabled || status === "saving"} />
      {status === "saving" ? (
        <p
          className="text-[12px] mt-2"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Saving {roleLabel.toLowerCase()}…
        </p>
      ) : null}
      {status === "error" && errorMessage ? (
        <p
          className="text-[12px] mt-2"
          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
        >
          {errorMessage}
        </p>
      ) : null}
      <ObjectThemeBitsStrip bits={bits} />
    </div>
  )
}

/** Back-compat alias */
export const ChronicleCoverField = ChronicleVisualUploadField
