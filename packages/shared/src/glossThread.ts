import type { GlossAnchor } from './glossAnchor.js'
import { isGlossAnchor } from './glossAnchor.js'

export interface GlossThreadMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  createdAt: string
}

export interface GlossThread {
  id: string
  anchor: GlossAnchor
  messages: GlossThreadMessage[]
  createdAt: string
  updatedAt: string
}

/** Stable surface identity — ignores phrase-level selectionText. */
export function buildGlossSurfaceKey(anchor: GlossAnchor): string {
  return [
    anchor.entityKind,
    anchor.entityId,
    anchor.nodeId ?? 'root',
    anchor.receiptIndex != null ? String(anchor.receiptIndex) : '',
    anchor.messageId ?? '',
  ]
    .filter((part) => part.length > 0)
    .join(':')
}

export function buildGlossThreadKey(anchor: GlossAnchor): string {
  const selection = anchor.selectionText?.trim().replace(/\s+/g, ' ').slice(0, 120)
  return [
    buildGlossSurfaceKey(anchor),
    selection ? `sel:${encodeURIComponent(selection)}` : '',
  ]
    .filter((part) => part.length > 0)
    .join(':')
}

function isGlossThreadMessage(value: unknown): value is GlossThreadMessage {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string'
    && (record.role === 'user' || record.role === 'agent')
    && typeof record.content === 'string'
    && typeof record.createdAt === 'string'
  )
}

export function isGlossThread(value: unknown): value is GlossThread {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string'
    && isGlossAnchor(record.anchor)
    && Array.isArray(record.messages)
    && record.messages.every(isGlossThreadMessage)
    && typeof record.createdAt === 'string'
    && typeof record.updatedAt === 'string'
  )
}

export function parseGlossThreads(value: unknown): GlossThread[] {
  if (!Array.isArray(value)) return []
  return value.filter(isGlossThread)
}

/**
 * A Document Point is `draft` + node. `messageId` on that anchor is only which
 * chat row stored the thread, and it splits one Point into two keys.
 * In-stream Gloss (message, library card, receipt) keeps its own anchor.
 */
export function canonicalGlossAnchor(anchor: GlossAnchor): GlossAnchor {
  if (anchor.entityKind !== 'draft' || !anchor.messageId) return anchor
  const next: GlossAnchor = {
    entityKind: anchor.entityKind,
    entityId: anchor.entityId,
  }
  if (anchor.nodeId !== undefined) next.nodeId = anchor.nodeId
  if (anchor.receiptIndex !== undefined) next.receiptIndex = anchor.receiptIndex
  if (anchor.selectionText !== undefined) next.selectionText = anchor.selectionText
  return next
}

export function isDocumentPointGlossThread(thread: GlossThread): boolean {
  return thread.anchor.entityKind === 'draft'
}

function glossMessageTime(message: GlossThreadMessage): number {
  const time = Date.parse(message.createdAt)
  return Number.isNaN(time) ? 0 : time
}

/**
 * Fold Document Gloss threads that differ only by storage `messageId` into one
 * thread per Point/context. Message-stream threads are left out — they stay
 * on their chat message.
 */
export function mergeDocumentGlossThreads(threads: readonly GlossThread[]): GlossThread[] {
  const groups = new Map<string, GlossThread>()

  for (const thread of threads) {
    if (!isDocumentPointGlossThread(thread)) continue
    const anchor = canonicalGlossAnchor(thread.anchor)
    const key = buildGlossThreadKey(anchor)
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        ...thread,
        anchor,
        messages: [...thread.messages].sort((a, b) => glossMessageTime(a) - glossMessageTime(b)),
      })
      continue
    }

    const byId = new Map(existing.messages.map((message) => [message.id, message]))
    for (const message of thread.messages) {
      if (!byId.has(message.id)) byId.set(message.id, message)
    }
    const messages = [...byId.values()].sort((a, b) => glossMessageTime(a) - glossMessageTime(b))
    const createdAt = [existing.createdAt, thread.createdAt].sort()[0] ?? existing.createdAt
    const updatedAt = [existing.updatedAt, thread.updatedAt].sort().at(-1) ?? existing.updatedAt
    groups.set(key, {
      ...existing,
      anchor,
      messages,
      createdAt,
      updatedAt,
    })
  }

  return [...groups.values()]
}

export function findGlossThread(
  threads: readonly GlossThread[],
  anchor: GlossAnchor,
): GlossThread | undefined {
  const key = buildGlossThreadKey(anchor)
  return threads.find((thread) => buildGlossThreadKey(thread.anchor) === key)
}

export function upsertGlossThreadMessage(
  threads: readonly GlossThread[],
  anchor: GlossAnchor,
  message: GlossThreadMessage,
): GlossThread[] {
  const key = buildGlossThreadKey(anchor)
  const now = new Date().toISOString()
  const existing = threads.find((thread) => buildGlossThreadKey(thread.anchor) === key)

  if (existing) {
    return threads.map((thread) =>
      thread.id === existing.id
        ? {
            ...thread,
            messages: [...thread.messages, message],
            updatedAt: now,
          }
        : thread,
    )
  }

  return [
    ...threads,
    {
      id: crypto.randomUUID(),
      anchor,
      messages: [message],
      createdAt: now,
      updatedAt: now,
    },
  ]
}

/** Ensure an empty gloss thread exists on a message for external/MCP writes — idempotent by anchor key. */
export function ensureGlossThreadCarrier(
  threads: readonly GlossThread[],
  anchor: GlossAnchor,
  messageId: string,
): GlossThread[] {
  const anchored: GlossAnchor = { ...anchor, messageId }
  const key = buildGlossThreadKey(anchored)
  if (threads.some((thread) => buildGlossThreadKey(thread.anchor) === key)) {
    return [...threads]
  }
  const now = new Date().toISOString()
  return [
    ...threads,
    {
      id: crypto.randomUUID(),
      anchor: anchored,
      messages: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}
