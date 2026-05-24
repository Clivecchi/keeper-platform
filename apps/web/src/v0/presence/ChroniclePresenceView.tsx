"use client"

/**
 * ChroniclePresenceView
 * =====================
 * Thin Chronicle wrapper around KeeperPresence.
 *
 * Gate 3 standard: every record type calls KeeperPresence with context 'chronicle'
 * and the active Treatment (density). This view does not assemble its own field list.
 */

import * as React from "react"
import { KeeperPresence } from "./KeeperPresence"
import type { DensityLevel } from "./KeeperPresenceDefaults"

export interface ChroniclePresenceViewProps {
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  density?: DensityLevel
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}

export function ChroniclePresenceView({
  objectType,
  objectId,
  domainId,
  domainSlug,
  density = "standard",
  onLabelResolved,
  onJourneySelect,
  onMomentSelect,
}: ChroniclePresenceViewProps) {
  if (!domainId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Waiting for domain context…
        </p>
      </div>
    )
  }

  return (
    <KeeperPresence
      objectType={objectType}
      objectId={objectId}
      domainId={domainId}
      domainSlug={domainSlug}
      context="chronicle"
      density={density}
      onLabelResolved={onLabelResolved}
      onJourneySelect={onJourneySelect}
      onMomentSelect={onMomentSelect}
    />
  )
}
