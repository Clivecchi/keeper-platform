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
