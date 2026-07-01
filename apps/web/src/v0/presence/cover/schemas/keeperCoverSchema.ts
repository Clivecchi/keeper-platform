/**
 * Layer 2 — Keeper EntityKind cover schema.
 */
import { keeperChronicleTitle } from "../../integrationChronicle/keeperNavUtils"
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"
import { resolveCoverAvatarDisplay } from "../coverImageUtils"

export type KeeperRecord = {
  id: string
  title?: string
  display_label: string | null
  description: string | null
  keeperType: string | null
  memoryPattern: string | null
  avatar?: string | null
  stats?: {
    journeyCount?: number
    pathCount?: number
    soleMemoryCount?: number
    engagementTemplateCount?: number
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

export const keeperCoverSchema: EntityCoverSchema<KeeperRecord> = {
  objectType: "keeper",
  resolve(record, _fieldValues, _ctx, handlers) {
    const title = keeperChronicleTitle({
      display_label: record.display_label,
      title: record.title ?? record.display_label ?? "",
    })
    const avatarFallback = title.charAt(0).toUpperCase() || "K"

    const traits = [
      ...(record.keeperType
        ? [{ label: "Type", value: record.keeperType }]
        : []),
      ...(record.memoryPattern
        ? [{ label: "Memory", value: record.memoryPattern }]
        : []),
      {
        label: "Journeys",
        value: String(record.stats?.journeyCount ?? 0),
      },
      {
        label: "SOLE cards",
        value: String(record.stats?.soleMemoryCount ?? 0),
      },
    ]

    const credits: string[] = []
    if ((record.stats?.engagementTemplateCount ?? 0) > 0) {
      credits.push(
        `${record.stats!.engagementTemplateCount} template${record.stats!.engagementTemplateCount === 1 ? "" : "s"}`,
      )
    }
    if ((record.stats?.pathCount ?? 0) > 0) {
      credits.push(
        `${record.stats!.pathCount} path${record.stats!.pathCount === 1 ? "" : "s"}`,
      )
    }

    return {
      hero: {
        avatar: resolveCoverAvatarDisplay(record.avatar, avatarFallback),
        avatarGlow: "active",
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: "KE3P · KEEPER",
        statusLabel: (record.keeperType ?? "KEEPER").toUpperCase(),
        roleLabel: (record.memoryPattern ?? "SOLE").toUpperCase(),
      },
      identity: {
        name: title,
        roleLine: record.keeperType ?? "Keeper",
        voiceQuote: record.description?.trim() || undefined,
      },
      traits,
      credits,
      actions: resolveActions(handlers),
    }
  },
}

export function resolveKeeperCoverContent(
  record: KeeperRecord,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return keeperCoverSchema.resolve(record, {}, ctx, handlers)
}
