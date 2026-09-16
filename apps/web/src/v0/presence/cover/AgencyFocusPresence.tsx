"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { apiFetch } from "../../../lib/api"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DomainPeopleSection } from "./DomainPeopleSection"
import { AgencyCoverTerrain } from "./AgencyCoverTerrain"
import { AgencyInspectPresence } from "./AgencyInspectPresence"
import { AgencyRoomShell } from "./AgencyRoomShell"
import { resolveAgencyCoverContent } from "./schemas/agencyCoverSchema"
import { parseAgencyPlacePayload, type AgencyPlaceFacts } from "./agencyPlace"
export interface AgencyFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  fieldValues: Record<string, string>
}

/**
 * Agency Place — idle Chronicle on Agency Board.
 * Same Domain record. Not Domain Cover. Not Kip.
 */
export function AgencyFocusPresence({
  objectId,
  domainId,
  record,
  fieldValues,
}: AgencyFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const room = boardCtx?.selection.agencyRoom ?? null
  const [facts, setFacts] = React.useState<AgencyPlaceFacts | null>(null)
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    let cancelled = false
    setLoadState("loading")
    apiFetch(`/api/domains/${encodeURIComponent(domainId)}/agency-place`)
      .then((res: unknown) => {
        if (cancelled) return
        const parsed = parseAgencyPlacePayload(res)
        setFacts(parsed)
        setLoadState(parsed ? "ready" : "error")
      })
      .catch(() => {
        if (cancelled) return
        setFacts(null)
        setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const coverContent = React.useMemo(
    () =>
      resolveAgencyCoverContent(record, fieldValues, facts, {
        onPeople: () => boardCtx?.actions.openAgencyPeople(),
        onAgents: () => boardCtx?.actions.closeAgencyRoom(),
      }),
    [record, fieldValues, facts, boardCtx],
  )

  const roomKey = room?.kind ?? "cover"

  return (
    <div className="keeper-chronicle-stack">
      <AnimatePresence mode="wait" initial={false}>
        {room?.kind === "people" ? (
          <motion.div
            key="people"
            className="keeper-chronicle-stack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AgencyRoomShell
              title="People"
              status="Domain membership"
              onBack={() => boardCtx?.actions.closeAgencyRoom()}
            >
              <DomainPeopleSection
                domainId={domainId}
                embedded
                highlightUserId={room.userId}
                inviteRequestId={boardCtx?.selection.peopleInviteRequestId ?? 0}
              />
            </AgencyRoomShell>
          </motion.div>
        ) : room?.kind === "inspect" && facts ? (
          <AgencyInspectPresence
            key="inspect"
            facts={facts}
            onBack={() => boardCtx?.actions.closeAgencyRoom()}
          />
        ) : (
          <motion.div
            key={roomKey === "inspect" ? "cover-missing-facts" : "cover"}
            className="keeper-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />
            {loadState === "loading" ? (
              <p
                className="mt-8 px-1 text-[13px]"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                Reading this Agency…
              </p>
            ) : null}
            {loadState === "error" ? (
              <p
                className="mt-8 px-1 text-[13px]"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                Agency facts could not be loaded. Place still stands. Terrain stays empty.
              </p>
            ) : (
              <AgencyCoverTerrain
                facts={facts}
                onDialogSelect={(id: string) => boardCtx?.actions.onDialogSelect(id)}
                onInspect={() => boardCtx?.actions.openAgencyInspect()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
