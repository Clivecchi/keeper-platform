"use client"

/**
 * Domain-scoped Keeper Stage composition — load, mutate, persist.
 * Stage owns presence; objects stay themselves.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import {
  bringOntoStage,
  emptyKeeperStage,
  appendStageStoryBeats,
  findLiveSourcedSlide,
  parseKeeperStage,
  removeStagePresence,
  selectStagePresence,
  updateStagePresence,
  type KeeperStageComposition,
  type KeeperStageTheme,
  type StagePresence,
  type StagePresenceKind,
} from "@keeper/shared"

export type ComposerCastAgent = {
  id: string
  slug: string
  name: string
  purpose: string | null
  role: string | null
}

type KeeperStageContextValue = {
  stage: KeeperStageComposition
  loading: boolean
  saving: boolean
  error: string | null
  reload: () => void
  bring: (input: {
    kind: StagePresenceKind
    objectId: string
    title: string
    contextualRole?: string | null
    direction?: string | null
  }) => StagePresence | null
  select: (presenceId: string | null) => void
  move: (presenceId: string, x: number, y: number) => void
  updateAgency: (presenceId: string, patch: { contextualRole?: string | null; direction?: string | null }) => void
  remove: (presenceId: string) => void
  setTheme: (theme: KeeperStageTheme | null) => void
  appendLiveBeat: (input: { leadMessageId: string; title: string; body: string }) => void
  /** Replace the filmstrip beats with an ordered Story. Presences and theme stay. */
  replaceStorySlides: (
    slides: Array<{
      id: string
      title: string
      body: string
      source?: { kind: "live" | "point" | "moment" | "path" | "keeper" | "journey"; id?: string | null }
    }>,
  ) => void
  selected: StagePresence | null
}

const KeeperStageCtx = React.createContext<KeeperStageContextValue | null>(null)

export function useKeeperStage(): KeeperStageContextValue {
  const ctx = React.useContext(KeeperStageCtx)
  if (!ctx) {
    throw new Error("useKeeperStage must be used within KeeperStageProvider")
  }
  return ctx
}

export function useKeeperStageOptional(): KeeperStageContextValue | null {
  return React.useContext(KeeperStageCtx)
}

function newPresenceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function KeeperStageProvider({
  domainId,
  children,
}: {
  domainId: string | null
  children: React.ReactNode
}) {
  const [stage, setStage] = React.useState<KeeperStageComposition>(emptyKeeperStage)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const persistTimer = React.useRef<number | null>(null)
  const stageRef = React.useRef(stage)
  stageRef.current = stage

  const persist = React.useCallback((next: KeeperStageComposition) => {
    if (!domainId) return
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      setSaving(true)
      void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/keeper-stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: next.title,
          selectedPresenceId: next.selectedPresenceId,
          presences: next.presences,
          story: next.story,
          theme: next.theme,
        }),
      })
        .then(() => setError(null))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not save Stage")
        })
        .finally(() => setSaving(false))
    }, 400)
  }, [domainId])

  React.useEffect(() => {
    if (!domainId) {
      setStage(emptyKeeperStage())
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/keeper-stage`)
      .then((res: { stage?: unknown }) => {
        if (!cancelled) setStage(parseKeeperStage(res?.stage))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Stage")
          setStage(emptyKeeperStage())
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    }
  }, [domainId])

  const reload = React.useCallback(() => {
    if (!domainId) return
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/keeper-stage`)
      .then((res: { stage?: unknown }) => {
        setStage(parseKeeperStage(res?.stage))
      })
      .catch(() => {
        /* keep current composition if reload fails */
      })
  }, [domainId])

  const apply = React.useCallback((next: KeeperStageComposition) => {
    setStage(next)
    persist(next)
  }, [persist])

  const bring = React.useCallback((input: {
    kind: StagePresenceKind
    objectId: string
    title: string
    contextualRole?: string | null
    direction?: string | null
  }): StagePresence | null => {
    const next = bringOntoStage(stageRef.current, {
      id: newPresenceId(),
      ...input,
    })
    apply(next)
    return next.presences.find((p) => p.kind === input.kind && p.objectId === input.objectId) ?? null
  }, [apply])

  const select = React.useCallback((presenceId: string | null) => {
    apply(selectStagePresence(stageRef.current, presenceId))
  }, [apply])

  const move = React.useCallback((presenceId: string, x: number, y: number) => {
    apply(updateStagePresence(stageRef.current, presenceId, { x, y }))
  }, [apply])

  const updateAgency = React.useCallback((
    presenceId: string,
    patch: { contextualRole?: string | null; direction?: string | null },
  ) => {
    apply(updateStagePresence(stageRef.current, presenceId, patch))
  }, [apply])

  const remove = React.useCallback((presenceId: string) => {
    apply(removeStagePresence(stageRef.current, presenceId))
  }, [apply])

  const setTheme = React.useCallback((theme: KeeperStageTheme | null) => {
    apply({ ...stageRef.current, theme })
  }, [apply])

  const replaceStorySlides = React.useCallback((
    slides: Array<{
      id: string
      title: string
      body: string
      source?: { kind: "live" | "point" | "moment" | "path" | "keeper" | "journey"; id?: string | null }
    }>,
  ) => {
    const story = parseStageStory({ slides })
    if (!story) return
    apply({ ...stageRef.current, story })
  }, [apply])

  const appendLiveBeat = React.useCallback((input: {
    leadMessageId: string
    title: string
    body: string
  }) => {
    const current = stageRef.current
    if (findLiveSourcedSlide(current.story, input.leadMessageId)) return
    const story = appendStageStoryBeats(current.story, [{
      id: `live-${input.leadMessageId}`.slice(0, 80),
      title: input.title,
      body: input.body,
      source: { kind: "live", id: input.leadMessageId },
    }])
    if (!story) return
    apply({ ...current, story })
  }, [apply])

  const selected = React.useMemo(
    () => stage.presences.find((p) => p.id === stage.selectedPresenceId) ?? null,
    [stage],
  )

  const value = React.useMemo<KeeperStageContextValue>(() => ({
    stage,
    loading,
    saving,
    error,
    reload,
    bring,
    select,
    move,
    updateAgency,
    remove,
    setTheme,
    appendLiveBeat,
    replaceStorySlides,
    selected,
  }), [stage, loading, saving, error, reload, bring, select, move, updateAgency, remove, setTheme, appendLiveBeat, replaceStorySlides, selected])

  return React.createElement(KeeperStageCtx.Provider, { value }, children)
}

export async function fetchComposerCast(domainId: string): Promise<ComposerCastAgent[]> {
  const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/agents`) as {
    data?: Array<{ id?: string; slug?: string; name?: string; purpose?: string | null; role?: string | null }>
  }
  const list = Array.isArray(res?.data) ? res.data : []
  return list
    .filter((row): row is { id: string; slug: string; name: string; purpose: string | null; role: string | null } =>
      Boolean(row.id && row.slug && row.name),
    )
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      purpose: row.purpose ?? null,
      role: row.role ?? null,
    }))
}
