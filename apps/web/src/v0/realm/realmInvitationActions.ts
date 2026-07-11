import type { RealmFeedEvent, RealmFeedResponse } from "@keeper/shared"
import type { RealmInvitationId } from "./RealmInvitationBar"

export interface RealmInvitationActions {
  onSessionSelect: (id: string | null) => void
  onDialogSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  bumpDialogNav: () => void
  bumpDraftNav: () => void
  focusChronicleFeed?: () => void
}

function firstEventOfType(
  events: RealmFeedEvent[],
  type: RealmFeedEvent["type"],
): RealmFeedEvent | undefined {
  return events.find((event) => event.type === type)
}

/** Apply invitation door selection using live feed targets. */
export function applyRealmInvitation(
  id: RealmInvitationId,
  feed: RealmFeedResponse | null,
  actions: RealmInvitationActions,
): void {
  const events = feed?.events ?? []

  if (id === "feed") {
    actions.focusChronicleFeed?.()
    return
  }

  if (id === "drafts") {
    const draft = firstEventOfType(events, "draft_waiting")
    actions.bumpDraftNav()
    if (draft?.entityId) {
      actions.onDraftSelect(draft.entityId)
    }
    actions.focusChronicleFeed?.()
    return
  }

  if (id === "sessions") {
    actions.bumpDialogNav()
    const session = firstEventOfType(events, "session_updated")
    if (session?.dialogId) {
      actions.onDialogSelect(session.dialogId)
    } else if (session?.entityId) {
      actions.onSessionSelect(session.entityId)
    }
    actions.focusChronicleFeed?.()
    return
  }

  if (id === "thread") {
    const session = firstEventOfType(events, "session_updated")
    if (session?.dialogId) {
      actions.onDialogSelect(session.dialogId)
    }
    if (session?.entityId) {
      actions.onSessionSelect(session.entityId)
    }
  }
}

export interface RealmFeedEventActionHandlers {
  onSessionSelect: (id: string | null) => void
  onDialogSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onMomentSelect: (id: string) => void
  navigateToDomain: (slug: string, path?: string) => void
  anchorDomainSlug?: string | null
}

/** Chronicle feed row click — in-realm selection or cross-domain travel. */
export function applyRealmFeedEvent(
  event: RealmFeedEvent,
  handlers: RealmFeedEventActionHandlers,
): void {
  const sameRealm =
    handlers.anchorDomainSlug?.trim().toLowerCase() ===
    event.domainSlug.trim().toLowerCase()

  if (!sameRealm) {
    handlers.navigateToDomain(event.domainSlug, event.deepLink)
    return
  }

  if (event.type === "session_updated" && event.entityId) {
    if (event.dialogId) handlers.onDialogSelect(event.dialogId)
    handlers.onSessionSelect(event.entityId)
    return
  }

  if (event.type === "draft_waiting" && event.entityId) {
    handlers.onDraftSelect(event.entityId)
    return
  }

  if (event.type === "moment_kept" && event.entityId) {
    handlers.onMomentSelect(event.entityId)
    return
  }

  handlers.navigateToDomain(event.domainSlug, event.deepLink)
}
