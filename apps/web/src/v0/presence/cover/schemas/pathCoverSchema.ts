/**
 * Layer 2 — Path EntityKind cover schema.
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

export type PathCoverRecord = {
  id: string
  name?: string
  prelude?: string
  journeyName?: string
  keeperTitle?: string
  momentCount?: number
  coverImage?: string | null
}

function truncatePrelude(text: string, max = 72): string {
  const trimmed = text.trim()
  if (!trimmed) return "A path waiting to be shaped"
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function statusGlow(momentCount: number): CoverAvatarGlow {
  return momentCount > 0 ? "active" : "inactive"
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

export const pathCoverSchema: EntityCoverSchema<PathCoverRecord> = {
  objectType: "path",

  resolve(record, fieldValues, ctx, handlers): ResolvedCoverContent {
    const name =
      fieldValues.name?.trim() ||
      record.name?.trim() ||
      "Untitled path"
    const prelude =
      fieldValues.prelude?.trim() ||
      (typeof record.prelude === "string" ? record.prelude.trim() : "") ||
      ""
    const momentCount = record.momentCount ?? 0
    const glow = statusGlow(momentCount)

    const traits = [
      ...(record.journeyName
        ? [{ label: "Journey", value: record.journeyName }]
        : []),
      {
        label: "Moments",
        value: String(momentCount),
        pulse: momentCount > 0,
      },
      ...(record.keeperTitle
        ? [{ label: "Keeper", value: record.keeperTitle }]
        : []),
    ]

    const credits: string[] = []
    if (record.journeyName) credits.push(record.journeyName)
    if (momentCount > 0) {
      credits.push(`${momentCount} moment${momentCount === 1 ? "" : "s"}`)
    }

    const slug = ctx.objectId.replace(/-/g, "").slice(0, 8).toUpperCase()

    return {
      hero: {
        avatar: resolveCoverAvatarDisplay(record.coverImage, "🛤"),
        avatarGlow: glow,
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · PATH · ${slug}`,
        statusLabel: momentCount > 0 ? "ALIVE" : undefined,
        roleLabel: "PATH",
      },
      identity: {
        name,
        roleLine: truncatePrelude(prelude),
        voiceQuote: prelude.length > 0 && prelude.length <= 240 ? prelude : undefined,
        voicePlaceholder: "What does this path gather?",
      },
      traits,
      credits,
      actions: resolveActions(handlers),
    }
  },
}

export function resolvePathCoverContent(
  record: PathCoverRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return pathCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
