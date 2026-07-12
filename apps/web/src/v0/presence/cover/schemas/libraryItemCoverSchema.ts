/**
 * Layer 2 — Library EntityKind cover schema.
 */
import {
  deriveLibraryItemName,
  isLibraryImageUpload,
  libraryItemChronicleTitle,
  resolveLibraryHeroAvatar,
} from "../../integrationChronicle/libraryNavUtils"
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type LibraryItemRecord = {
  id: string
  source_type: string
  source_ref: string
  display_label: string | null
  description: string | null
  assigned_keeper_name?: string | null
  assigned_agent_name?: string | null
}

function sourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case "upload":
      return "Upload"
    case "url":
      return "Link"
    case "github":
      return "GitHub"
    case "gdrive":
      return "Google Drive"
    default:
      return sourceType
  }
}

function resolveActions(handlers: CoverActionHandlers): CoverActionDef[] {
  return [
    {
      id: "manage",
      label: "Manage",
      variant: "secondary",
      icon: "gear",
      onClick: handlers.onConfigure ?? (() => {}),
    },
  ]
}

export const libraryItemCoverSchema: EntityCoverSchema<LibraryItemRecord> = {
  objectType: "library",
  resolve(record, _fieldValues, _ctx, handlers) {
    const isImage = isLibraryImageUpload(record)
    const sourceLabel = sourceTypeLabel(record.source_type)

    const traits = [
      { label: "Source", value: sourceLabel },
      ...(record.assigned_keeper_name
        ? [{ label: "Keeper", value: record.assigned_keeper_name }]
        : []),
      ...(record.assigned_agent_name
        ? [{ label: "Agent", value: record.assigned_agent_name }]
        : []),
    ]

    const assignmentLine = [
      record.assigned_keeper_name,
      record.assigned_agent_name,
    ]
      .filter(Boolean)
      .join(" · ")

    return {
      layout: isImage ? "visual-primary" : "standard",
      billingLine: isImage ? "Library presents" : undefined,
      hero: {
        avatar: resolveLibraryHeroAvatar(record),
        avatarGlow: "active",
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: isImage ? undefined : sourceLabel,
        statusLabel: isImage ? undefined : record.source_type.toUpperCase(),
        roleLabel: isImage ? undefined : "LIBRARY",
      },
      identity: {
        name: isImage
          ? deriveLibraryItemName(record)
          : libraryItemChronicleTitle(record),
        roleLine: isImage
          ? assignmentLine || sourceLabel.toUpperCase()
          : sourceLabel.toUpperCase(),
        voiceQuote: isImage ? undefined : (record.description ?? undefined),
      },
      traits,
      credits: [],
      actions: resolveActions(handlers),
    }
  },
}

export function resolveLibraryItemCoverContent(
  record: LibraryItemRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return libraryItemCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
