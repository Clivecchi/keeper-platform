"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  readKeeperStageFromDomainSettings,
  resolveRealmWhereWeAre,
  type RealmWhereWeAreReading,
  type WhereWeAreDialogInput,
} from "@keeper/shared"
import { apiFetch } from "../../lib/api"
import { buildDomainBoardPath } from "../shell/shellMode"
import { fetchRealmFeed } from "../realm/useRealmFeed"
import { realmWhereWeAreLines } from "./whereWeAreCopy"

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

type DomainListRow = {
  id?: string
  slug?: string
  name?: string
  settings?: unknown
  isPrimary?: boolean
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

export function RealmWhereWeAreStage() {
  const navigate = useNavigate()
  const [reading, setReading] = React.useState<RealmWhereWeAreReading | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    let cancelled = false
    setStatus("loading")
    void (async () => {
      try {
        const feedPromise = fetchRealmFeed()
          .then((loaded) =>
            (loaded.events ?? []).map((event) => ({
              id: event.id,
              occurredAt: event.occurredAt,
              domainName: event.domainName,
              summary: event.summary,
            })),
          )
          .catch(() => [] as RealmWhereWeAreReading["trail"]["feed"])
        const domainRows = (await apiFetch("/api/domains/my")) as DomainListRow[]
        if (!Array.isArray(domainRows)) throw new Error("domains")
        const domains = await Promise.all(
          domainRows.map(async (domain) => {
            const id = domain.id?.trim() ?? ""
            if (!id) return null
            const res = (await apiFetch(
              `/api/domains/${encodeURIComponent(id)}/kip/dialogs`,
            )) as { dialogs?: DialogListRow[] }
            const dialogs = (res?.dialogs ?? []).flatMap((row) => {
              const next = dialogInput(row)
              return next ? [next] : []
            })
            const stage = readKeeperStageFromDomainSettings(domain.settings)
            return {
              id,
              slug: domain.slug?.trim() ?? "",
              name: domain.name?.trim() ?? "",
              face: domain.isPrimary === true,
              dialogs,
              stageBeatTitles: stage.story?.slides.map((slide) => slide.title) ?? [],
            }
          }),
        )
        const feed = await feedPromise
        if (cancelled) return
        setReading(
          resolveRealmWhereWeAre({
            domains: domains.flatMap((domain) => (domain ? [domain] : [])),
            feed,
          }),
        )
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openDomain = React.useCallback(
    (slug: string) => {
      const next = slug.trim()
      if (!next) return
      navigate(buildDomainBoardPath(next, "realm"))
    },
    [navigate],
  )

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
            {reading.continuations.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {reading.continuations.map((continuation) => {
                  const lines = realmWhereWeAreLines(continuation.reading)
                  return (
                    <li key={continuation.domainId}>
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-black/5"
                        style={{ color: "hsl(var(--theme-ink-primary))" }}
                        onClick={() => openDomain(continuation.domainSlug)}
                      >
                        <span className="block text-[17px] leading-relaxed">{continuation.domainName}</span>
                        {lines.map((line, index) => (
                          <span
                            key={`${continuation.domainId}:${index}`}
                            className="mt-1 block text-[15px] leading-relaxed"
                            style={{ color: "hsl(var(--theme-ink-secondary))" }}
                          >
                            {line}
                          </span>
                        ))}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                Nothing stored yet names a Domain to continue.
              </p>
            )}
            <RealmWhereWeAreTrail reading={reading} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function RealmWhereWeAreTrail({ reading }: { reading: RealmWhereWeAreReading }) {
  const { stageBeats, draftForwards, chatter, history, feed } = reading.trail
  const provenance = reading.continuations.flatMap((continuation) =>
    continuation.reading.claims.flatMap((claim) => {
      const when = formatWhen(claim.provenance.orientationUpdatedAt ?? claim.provenance.updatedAt)
      const who = claim.provenance.orientationUpdatedBy
      if (!when && !who && !claim.provenance.forwardTitle) {
        return []
      }
      const bits = [
        who ? who : null,
        when,
        claim.provenance.forwardTitle ? `Forward “${claim.provenance.forwardTitle}”` : null,
      ].filter(Boolean)
      return bits.length ? [`${continuation.domainName} — ${claim.title} — ${bits.join(" · ")}`] : []
    }),
  )
  const hasTrail =
    reading.face != null ||
    stageBeats.length > 0 ||
    draftForwards.length > 0 ||
    chatter.length > 0 ||
    history.length > 0 ||
    feed.length > 0 ||
    provenance.length > 0
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
        {reading.face ? <p>Face: {reading.face.domainName}</p> : null}
        {stageBeats.map((row) => (
          <p key={row.domainId}>
            {row.domainName} on Stage: {row.titles.join(" · ")}
          </p>
        ))}
        {draftForwards.map((row) => (
          <p key={`${row.domainId}:${row.dialogId}`}>
            {row.domainName} — {row.dialogTitle}
            {row.forwardTitle ? ` — Forward “${row.forwardTitle}”` : " has an authored Forward"}
          </p>
        ))}
        {chatter.map((row) => (
          <p key={row.domainId}>
            {row.domainName} chatter: {row.titles.join(", ")}
          </p>
        ))}
        {provenance.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {history.map((row) => (
          <p key={`${row.domainId}:${row.dialogId}`}>
            {row.domainName} — {row.title} — {row.count} history {row.count === 1 ? "note" : "notes"}
          </p>
        ))}
        {feed.map((event) => (
          <p key={event.id}>
            {event.domainName ? `${event.domainName} — ` : ""}
            {event.summary}
            {formatWhen(event.occurredAt) ? ` — ${formatWhen(event.occurredAt)}` : ""}
          </p>
        ))}
      </div>
    </details>
  )
}
