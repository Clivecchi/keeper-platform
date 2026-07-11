import type { RealmFeedCounts } from "@keeper/shared"

export type RealmInvitationId = "thread" | "feed" | "drafts" | "sessions"

export interface RealmInvitation {
  id: RealmInvitationId
  label: string
  visible: boolean
}

export const MAX_REALM_INVITATIONS = 4

export function buildRealmInvitations(counts: RealmFeedCounts): RealmInvitation[] {
  const candidates: RealmInvitation[] = [
    {
      id: "thread",
      label: "Pick up the thread",
      visible: counts.sessions > 0,
    },
    {
      id: "feed",
      label: "Realm feed",
      visible: counts.domains > 0,
    },
    {
      id: "drafts",
      label: counts.drafts === 1 ? "Draft waiting" : "Drafts waiting",
      visible: counts.drafts > 0,
    },
    {
      id: "sessions",
      label: "Sessions",
      visible: counts.sessions > 1,
    },
  ]

  const visible = candidates.filter((c) => c.visible)
  if (visible.length === 0) {
    return [{ id: "feed", label: "Realm feed", visible: true }]
  }
  return visible.slice(0, MAX_REALM_INVITATIONS)
}
