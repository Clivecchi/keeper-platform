"use client"

import * as React from "react"
import type { RealmFeedCounts, RealmFeedResponse } from "@keeper/shared"
import { RealmArrivalRemarks } from "./RealmArrivalRemarks"
import { RealmInvitationBar, type RealmInvitationId } from "./RealmInvitationBar"
import { applyRealmInvitation, type RealmInvitationActions } from "./realmInvitationActions"

export interface RealmArrivalSurfaceProps {
  feed: RealmFeedResponse | null
  agentSlug: string
  agentDisplayName: string
  isLoading?: boolean
  invitationActions: RealmInvitationActions
}

/** Shared arrival layer: remarks + invitation doors (desktop Dialog + mobile Kip). */
export function RealmArrivalSurface({
  feed,
  agentSlug,
  agentDisplayName,
  isLoading = false,
  invitationActions,
}: RealmArrivalSurfaceProps) {
  const counts: RealmFeedCounts =
    feed?.counts ?? { drafts: 0, sessions: 0, moments: 0, domains: 0 }

  const handleInvite = React.useCallback(
    (id: RealmInvitationId) => {
      applyRealmInvitation(id, feed, invitationActions)
    },
    [feed, invitationActions],
  )

  return (
    <>
      <RealmArrivalRemarks
        remarks={feed?.remarks ?? "Welcome back."}
        agentSlug={agentSlug}
        agentDisplayName={agentDisplayName}
        isLoading={isLoading}
      />
      <RealmInvitationBar counts={counts} onInvite={handleInvite} />
    </>
  )
}
