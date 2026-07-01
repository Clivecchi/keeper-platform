/**
 * Layer 2 — Moment EntityKind cover schema.
 */
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverAvatarGlow,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"
import { resolveCoverAvatarDisplay } from "../coverImageUtils"

export type MomentCoverRecord = {
  id: string
  title?: string
  narrative?: string
  journeyName?: string
  pathName?: string
  keptAt?: string | null
  updatedAt?: string
  createdAt?: string
  keptLabel?: string
  coverImage?: string | null
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function truncateNarrative(text: string, max = 72): string {
  const trimmed = text.trim()
  if (!trimmed) return "A moment waiting to be told"
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function statusGlow(keptAt: string | null | undefined): CoverAvatarGlow {
  if (!keptAt) return "inactive"
  const keptMs = Date.parse(keptAt)
  if (Number.isNaN(keptMs)) return "inactive"
  const daysSince = (Date.now() - keptMs) / (1000 * 60 * 60 * 24)
  return daysSince <= 7 ? "active" : "inactive"
}

function resolveActions(handlers: CoverActionHandlers): CoverActionDef[] {
  return [
    {
      id: "configure",
      label: "Edit",
      variant: "primary",
      icon: "gear",
      onClick: handlers.onConfigure,
    },
  ]
}

export const momentCoverSchema: EntityCoverSchema<MomentCoverRecord> = {
  objectType: "moment",

  resolve(record, fieldValues, ctx, handlers): ResolvedCoverContent {
    const title =
      fieldValues.title?.trim() ||
      record.title?.trim() ||
      "Untitled moment"
    const narrative =
      fieldValues.narrative?.trim() ||
      (typeof record.narrative === "string" ? record.narrative.trim() : "") ||
      ""
    const glow = statusGlow(record.keptAt)
    const isKept = Boolean(record.keptAt)

    const traits = [
      ...(record.journeyName
        ? [{ label: "Journey", value: record.journeyName }]
        : []),
      ...(record.pathName
        ? [{ label: "Path", value: record.pathName }]
        : []),
      {
        label: isKept ? "Kept" : "Updated",
        value: record.keptLabel ?? formatDate(record.updatedAt ?? record.createdAt),
        pulse: glow === "active",
      },
    ]

    const credits: string[] = []
    if (record.journeyName) {
      credits.push(record.journeyName)
    }
    if (record.pathName) {
      credits.push(record.pathName)
    }

    const slug = ctx.objectId.replace(/-/g, "").slice(0, 8).toUpperCase()

    return {
      hero: {
        avatar: resolveCoverAvatarDisplay(record.coverImage, "✦"),
        avatarGlow: glow,
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · MOMENT · ${slug}`,
        statusLabel: isKept ? "KEPT" : undefined,
        roleLabel: "MOMENT",
      },
      identity: {
        name: title,
        roleLine: truncateNarrative(narrative),
        voiceQuote: narrative.length > 0 && narrative.length <= 240 ? narrative : undefined,
        voicePlaceholder: "What happened here?",
      },
      traits,
      credits,
      actions: resolveActions(handlers),
    }
  },
}

export function resolveMomentCoverContent(
  record: MomentCoverRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return momentCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
