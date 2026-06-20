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
] as const

export type GlossEntityKind = (typeof GLOSS_ENTITY_KINDS)[number]

export interface GlossAnchor {
  entityKind: GlossEntityKind
  entityId: string
  nodeId?: string
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
  )
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
