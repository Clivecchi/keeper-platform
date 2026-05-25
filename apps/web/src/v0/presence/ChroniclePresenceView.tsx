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
import type { DensityLevel } from "./KeeperPresenceDefaults"
import type { PresenceLayout } from "./types"

export interface ChroniclePresenceViewProps {
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  domainDisplayName?: string
  layout?: PresenceLayout
  density?: DensityLevel
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
}

export function ChroniclePresenceView({
  objectType,
  objectId,
  domainId,
  domainSlug,
  domainDisplayName,
  layout = "focus",
  density = "standard",
  onLabelResolved,
  onJourneySelect,
  onMomentSelect,
  onKeeperSelect,
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

  return (
    <KeeperPresence
      objectType={objectType}
      objectId={objectId}
      domainId={domainId}
      domainSlug={domainSlug}
      domainDisplayName={domainDisplayName}
      layout={layout}
      density={density}
      onLabelResolved={onLabelResolved}
      onJourneySelect={onJourneySelect}
      onMomentSelect={onMomentSelect}
      onKeeperSelect={onKeeperSelect}
    />
  )
}
