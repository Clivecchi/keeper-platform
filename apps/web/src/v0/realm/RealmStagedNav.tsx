"use client"

import * as React from "react"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import {
  REALM_STAGE_EMPTY_COPY,
  REALM_STAGE_LABELS,
  type RealmNavStage,
} from "./realmNavGrowth"
import { useRealmNavGrowth } from "./useRealmNavGrowth"

export interface RealmStagedNavProps {
  domainId: string | null
  domainSlug: string
  treatment: ResolvedDomainTreatment
  selectedDraftId?: string | null
  selectedLibraryItemId?: string | null
  selectedMomentId?: string | null
  onDraftSelect?: (id: string) => void
  onLibraryItemSelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onDraftCreate?: () => void
  stages?: RealmNavStage[]
}

const DEFAULT_STAGES: RealmNavStage[] = ["drafts", "kept", "presented"]

function entryToSidebarItem(
  entry: { id: string; kind: string; label: string; description?: string },
  selectedId: string | null | undefined,
): SidebarCardItem {
  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    isSelected: selectedId === entry.id,
  }
}

export function RealmStagedNav({
  domainId,
  domainSlug,
  treatment,
  selectedDraftId,
  selectedLibraryItemId,
  selectedMomentId,
  onDraftSelect,
  onLibraryItemSelect,
  onMomentSelect,
  onDraftCreate,
  stages = DEFAULT_STAGES,
}: RealmStagedNavProps) {
  const { loading, error, byStage } = useRealmNavGrowth(domainId, domainSlug, true)

  const handleItemClick = React.useCallback(
    (kind: string, id: string) => {
      if (kind === "draft") onDraftSelect?.(id)
      else if (kind === "library") onLibraryItemSelect?.(id)
      else if (kind === "moment") onMomentSelect?.(id)
    },
    [onDraftSelect, onLibraryItemSelect, onMomentSelect],
  )

  const body = (
    <div className="flex flex-col gap-4 px-1 py-2 min-h-0">
      {stages.map((stage) => {
        const entries = byStage[stage]
        const items: SidebarCardItem[] = entries.map((entry) => {
          const selectedId =
            entry.kind === "draft"
              ? selectedDraftId
              : entry.kind === "library"
                ? selectedLibraryItemId
                : entry.kind === "moment"
                  ? selectedMomentId
                  : null
          return {
            ...entryToSidebarItem(entry, selectedId),
            onClick: () => handleItemClick(entry.kind, entry.id),
          }
        })

        return (
          <SidebarCard
            key={stage}
            className="keeper-sidebar-card"
            title={REALM_STAGE_LABELS[stage]}
            description={
              loading
                ? "Loading…"
                : entries.length === 0
                  ? REALM_STAGE_EMPTY_COPY[stage]
                  : `${entries.length} item${entries.length === 1 ? "" : "s"}`
            }
            items={items.length > 0 ? items : undefined}
            onAdd={stage === "drafts" ? onDraftCreate : undefined}
          />
        )
      })}
      {error ? (
        <p className="text-xs px-1" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </p>
      ) : null}
    </div>
  )

  return (
    <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
  )
}
