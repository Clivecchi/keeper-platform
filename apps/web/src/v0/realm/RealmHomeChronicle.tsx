"use client"

import * as React from "react"
import { RealmPlaybillRail } from "./RealmPlaybillRail"
import { RealmFeedPanel } from "./RealmFeedPanel"
import { useRealmFeed } from "./useRealmFeed"
import { useV0ShellOptional } from "../shell/V0ShellContext"

export type RealmChronicleView = "playbill" | "feed"

export interface RealmHomeChronicleProps {
  view?: RealmChronicleView
}

/** Chronicle idle on `/home` — Playbill rail or full Realm feed. */
export function RealmHomeChronicle({ view = "playbill" }: RealmHomeChronicleProps) {
  const shell = useV0ShellOptional()
  const { feed, isLoading } = useRealmFeed(view === "feed" || view === "playbill")

  if (view === "feed") {
    return <RealmFeedPanel events={feed?.events ?? []} isLoading={isLoading} />
  }

  return <RealmPlaybillRail anchorSlug={shell?.anchorDomainSlug ?? shell?.domainSlug ?? null} />
}
