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
import { SoleMemoryPresence } from "./SoleMemoryPresence"
import { ChronicleEntityView, isRegistryEntityKind } from "./ChronicleEntityView"
import type { DensityLevel } from "./KeeperPresenceDefaults"
import type { PresenceLayout } from "./types"
import type { PresentName, RenderContext } from "../presents/types"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"

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
  treatment?: ResolvedDomainTreatment
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onPathSelect?: (id: string) => void
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
  treatment,
  onLabelResolved,
  onJourneySelect,
  onPathSelect,
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

  if (objectType === "soleMemory") {
    const soleBody = (
      <SoleMemoryPresence
        memoryCardId={objectId}
        domainId={domainId}
        onLabelResolved={onLabelResolved}
      />
    )
    return treatment ? (
      <ChronicleTreatmentShell treatment={treatment}>{soleBody}</ChronicleTreatmentShell>
    ) : (
      soleBody
    )
  }

  if (isRegistryEntityKind(objectType)) {
    const registryBody = (
      <ChronicleEntityView
        entityKind={objectType}
        entityId={objectId}
        domainId={domainId}
        layout={layout}
        onLabelResolved={onLabelResolved}
      />
    )
    return treatment ? (
      <ChronicleTreatmentShell treatment={treatment}>{registryBody}</ChronicleTreatmentShell>
    ) : (
      registryBody
    )
  }

  const presenceBody = (
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
      onPathSelect={onPathSelect}
      onMomentSelect={onMomentSelect}
      onKeeperSelect={onKeeperSelect}
      onKeySelect={onKeySelect}
      onSessionSelect={onSessionSelect}
    />
  )

  if (!treatment) return presenceBody

  return (
    <ChronicleTreatmentShell treatment={treatment}>{presenceBody}</ChronicleTreatmentShell>
  )
}
