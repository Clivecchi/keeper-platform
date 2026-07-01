"use client"

import * as React from "react"
import MediaUploader from "../../../components/studio/MediaUploader"
import { apiFetch } from "../../../lib/api"

export type ChronicleCoverMedia = {
  type: "image"
  url: string
  key?: string
} | null

export interface ChronicleCoverFieldProps {
  label?: string
  description?: string
  value: ChronicleCoverMedia
  disabled?: boolean
  onSaved?: () => void
  onSave: (cover: ChronicleCoverMedia) => Promise<void>
}

export async function patchDomainThemeCover(
  domainId: string,
  existingTheme: Record<string, unknown> | undefined,
  cover: ChronicleCoverMedia,
): Promise<void> {
  const nextTheme = {
    ...(existingTheme ?? {}),
    coverImage: cover?.url ?? null,
    coverImageKey: cover?.key ?? null,
  }
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

export function ChronicleCoverField({
  label = "Cover image",
  description = "Shown on the entity cover in Chronicle and across the domain.",
  value,
  disabled = false,
  onSaved,
  onSave,
}: ChronicleCoverFieldProps) {
  const [status, setStatus] = React.useState<"idle" | "saving" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleChange = async (
    media: { type: "image" | "video"; url: string; key?: string } | null,
  ) => {
    if (media && media.type !== "image") {
      setStatus("error")
      setErrorMessage("Cover images must be PNG, JPG, or WEBP.")
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
      console.error("[ChronicleCoverField] save failed:", error)
      setStatus("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Cover image could not be saved.",
      )
    }
  }

  return (
    <div className="mb-4">
      <p className="keeper-presence-field-label mb-1.5">{label}</p>
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
          Saving cover…
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
    </div>
  )
}
