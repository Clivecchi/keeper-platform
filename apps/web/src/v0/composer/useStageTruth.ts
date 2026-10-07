"use client"

import * as React from "react"
import {
  parseKeeperStage,
  readKeeperStageFromDomainSettings,
  resolveRealmWhereWeAre,
  resolveWhereWeAre,
  type RealmWhereWeAreReading,
  type WhereWeAreDialogInput,
  type WhereWeAreReading,
} from "@keeper/shared"
import { apiFetch } from "../../lib/api"
import { fetchRealmFeed } from "../realm/useRealmFeed"

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

/**
 * Orientation and the Stage performance both read this while a Realm pass is showing.
 * One in-flight load serves both. A later pass fetches again.
 */
let realmWhereWeAreInflight: Promise<RealmWhereWeAreReading> | null = null

function loadRealmWhereWeAreTruth(): Promise<RealmWhereWeAreReading> {
  if (realmWhereWeAreInflight) return realmWhereWeAreInflight
  const run = (async () => {
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
    return resolveRealmWhereWeAre({
      domains: domains.flatMap((domain) => (domain ? [domain] : [])),
      feed,
    })
  })()
  realmWhereWeAreInflight = run
  void run.finally(() => {
    if (realmWhereWeAreInflight === run) realmWhereWeAreInflight = null
  })
  return run
}

export function useRealmWhereWeAreTruth(enabled: boolean): {
  status: "loading" | "ready" | "error"
  truth: RealmWhereWeAreReading | null
} {
  const [truth, setTruth] = React.useState<RealmWhereWeAreReading | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setStatus("loading")
    void loadRealmWhereWeAreTruth()
      .then((next) => {
        if (cancelled) return
        setTruth(next)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { status: enabled ? status : "ready", truth: enabled ? truth : null }
}

export function useDomainWhereWeAreTruth(domainId: string | null): {
  status: "loading" | "ready" | "error"
  truth: WhereWeAreReading | null
} {
  const [truth, setTruth] = React.useState<WhereWeAreReading | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    setStatus("loading")
    void (async () => {
      try {
        const dialogRes = (await apiFetch(
          `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`,
        )) as { dialogs?: DialogListRow[] }
        const stageRes = (await apiFetch(
          `/api/domains/${encodeURIComponent(domainId)}/keeper-stage`,
        ).catch(() => ({ stage: null }))) as { stage?: unknown }
        if (cancelled) return
        const dialogs = (dialogRes?.dialogs ?? []).flatMap((row) => {
          const next = dialogInput(row)
          return next ? [next] : []
        })
        const stage = parseKeeperStage(stageRes?.stage)
        setTruth(
          resolveWhereWeAre({
            dialogs,
            stageBeatTitles: stage.story?.slides.map((slide) => slide.title) ?? [],
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
  }, [domainId])

  if (!domainId) return { status: "loading", truth: null }
  return { status, truth }
}
