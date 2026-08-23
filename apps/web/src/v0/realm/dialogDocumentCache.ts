/**
 * Short-lived Chronicle Document cache — avoids refetch on reselect within a session.
 */

import type { KipDraft } from "../../lib/kipApi"
import type { DocumentReorganizeProposal } from "@keeper/shared"

export type CachedDialogDocument = {
  dialogId: string
  title?: string
  status?: string
  forward?: { title: string; description: string }
  step?: { title: string; body: string }
  paths: Array<{ id: string; title: string; prelude?: string }>
  manuscripts: KipDraft[]
  reorganizeProposal?: DocumentReorganizeProposal
  components?: Array<{
    draftId: string
    title: string
    kind: string
    status: string
    summary?: string | null
    order?: number
    label?: string
  }>
}

type CacheEntry = {
  at: number
  document: CachedDialogDocument
}

const TTL_MS = 45_000
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<CachedDialogDocument>>()

function cacheKey(domainId: string, dialogId: string): string {
  return `${domainId}::${dialogId}`
}

export function peekDialogDocument(
  domainId: string,
  dialogId: string,
): CachedDialogDocument | null {
  const key = cacheKey(domainId, dialogId)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.document
}

export function putDialogDocument(
  domainId: string,
  dialogId: string,
  document: CachedDialogDocument,
): void {
  cache.set(cacheKey(domainId, dialogId), { at: Date.now(), document })
}

export function invalidateDialogDocument(domainId: string, dialogId?: string): void {
  if (!dialogId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${domainId}::`)) cache.delete(key)
    }
    return
  }
  cache.delete(cacheKey(domainId, dialogId))
}

/** Dedupe concurrent Chronicle loads for the same Dialog. */
export async function loadDialogDocumentCached(
  domainId: string,
  dialogId: string,
  fetcher: () => Promise<CachedDialogDocument>,
): Promise<CachedDialogDocument> {
  const peeked = peekDialogDocument(domainId, dialogId)
  if (peeked) return peeked

  const key = cacheKey(domainId, dialogId)
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = fetcher()
    .then((document) => {
      putDialogDocument(domainId, dialogId, document)
      return document
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
