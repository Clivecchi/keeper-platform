/**
 * Realm Feed — graph-compatible person-scoped event shape.
 * Designed for promotion to User-Realm Graph without rewrite.
 */

export type RealmFeedEventType =
  | "session_updated"
  | "draft_waiting"
  | "moment_kept"
  | "domain_activity"

export interface RealmFeedEvent {
  id: string
  type: RealmFeedEventType
  occurredAt: string
  domainId: string
  domainSlug: string
  domainName: string
  summary: string
  deepLink?: string
  /** Underlying record id (session, draft, or moment). */
  entityId?: string
  dialogId?: string
}

export interface RealmFeedCounts {
  drafts: number
  sessions: number
  moments: number
  domains: number
}

export interface RealmFeedResponse {
  events: RealmFeedEvent[]
  /** Bounded opening remarks for arrival Dialog — a few sentences, in-character template. */
  remarks: string
  counts: RealmFeedCounts
}
