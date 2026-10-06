"use client"

/**
 * Domain Stories — load and persist ordered narrative references.
 * Story Capture stays the Lead message. This store only holds the order.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import {
  addStoryMaterial,
  createKeeperStory,
  emptyDomainStories,
  parseDomainStories,
  removeStoryMaterial,
  moveStoryMaterial,
  upsertStory,
  type DomainStorySet,
  type KeeperStory,
  type StoryMaterialKind,
} from "@keeper/shared"

type DomainStoriesValue = {
  set: DomainStorySet
  loading: boolean
  saving: boolean
  error: string | null
  reload: () => Promise<void>
  createStory: (title?: string) => Promise<KeeperStory | null>
  addMaterial: (input: {
    storyId?: string | null
    kind: StoryMaterialKind
    sourceId: string
    title: string
    excerpt?: string
    dialogId?: string | null
    beatIndex?: number
  }) => Promise<KeeperStory | null>
  saveStory: (story: KeeperStory) => Promise<KeeperStory | null>
  removeMaterial: (storyId: string, slotId: string) => Promise<void>
  moveMaterial: (storyId: string, slotId: string, direction: -1 | 1) => Promise<void>
}

const DomainStoriesCtx = React.createContext<DomainStoriesValue | null>(null)

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `story-${Date.now().toString(36)}`
}

export function DomainStoriesProvider({
  domainId,
  children,
}: {
  domainId: string | null
  children: React.ReactNode
}) {
  const [set, setSet] = React.useState<DomainStorySet>(emptyDomainStories)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const setRef = React.useRef(set)
  setRef.current = set

  React.useEffect(() => {
    if (!domainId) {
      setSet(emptyDomainStories())
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}/stories`)
      .then((res: { stories?: unknown }) => {
        if (!cancelled) setSet(parseDomainStories(res?.stories))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Stories")
          setSet(emptyDomainStories())
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const reload = React.useCallback(async () => {
    if (!domainId) {
      setSet(emptyDomainStories())
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/stories`) as { stories?: unknown }
      setSet(parseDomainStories(res?.stories))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load Stories")
    } finally {
      setLoading(false)
    }
  }, [domainId])

  const persist = React.useCallback(async (next: DomainStorySet): Promise<DomainStorySet | null> => {
    if (!domainId) return null
    setSaving(true)
    setRef.current = next
    setSet(next)
    try {
      const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/stories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeStoryId: next.activeStoryId,
          stories: next.stories,
        }),
      }) as { stories?: unknown }
      const saved = parseDomainStories(res?.stories)
      setSet(saved)
      setError(null)
      return saved
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save Story")
      return null
    } finally {
      setSaving(false)
    }
  }, [domainId])

  const createStory = React.useCallback(async (title?: string) => {
    const story = createKeeperStory({ id: newId(), title })
    const saved = await persist(upsertStory(setRef.current, story))
    return saved?.stories.find((row) => row.id === story.id) ?? null
  }, [persist])

  const saveStory = React.useCallback(async (story: KeeperStory) => {
    const saved = await persist(upsertStory(setRef.current, story))
    return saved?.stories.find((row) => row.id === story.id) ?? null
  }, [persist])

  const addMaterial = React.useCallback(async (input: {
    storyId?: string | null
    kind: StoryMaterialKind
    sourceId: string
    title: string
    excerpt?: string
    dialogId?: string | null
    beatIndex?: number
  }) => {
    const current = setRef.current
    const target =
      current.stories.find((row) => row.id === (input.storyId || current.activeStoryId))
      ?? current.stories[0]
      ?? createKeeperStory({ id: newId(), title: "Untitled story" })
    const nextStory = addStoryMaterial(target, input)
    const saved = await persist(upsertStory(current, nextStory))
    return saved?.stories.find((row) => row.id === nextStory.id) ?? null
  }, [persist])

  const removeMaterial = React.useCallback(async (storyId: string, slotId: string) => {
    const story = setRef.current.stories.find((row) => row.id === storyId)
    if (!story) return
    await persist(upsertStory(setRef.current, removeStoryMaterial(story, slotId)))
  }, [persist])

  const moveMaterial = React.useCallback(async (storyId: string, slotId: string, direction: -1 | 1) => {
    const story = setRef.current.stories.find((row) => row.id === storyId)
    if (!story) return
    await persist(upsertStory(setRef.current, moveStoryMaterial(story, slotId, direction)))
  }, [persist])

  const value = React.useMemo<DomainStoriesValue>(() => ({
    set,
    loading,
    saving,
    error,
    reload,
    createStory,
    addMaterial,
    saveStory,
    removeMaterial,
    moveMaterial,
  }), [set, loading, saving, error, reload, createStory, addMaterial, saveStory, removeMaterial, moveMaterial])

  return React.createElement(DomainStoriesCtx.Provider, { value }, children)
}

export function useDomainStoriesOptional(): DomainStoriesValue | null {
  return React.useContext(DomainStoriesCtx)
}
