"use client"

/**
 * ChroniclePresenceView
 * =====================
 * Thin Chronicle wrapper around KeeperPresence.
 *
 * Gate 3 standard: every record type calls KeeperPresence in focus layout
 * with the active Treatment (density). This view does not assemble its own field list.
 */

import * as React from "react"
import { KeeperPresence } from "./KeeperPresence"
import { IntegrationPresence } from "./IntegrationPresence"
import { KeyPresence } from "./KeyPresence"
import { SoleMemoryPresence } from "./SoleMemoryPresence"
import type { DensityLevel } from "./KeeperPresenceDefaults"
import type { PresenceLayout } from "./types"
import type { PresentName, RenderContext } from "../presents/types"

export interface ChroniclePresenceViewProps {
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  domainDisplayName?: string
  boardId?: string
  present?: PresentName
  context?: RenderContext
  layout?: PresenceLayout
  density?: DensityLevel
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onKeySelect?: (id: string) => void
  onSessionSelect?: (id: string) => void
}

export function ChroniclePresenceView({
  objectType,
  objectId,
  domainId,
  domainSlug,
  domainDisplayName,
  boardId,
  present,
  context = "chronicle",
  layout = "focus",
  density = "standard",
  onLabelResolved,
  onJourneySelect,
  onMomentSelect,
  onKeeperSelect,
  onKeySelect,
  onSessionSelect,
}: ChroniclePresenceViewProps) {
  if (!domainId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Waiting for domain context…
        </p>
      </div>
    )
  }

  if (objectType === "key") {
    return (
      <KeyPresence
        keyId={objectId}
        domainId={domainId}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "soleMemory") {
    return (
      <SoleMemoryPresence
        memoryCardId={objectId}
        domainId={domainId}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "service") {
    return (
      <IntegrationPresence
        serviceSlug={objectId}
        domainId={domainId}
        boardId={boardId}
        agentSlug="cloud"
        onKeySelect={onKeySelect}
      />
    )
  }

  return (
    <KeeperPresence
      objectType={objectType}
      objectId={objectId}
      domainId={domainId}
      domainSlug={domainSlug}
      domainDisplayName={domainDisplayName}
      boardId={boardId}
      present={present}
      context={context}
      layout={layout}
      density={density}
      onLabelResolved={onLabelResolved}
      onJourneySelect={onJourneySelect}
      onMomentSelect={onMomentSelect}
      onKeeperSelect={onKeeperSelect}
      onSessionSelect={onSessionSelect}
    />
  )
}
