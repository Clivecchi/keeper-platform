/**
 * GlossAnchor — stable reference to an EntityKind node for Dialog / Gloss context.
 * Phase 1b: types + DOM attribute helpers only — no Gloss gesture UI yet.
 */

export const GLOSS_ENTITY_KINDS = [
  'draft',
  'journey',
  'path',
  'moment',
  'keeper',
  'dialog',
  'message',
  'library',
] as const

/** Sub-node within a glossable surface (receipt image, caption, card shell, etc.) */
export type GlossNodeId =
  | 'card'
  | 'image'
  | 'caption'
  | 'body'
  | 'title'
  | 'narrative'
  | string

export type GlossEntityKind = (typeof GLOSS_ENTITY_KINDS)[number]

export interface GlossAnchor {
  entityKind: GlossEntityKind
  entityId: string
  /** Sub-node: image, caption, body, card, draft point id, etc. */
  nodeId?: GlossNodeId
  /** Parent chat message when gloss originates in Dialog stream */
  messageId?: string
  /** actionResults index on the parent message (receipt cards) */
  receiptIndex?: number
  /** Phrase-level gloss (Phase 2) */
  selectionText?: string
}

/** Snapshot content passed to Kip for in-stream gloss (image url, caption, etc.) */
export interface GlossContentSnapshot {
  label?: string
  text?: string
  imageUrl?: string
}

export interface DraftDiscussContext {
  draftId: string
  pointId: string
}

export function isGlossEntityKind(value: unknown): value is GlossEntityKind {
  return typeof value === 'string' && (GLOSS_ENTITY_KINDS as readonly string[]).includes(value)
}

export function isGlossAnchor(value: unknown): value is GlossAnchor {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    isGlossEntityKind(record.entityKind)
    && typeof record.entityId === 'string'
    && record.entityId.length > 0
    && (record.nodeId === undefined || typeof record.nodeId === 'string')
    && (record.messageId === undefined || typeof record.messageId === 'string')
    && (record.receiptIndex === undefined || typeof record.receiptIndex === 'number')
    && (record.selectionText === undefined || typeof record.selectionText === 'string')
  )
}

export function buildMessageGlossAnchor(
  messageId: string,
  nodeId: GlossNodeId,
  options?: { receiptIndex?: number; entityKind?: GlossEntityKind; entityId?: string },
): GlossAnchor {
  return {
    entityKind: options?.entityKind ?? 'message',
    entityId: options?.entityId ?? messageId,
    nodeId,
    messageId,
    ...(options?.receiptIndex != null ? { receiptIndex: options.receiptIndex } : {}),
  }
}

export function buildGlossAnchorDataAttribute(anchor: GlossAnchor): string {
  return JSON.stringify(anchor)
}

export function parseGlossAnchorDataAttribute(
  value: string | null | undefined,
): GlossAnchor | null {
  if (!value?.trim()) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return isGlossAnchor(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function glossAnchorToDraftDiscuss(anchor: GlossAnchor): DraftDiscussContext | null {
  if (anchor.entityKind !== 'draft' || !anchor.nodeId) return null
  return { draftId: anchor.entityId, pointId: anchor.nodeId }
}
