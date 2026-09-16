"use client"

/**
 * Theme in Chronicle — Composer tool, not Composer.
 * Domain look: paper, ink, accent, alive, action. Ask the lead to refine.
 * Stage inherit / imagery stays available when that room is open.
 */

import * as React from "react"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import {
  extractDomainThemeCover,
  resolveTreatmentSwatches,
  stageThemeInheritsDomain,
  type KeeperStageTheme,
} from "@keeper/shared"

type LookDraft = {
  paper: string
  ink: string
  accent: string
  signal: string
  action: string
}

const SWATCHES: { key: keyof LookDraft; label: string; hint: string }[] = [
  { key: "paper", label: "Paper", hint: "the page" },
  { key: "ink", label: "Ink", hint: "the type" },
  { key: "accent", label: "Accent", hint: "identity" },
  { key: "signal", label: "Alive", hint: "Active" },
  { key: "action", label: "Action", hint: "buttons" },
]
import { useAuth } from "../../context/AuthContext"
import { ChronicleVisualUploadField } from "./chronicleConfig/ChronicleCoverField"
import { patchDomainTreatment } from "./chronicleConfig/chroniclePatch"
import { extractPaletteFromImageSource } from "../themes/extractImagePalette"
import { applyDomainVisualFromImage } from "../themes/applyDomainVisualFromImage"
import { rememberDomainCoverUpload } from "../themes/rememberDomainCoverUpload"
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

  const seeded = React.useMemo(
    () =>
      resolveTreatmentSwatches({
        background: treatment.palette.background,
        accent: treatment.palette.accent,
        ink: treatment.palette.ink,
        signal: treatment.palette.signal,
        action: treatment.palette.action,
        hasAtmosphere: Boolean(coverUrl),
      }),
    [
      treatment.palette.background,
      treatment.palette.accent,
      treatment.palette.ink,
      treatment.palette.signal,
      treatment.palette.action,
      coverUrl,
    ],
  )

  const [draft, setDraft] = React.useState<LookDraft>(() => ({
    paper: treatment.palette.background,
    ink: seeded.ink,
    accent: seeded.accent,
    signal: seeded.signal,
    action: seeded.action,
  }))

  React.useEffect(() => {
    setDraft({
      paper: treatment.palette.background,
      ink: seeded.ink,
      accent: seeded.accent,
      signal: seeded.signal,
      action: seeded.action,
    })
  }, [treatment.palette.background, seeded])

  const live = React.useMemo(
    () =>
      resolveTreatmentSwatches({
        background: draft.paper,
        accent: draft.accent,
        ink: draft.ink,
        signal: draft.signal,
        action: draft.action,
        hasAtmosphere: Boolean(coverUrl),
      }),
    [draft, coverUrl],
  )

  const applyTheme = React.useCallback(
    (next: KeeperStageTheme | null) => {
      stageApi?.setTheme(next)
    },
    [stageApi],
  )

  const persistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistLook = React.useCallback(
    async (next: LookDraft) => {
      if (!resolvedSlug || !user) return
      const resolved = resolveTreatmentSwatches({
        background: normalizeTreatmentHexColor(next.paper, treatment.palette.background),
        accent: normalizeTreatmentHexColor(next.accent, treatment.palette.accent),
        ink: normalizeTreatmentHexColor(next.ink, seeded.ink),
        signal: normalizeTreatmentHexColor(next.signal, seeded.signal),
        action: normalizeTreatmentHexColor(next.action, seeded.action),
        hasAtmosphere: Boolean(coverUrl),
      })
      const nextTreatment = {
        name: treatment.name,
        palette: {
          background: normalizeTreatmentHexColor(next.paper, treatment.palette.background),
          accent: resolved.accent,
          ink: resolved.ink,
          signal: resolved.signal,
          action: resolved.action,
        },
        font: treatment.font,
      }
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
                primary: resolved.ink,
                accent: resolved.accent,
                surface: resolved.paper,
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
    [resolvedSlug, user, treatment, coverUrl, shell, seeded],
  )

  const queuePersist = React.useCallback(
    (next: LookDraft) => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = window.setTimeout(() => {
        void persistLook(next)
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
      `Please refine ${domainName}'s look like a living book. Use all five roles: paper ${live.paper}, ink ${live.ink}, accent ${live.accent}, alive ${live.signal}, action ${live.action}. Atmosphere stays behind the page. Type, Active, and buttons should pop.`,
    )
    onClose()
  }, [board, domainName, live, onClose])

  const canEdit = Boolean(user && resolvedSlug)

  return (
    <div className="theme-reading-plane keeper-chronicle-stack" data-cover-mode="config">
      <div
        className="flex shrink-0 items-center gap-3 px-3 py-2.5"
        style={{
          borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))",
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
          Five roles, not two. Paper and ink hold the page. Accent is identity. Alive is
          Active. Action is what you press. Ask {agentName} if you want the image to choose.
        </p>

        <div
          className="mt-4 rounded-xl px-4 py-4"
          style={{
            backgroundColor: live.paper,
            color: live.ink,
            boxShadow: `inset 3px 0 0 ${live.accent}`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-[20px] font-bold leading-tight">{domainName}</p>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest"
              style={{ background: live.signal, color: "#1a1612" }}
            >
              Active
            </span>
          </div>
          <div className="mt-2 flex gap-3">
            <div className="w-0.5 shrink-0 rounded-full" style={{ background: live.accent }} />
            <p className="text-[13px] leading-relaxed" style={{ opacity: 0.88 }}>
              Type on paper. Life on the chip. A button you can actually see.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <span
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
              style={{ background: live.action, color: live.actionInk }}
            >
              Configure
            </span>
            <span
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
              style={{ border: `1px solid ${live.accent}`, color: live.accent }}
            >
              People
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {resolvedDomainId ? (
            <ChronicleVisualUploadField
              label="Cover / atmosphere"
              description="The world behind the page. We extract paper and ink so type still holds."
              value={coverUrl ? { type: "image", url: coverUrl } : null}
              themeBits={domainTheme}
              disabled={!canEdit || extracting || saving}
              library={{
                domainId: resolvedDomainId,
                displayLabel: "Domain cover",
              }}
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
                    createLibraryItem: false,
                  })
                  rememberDomainCoverUpload({
                    slug: resolvedSlug,
                    existingTheme: domainTheme,
                    cover,
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

          <div className="flex gap-2">
            {SWATCHES.map((swatch) => (
              <label
                key={swatch.key}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2"
                  style={{
                    background: live[swatch.key],
                    borderColor: "hsl(var(--theme-ink-primary) / 0.2)",
                  }}
                >
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={normalizeTreatmentHexColor(draft[swatch.key], live[swatch.key])}
                    disabled={!canEdit || saving}
                    aria-label={swatch.label}
                    onChange={(event) => {
                      const next = { ...draft, [swatch.key]: event.target.value }
                      setDraft(next)
                      queuePersist(next)
                    }}
                  />
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {swatch.label}
                </span>
                <span
                  className="text-center text-[9px] leading-tight"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {swatch.hint}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={askAgent}
            className="rounded-lg px-3 py-2.5 text-[13px] font-semibold"
            style={{
              background: live.action,
              color: live.actionInk,
            }}
          >
            Ask {agentName} to refine this look
          </button>

          {extracting || saving ? (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
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
              style={{ color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))" }}
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
                <span className="mt-0.5 block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
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
