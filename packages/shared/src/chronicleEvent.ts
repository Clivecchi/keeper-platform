/**
 * Chronicle Event — Dialog-scoped History feed contract.
 * Distinct from RealmFeedEvent (person-scoped cross-domain arrival feed).
 */

export const CHRONICLE_EVENT_TYPES = ['session', 'moment', 'structural'] as const
export type ChronicleEventType = (typeof CHRONICLE_EVENT_TYPES)[number]

export function isChronicleEventType(value: unknown): value is ChronicleEventType {
  return typeof value === 'string'
    && (CHRONICLE_EVENT_TYPES as readonly string[]).includes(value)
}

/** Durable deep-link target for Document mode (or session/moment entity). */
export interface ChronicleEventAnchor {
  /** Dialog Document identity */
  dialogId?: string
  /** Manuscript draft id when the event touches Document Points */
  manuscriptDraftId?: string
  /** DraftPoint.id — scroll target in Document mode */
  pointId?: string
  /** Session / Moment / Path / Journey id when not a Point edit */
  entityId?: string
  entityKind?: 'session' | 'moment' | 'path' | 'journey' | 'point' | 'dialog'
  /** Breadcrumb segments for Document deep-link chrome */
  breadcrumb?: string[]
}

export interface ChronicleEvent {
  id: string
  dialogId: string
  domainId: string
  actor: string
  actorSlug?: string
  eventType: ChronicleEventType
  /** Agent-authored — required once written; may be placeholder until close-out. */
  title: string
  /** One-line takeaway, past tense, notification register. */
  summary: string
  timestamp: string
  anchor?: ChronicleEventAnchor
  parentEventId?: string | null
  children?: ChronicleEvent[]
}

export interface ChronicleEventListResponse {
  events: ChronicleEvent[]
  dialogId: string
}

export type ChroniclePanelMode = 'document' | 'history'

/** In-stream chip / keeper-card deep-link payload. */
export interface ChronicleDocumentChip {
  type: 'chronicle_update'
  title: string
  body?: string
  meta?: string
  dialogId: string
  dialogTitle: string
  actor: string
  anchor: ChronicleEventAnchor
}
