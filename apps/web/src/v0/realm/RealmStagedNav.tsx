"use client"

import * as React from "react"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import {
  REALM_NAV_UNASSIGNED_LABEL,
  REALM_STAGE_EMPTY_COPY,
  REALM_STAGE_LABELS,
  type RealmNavStage,
} from "./realmNavGrowth"
import { useRealmNavGrowth } from "./useRealmNavGrowth"

export interface RealmStagedNavProps {
  domainId: string | null
  domainSlug: string
  treatment: ResolvedDomainTreatment
  selectedDialogId?: string | null
  selectedDraftId?: string | null
  selectedLibraryItemId?: string | null
  selectedMomentId?: string | null
  onDialogSelect?: (id: string) => void
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

function groupEntryCount(byStage: Record<RealmNavStage, unknown[]>): number {
  return byStage.drafts.length + byStage.kept.length + byStage.presented.length
}

export function RealmStagedNav({
  domainId,
  domainSlug,
  treatment,
  selectedDialogId,
  selectedDraftId,
  selectedLibraryItemId,
  selectedMomentId,
  onDialogSelect,
  onDraftSelect,
  onLibraryItemSelect,
  onMomentSelect,
  onDraftCreate,
  stages = DEFAULT_STAGES,
}: RealmStagedNavProps) {
  const { loading, error, byDialog } = useRealmNavGrowth(domainId, domainSlug, true)

  const handleItemClick = React.useCallback(
    (kind: string, id: string) => {
      if (kind === "draft") onDraftSelect?.(id)
      else if (kind === "library") onLibraryItemSelect?.(id)
      else if (kind === "moment") onMomentSelect?.(id)
    },
    [onDraftSelect, onLibraryItemSelect, onMomentSelect],
  )

  const handleDialogHeaderClick = React.useCallback(
    (dialogId: string | null) => {
      if (!dialogId || !onDialogSelect) return
      onDialogSelect(dialogId)
    },
    [onDialogSelect],
  )

  const draftCreateDialogKey = React.useMemo(() => {
    const unassigned = byDialog.find((g) => g.dialogId === null)
    if (unassigned) return REALM_NAV_UNASSIGNED_LABEL
    return byDialog[0]?.title ?? null
  }, [byDialog])

  /** Real Dialogs as a Nav group -- "Dialog" is the group, each Dialog is an item, same
   * SidebarCard pattern every other Universal Board uses for its Dialogs section. */
  const dialogListItems: SidebarCardItem[] = React.useMemo(
    () =>
      byDialog
        .filter((group) => group.dialogId !== null)
        .map((group) => ({
          id: group.dialogId as string,
          label: group.title,
          isSelected: group.dialogId === selectedDialogId,
          onClick: onDialogSelect ? () => onDialogSelect(group.dialogId as string) : undefined,
        })),
    [byDialog, selectedDialogId, onDialogSelect],
  )

  const body = (
    <div className="flex flex-col gap-5 px-1 py-2 min-h-0">
      {loading && byDialog.length === 0 ? (
        <p className="text-xs px-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading…
        </p>
      ) : null}

      {dialogListItems.length > 0 ? (
        <SidebarCard
          className="keeper-sidebar-card"
          title="Dialogs"
          description={`${dialogListItems.length} item${dialogListItems.length === 1 ? "" : "s"}`}
          items={dialogListItems}
          collapsible
          defaultCollapsed={false}
        />
      ) : null}

      {byDialog.map((group) => {
        const total = groupEntryCount(group.byStage)
        // The "Dialogs" group above already lists every Dialog by name. A per-dialog
        // stage breakdown with nothing in any stage is pure duplication of that same
        // name, not new information -- skip it instead of rendering a "0 items" echo.
        if (total === 0) return null
        const isUnassigned = group.dialogId === null
        const isDialogSelected =
          !isUnassigned && !!group.dialogId && group.dialogId === selectedDialogId
        const showDraftAdd =
          Boolean(onDraftCreate) && group.title === draftCreateDialogKey
        const headerInteractive = !isUnassigned && Boolean(onDialogSelect && group.dialogId)

        return (
          <section
            key={group.dialogId ?? REALM_NAV_UNASSIGNED_LABEL}
            className="flex flex-col gap-3"
            aria-label={group.title}
          >
            <div className="px-1 pt-1">
              {headerInteractive ? (
                <button
                  type="button"
                  onClick={() => handleDialogHeaderClick(group.dialogId)}
                  aria-pressed={isDialogSelected}
                  className="w-full text-left rounded-md px-1 py-0.5 -mx-1 transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: isDialogSelected
                      ? "hsl(var(--theme-surface-elevated) / 0.55)"
                      : "transparent",
                  }}
                >
                  <h3
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {group.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {loading
                      ? "Loading…"
                      : `${total} item${total === 1 ? "" : "s"}`}
                  </p>
                </button>
              ) : (
                <>
                  <h3
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {group.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {loading
                      ? "Loading…"
                      : `${total} item${total === 1 ? "" : "s"}${
                          isUnassigned ? " · no Dialog link" : ""
                        }`}
                  </p>
                </>
              )}
            </div>

            {stages.map((stage) => {
              const entries = group.byStage[stage]
              if (entries.length === 0) return null

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
                  key={`${group.dialogId ?? "unassigned"}-${stage}`}
                  className="keeper-sidebar-card"
                  title={REALM_STAGE_LABELS[stage]}
                  description={`${entries.length} item${entries.length === 1 ? "" : "s"}`}
                  items={items}
                  onAdd={stage === "drafts" && showDraftAdd ? onDraftCreate : undefined}
                  collapsible
                  defaultCollapsed={false}
                />
              )
            })}
          </section>
        )
      })}

      {!loading && byDialog.length === 0 ? (
        <div className="flex flex-col gap-3">
          {stages.map((stage) => (
            <SidebarCard
              key={stage}
              className="keeper-sidebar-card"
              title={REALM_STAGE_LABELS[stage]}
              description={REALM_STAGE_EMPTY_COPY[stage]}
              onAdd={stage === "drafts" ? onDraftCreate : undefined}
            />
          ))}
        </div>
      ) : null}

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
