"use client"

import * as React from "react"
import {
  resolveWhereWeAre,
  type WhereWeAreDialogInput,
  type WhereWeAreReading,
} from "@keeper/shared"
import { apiFetch } from "../../lib/api"
import { useKeeperStageOptional } from "./useKeeperStage"
import { whereWeAreClaimLine, whereWeAreUncertainty } from "./whereWeAreCopy"

type DialogListRow = {
  id?: string
  title?: string | null
  title_source?: string | null
  document_status?: string | null
  orientation?: string | null
  orientation_updated_at?: string | null
  orientation_updated_by?: string | null
  forward_title?: string | null
  forward_description?: string | null
  updated_at?: string | null
  chronicle_count?: number | null
}

function dialogInput(row: DialogListRow): WhereWeAreDialogInput | null {
  const id = row.id?.trim() ?? ""
  const title = row.title?.trim() ?? ""
  if (!id || !title) return null
  return {
    id,
    title,
    titleSource: row.title_source,
    documentStatus: row.document_status,
    orientation: row.orientation,
    orientationUpdatedAt: row.orientation_updated_at,
    orientationUpdatedBy: row.orientation_updated_by,
    forwardTitle: row.forward_title,
    forwardDescription: row.forward_description,
    updatedAt: row.updated_at,
    chronicleCount: row.chronicle_count,
  }
}

function formatWhen(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function WhereWeAreStage({
  domainId,
  onContinue,
}: {
  domainId: string | null
  onContinue: (dialogId: string) => void
}) {
  const stageApi = useKeeperStageOptional()
  const [reading, setReading] = React.useState<WhereWeAreReading | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  const beatTitles = React.useMemo(
    () => (stageApi?.stage.story?.slides ?? []).map((slide) => slide.title),
    [stageApi?.stage.story?.slides],
  )
  const beatKey = beatTitles.join("\0")

  React.useEffect(() => {
    if (!domainId) {
      setReading(null)
      setStatus("loading")
      return
    }
    let cancelled = false
    setStatus("loading")
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`)
      .then((res: unknown) => {
        if (cancelled) return
        const rows = (res as { dialogs?: DialogListRow[] })?.dialogs ?? []
        const dialogs = rows.flatMap((row) => {
          const next = dialogInput(row)
          return next ? [next] : []
        })
        setReading(
          resolveWhereWeAre({
            dialogs,
            stageBeatTitles: beatKey ? beatKey.split("\0") : [],
          }),
        )
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [domainId, beatKey])

  const uncertainty = reading ? whereWeAreUncertainty(reading) : null

  return (
    <div className="flex h-full min-h-0 justify-center overflow-y-auto px-6 py-6">
      <div className="w-full max-w-xl">
        <h1
          className="text-[1.75rem] font-medium tracking-tight"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          Where are we?
        </h1>
        {status === "loading" ? (
          <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Reading the trail…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            The trail could not be read.
          </p>
        ) : null}
        {status === "ready" && reading ? (
          <>
            {uncertainty ? (
              <p
                className="mt-6 text-[17px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {uncertainty}
              </p>
            ) : null}
            {reading.places.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {reading.places.map((place) => {
                  const lines = reading.claims.filter((claim) => claim.dialogId === place.dialogId)
                  return (
                    <li key={place.dialogId}>
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-black/5"
                        style={{ color: "hsl(var(--theme-ink-primary))" }}
                        onClick={() => onContinue(place.dialogId)}
                      >
                        {lines.map((claim) => (
                          <span key={claim.kind} className="block text-[16px] leading-relaxed">
                            {whereWeAreClaimLine(claim)}
                          </span>
                        ))}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : uncertainty ? null : (
              <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                Nothing stored yet names a place to continue.
              </p>
            )}
            <WhereWeAreTrail reading={reading} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function WhereWeAreTrail({ reading }: { reading: WhereWeAreReading }) {
  const { stageBeatTitles, chatterTitles, history } = reading.trail
  const provenance = reading.claims.flatMap((claim) => {
    const when = formatWhen(claim.provenance.orientationUpdatedAt ?? claim.provenance.updatedAt)
    const who = claim.provenance.orientationUpdatedBy
    if (!when && !who && claim.provenance.chronicleCount == null) return []
    const bits = [who ? who : null, when].filter(Boolean)
    return bits.length ? [`${claim.title} — ${bits.join(" · ")}`] : []
  })
  const hasTrail =
    stageBeatTitles.length > 0 || chatterTitles.length > 0 || history.length > 0 || provenance.length > 0
  if (!hasTrail) return null

  return (
    <details className="mt-10">
      <summary
        className="cursor-pointer text-[13px]"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Trail
      </summary>
      <div
        className="mt-3 space-y-3 text-[13px] leading-relaxed"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {stageBeatTitles.length > 0 ? <p>On Stage: {stageBeatTitles.join(" · ")}</p> : null}
        {chatterTitles.length > 0 ? <p>Chatter: {chatterTitles.join(", ")}</p> : null}
        {provenance.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {history.map((row) => (
          <p key={row.dialogId}>
            {row.title} — {row.count} history {row.count === 1 ? "note" : "notes"}
          </p>
        ))}
      </div>
    </details>
  )
}
