"use client"

/**
 * Theme in Chronicle — Composer tool, not Composer.
 * Domain look: paper, accent, cover. Ask the lead to refine.
 * Stage inherit / imagery stays available when that room is open.
 */

import * as React from "react"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import {
  extractDomainThemeCover,
  resolvePlacementReadingPlane,
  stageThemeInheritsDomain,
  type KeeperStageTheme,
} from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { ChronicleVisualUploadField } from "./chronicleConfig/ChronicleCoverField"
import { patchDomainTreatment } from "./chronicleConfig/chroniclePatch"
import { extractPaletteFromImageSource } from "../themes/extractImagePalette"
import { applyDomainVisualFromImage } from "../themes/applyDomainVisualFromImage"
import { useKeeperStageOptional } from "../composer/useKeeperStage"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useFrameLeadAgentIdentity } from "../hooks/useFrameLeadAgentIdentity"
import {
  resolveDomainTreatment,
  normalizeTreatmentHexColor,
} from "../treatment/resolveDomainTreatment"
import { apiFetch } from "../../lib/api"

export function ThemeChroniclePresence({
  domainId,
  domainSlug,
  onClose,
}: {
  domainId?: string | null
  domainSlug?: string | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const shell = useV0ShellOptional()
  const stageApi = useKeeperStageOptional()
  const board = useUniversalBoardOptional()
  const onStage = board?.workspaceSurface === "stage"
  const theme = stageApi?.stage.theme ?? null
  const inherits = stageThemeInheritsDomain(theme)
  const sourceImage = theme?.sourceImage?.trim() || null
  const [extracting, setExtracting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const resolvedSlug = domainSlug?.trim() || shell?.domainSlug || ""
  const resolvedDomainId = domainId?.trim() || ""
  const treatment = resolveDomainTreatment(shell?.domainFrame ?? null)
  const domainTheme = (shell?.domainData?.theme ?? shell?.domainFrame?.theme ?? {}) as Record<
    string,
    unknown
  >
  const coverUrl = extractDomainThemeCover(domainTheme).coverImage?.trim() || null
  const domainName =
    (typeof (shell?.domainData as { name?: unknown } | null | undefined)?.name === "string"
      ? (shell?.domainData as { name: string }).name.trim()
      : "") ||
    shell?.domainFrame?.theme?.wordmark?.trim() ||
    resolvedSlug ||
    "this domain"

  const shellLead = shell?.domainData as
    | { leadAgentSlug?: string | null; leadAgentName?: string | null }
    | null
    | undefined
  const leadIdentity = useFrameLeadAgentIdentity(
    shellLead?.leadAgentSlug ?? null,
    shellLead?.leadAgentName ?? "Kip",
    shellLead?.leadAgentName,
  )
  const agentName = leadIdentity.displayName || "the lead agent"

  const [background, setBackground] = React.useState(treatment.palette.background)
  const [accent, setAccent] = React.useState(treatment.palette.accent)

  React.useEffect(() => {
    setBackground(treatment.palette.background)
    setAccent(treatment.palette.accent)
  }, [treatment.palette.background, treatment.palette.accent])

  const plane = React.useMemo(
    () =>
      resolvePlacementReadingPlane({
        surfaceHex: background,
        hasAtmosphere: Boolean(coverUrl),
      }),
    [background, coverUrl],
  )

  const applyTheme = React.useCallback(
    (next: KeeperStageTheme | null) => {
      stageApi?.setTheme(next)
    },
    [stageApi],
  )

  const persistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistLook = React.useCallback(
    async (nextBackground: string, nextAccent: string) => {
      if (!resolvedSlug || !user) return
      const bg = normalizeTreatmentHexColor(nextBackground, treatment.palette.background)
      const ac = normalizeTreatmentHexColor(nextAccent, treatment.palette.accent)
      const nextTreatment = {
        name: treatment.name,
        palette: { background: bg, accent: ac },
        font: treatment.font,
      }
      const paper = resolvePlacementReadingPlane({
        surfaceHex: bg,
        hasAtmosphere: Boolean(coverUrl),
      })
      setSaving(true)
      setError(null)
      try {
        await patchDomainTreatment(resolvedSlug, nextTreatment)
        await apiFetch(`/api/domains/${encodeURIComponent(resolvedSlug)}/frame`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treatment: nextTreatment,
            theme: {
              colors: {
                primary: paper.inkPrimaryHex,
                accent: ac,
                surface: paper.surfaceHex,
              },
            },
          }),
        })
        await shell?.reloadDomainFrame()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save that look")
      } finally {
        setSaving(false)
      }
    },
    [resolvedSlug, user, treatment, coverUrl, shell],
  )

  const queuePersist = React.useCallback(
    (nextBackground: string, nextAccent: string) => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = window.setTimeout(() => {
        void persistLook(nextBackground, nextAccent)
      }, 450)
    },
    [persistLook],
  )

  React.useEffect(() => {
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
    }
  }, [])

  const askAgent = React.useCallback(() => {
    board?.actions.setDraftComposeHint(
      `Please refine ${domainName}'s look. The Domain card and Chronicle must read like a living book — sealed paper, strong ink contrast, atmosphere behind the page not through the type. Current paper is ${background}, accent is ${accent}. Fix inadequate contrast if you see it.`,
    )
    onClose()
  }, [board, domainName, background, accent, onClose])

  const canEdit = Boolean(user && resolvedSlug)

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
            {domainName} look
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Change the paper and accent here, or ask {agentName} to refine contrast. Atmosphere
          belongs behind the page — type stays on sealed paper.
        </p>

        <div
          className="theme-reading-plane mt-4 rounded-xl border px-4 py-4"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            backgroundColor: plane.surfaceHex,
            color: plane.ink.primary,
          }}
        >
          <p className="font-serif text-[20px] font-bold leading-tight">{domainName}</p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: plane.ink.secondary }}>
            This is how the Domain card should read — a living book, not type lost in the
            photograph.
          </p>
          <p className="mt-2 text-[11px]" style={{ color: plane.ink.tertiary }}>
            {plane.contrast >= 4.5
              ? `${plane.contrast}:1 — readable`
              : `${plane.contrast}:1 — too close; paper will seal`}
            {plane.adjusted ? " · mid-tone pushed to paper" : ""}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {resolvedDomainId ? (
            <ChronicleVisualUploadField
              label="Cover / atmosphere"
              description="The world behind the page. We extract paper and ink so type still holds."
              value={coverUrl ? { type: "image", url: coverUrl } : null}
              themeBits={domainTheme}
              disabled={!canEdit || extracting || saving}
              onSave={async (cover) => {
                setError(null)
                if (!cover?.url) {
                  setError("Keep a cover so atmosphere has somewhere to sit.")
                  return
                }
                setExtracting(true)
                try {
                  await applyDomainVisualFromImage({
                    domainId: resolvedDomainId,
                    domainSlug: resolvedSlug,
                    existingTheme: domainTheme,
                    imageUrl: cover.url,
                    imageKey: cover.key ?? null,
                    createLibraryItem: true,
                    userId: user?.id,
                    displayLabel: "Domain cover",
                  })
                  await shell?.reloadDomainFrame()
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not read that image")
                } finally {
                  setExtracting(false)
                }
              }}
            />
          ) : null}

          <label className="flex flex-col gap-1.5 text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Paper
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeTreatmentHexColor(background, "#f5f0e8")}
                disabled={!canEdit || saving}
                onChange={(event) => {
                  const next = event.target.value
                  setBackground(next)
                  queuePersist(next, accent)
                }}
                aria-label="Paper color"
              />
              <input
                type="text"
                value={background}
                disabled={!canEdit || saving}
                onChange={(event) => setBackground(event.target.value)}
                onBlur={() => void persistLook(background, accent)}
                className="min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-[12px]"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                  background: "hsl(var(--theme-surface-paper) / 0.7)",
                  color: "hsl(var(--theme-ink-primary))",
                }}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Accent
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeTreatmentHexColor(accent, "#2d6a7f")}
                disabled={!canEdit || saving}
                onChange={(event) => {
                  const next = event.target.value
                  setAccent(next)
                  queuePersist(background, next)
                }}
                aria-label="Accent color"
              />
              <input
                type="text"
                value={accent}
                disabled={!canEdit || saving}
                onChange={(event) => setAccent(event.target.value)}
                onBlur={() => void persistLook(background, accent)}
                className="min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-[12px]"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                  background: "hsl(var(--theme-surface-paper) / 0.7)",
                  color: "hsl(var(--theme-ink-primary))",
                }}
              />
            </span>
          </label>

          <button
            type="button"
            onClick={askAgent}
            className="rounded-lg px-3 py-2.5 text-[13px] font-semibold"
            style={{
              background: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.16)",
              border: "1px solid hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.4)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          >
            Ask {agentName} to refine this look
          </button>

          {extracting || saving ? (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              {extracting ? "Reading the image…" : "Saving the look…"}
            </p>
          ) : null}
          {error ? (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
              {error}
            </p>
          ) : null}
        </div>

        {onStage && stageApi ? (
          <div
            className="mt-6 flex flex-col gap-4 border-t pt-5"
            style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              This Stage
            </p>
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
          </div>
        ) : null}
      </div>
    </div>
  )
}
