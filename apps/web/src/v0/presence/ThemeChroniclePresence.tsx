"use client"

/**
 * Theme in Chronicle — Composer tool, not Composer.
 * Stage inherits the domain look; imagery can grow a Stage look.
 * Domain Treatment stays on Domain Config. This is not ?frame=theme.
 */

import * as React from "react"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import { stageThemeInheritsDomain, type KeeperStageTheme } from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { ChronicleVisualUploadField } from "./chronicleConfig/ChronicleCoverField"
import { extractPaletteFromImageSource } from "../themes/extractImagePalette"
import { useKeeperStageOptional } from "../composer/useKeeperStage"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"

export function ThemeChroniclePresence({
  onClose,
}: {
  onClose: () => void
}) {
  const { user } = useAuth()
  const stageApi = useKeeperStageOptional()
  const board = useUniversalBoardOptional()
  const onStage = board?.workspaceSurface === "stage"
  const theme = stageApi?.stage.theme ?? null
  const inherits = stageThemeInheritsDomain(theme)
  const sourceImage = theme?.sourceImage?.trim() || null
  const [extracting, setExtracting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const applyTheme = React.useCallback((next: KeeperStageTheme | null) => {
    stageApi?.setTheme(next)
  }, [stageApi])

  return (
    <div className="flex h-full min-h-0 flex-col" data-cover-mode="config">
      <div
        className="flex shrink-0 items-center gap-3 px-3 py-2.5"
        style={{
          borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "hsl(var(--theme-surface-elevated) / 0.08)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-75"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Close Theme"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Theme
          </p>
          <p
            className="truncate text-[14px] font-medium"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {onStage ? "This Stage’s look" : "Domain look"}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <p className="text-[13px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {onStage
            ? "Stage inherits this domain’s Treatment and cover. Upload imagery here to grow a Stage look — the same extraction the rest of the platform uses."
            : "Domain Treatment lives on Domain Config in Chronicle. Open Stage to grow a look from imagery for that room only."}
        </p>

        {onStage && stageApi ? (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex items-start gap-2.5 text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={inherits}
                disabled={!user}
                onChange={(event) => {
                  setError(null)
                  if (event.target.checked) {
                    applyTheme({ inherit: true })
                    return
                  }
                  applyTheme({
                    inherit: false,
                    sourceImage: sourceImage,
                    palette: theme?.palette ?? null,
                  })
                }}
              />
              <span>
                Inherit the domain
                <span className="mt-0.5 block text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  On until you grow a Stage look from an image.
                </span>
              </span>
            </label>

            <ChronicleVisualUploadField
              label="Stage imagery"
              description="Sampled the way a domain cover is. Does not replace the domain Treatment."
              value={sourceImage ? { type: "image", url: sourceImage } : null}
              disabled={!user || extracting}
              onSave={async (cover) => {
                setError(null)
                if (!cover?.url) {
                  applyTheme({ inherit: true })
                  return
                }
                setExtracting(true)
                try {
                  const palette = await extractPaletteFromImageSource(cover.url)
                  applyTheme({
                    inherit: false,
                    sourceImage: cover.url,
                    palette,
                  })
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not read that image")
                } finally {
                  setExtracting(false)
                }
              }}
            />

            {extracting ? (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                Reading the image…
              </p>
            ) : null}
            {error ? (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
                {error}
              </p>
            ) : null}
            {!inherits && theme?.palette ? (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                Stage look is on. Paper cards use a reading plane from this image.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
