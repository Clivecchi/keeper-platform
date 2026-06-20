/**
 * Layer 2 — Dialog EntityKind cover schema.
 */
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverAvatarGlow,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type DialogCoverRecord = {
  id: string
  title?: string
  contextSummary?: string
  sessionCount?: number
  audienceLabel?: string
  updatedLabel?: string
}

function truncateScope(text: string, max = 72): string {
  const trimmed = text.trim()
  if (!trimmed) return "Open conversation container"
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function statusGlow(sessionCount: number): CoverAvatarGlow {
  return sessionCount > 0 ? "active" : "inactive"
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

export const dialogCoverSchema: EntityCoverSchema<DialogCoverRecord> = {
  objectType: "dialog",

  resolve(record, fieldValues, ctx, handlers): ResolvedCoverContent {
    const title =
      fieldValues.title?.trim() ||
      record.title?.trim() ||
      "Untitled dialog"
    const contextSummary = record.contextSummary?.trim() ?? ""
    const sessionCount = record.sessionCount ?? 0
    const glow = statusGlow(sessionCount)

    const traits = [
      {
        label: "Sessions",
        value: String(sessionCount),
        pulse: sessionCount > 0,
      },
      ...(record.audienceLabel
        ? [{ label: "Scope", value: record.audienceLabel }]
        : []),
      ...(record.updatedLabel
        ? [{ label: "Updated", value: record.updatedLabel }]
        : []),
    ]

    const credits: string[] = []
    if (contextSummary) credits.push(contextSummary)
    if (sessionCount > 0) {
      credits.push(`${sessionCount} session${sessionCount === 1 ? "" : "s"}`)
    }

    const slug = ctx.objectId.replace(/-/g, "").slice(0, 8).toUpperCase()

    return {
      hero: {
        avatar: "💬",
        avatarGlow: glow,
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · DIALOG · ${slug}`,
        statusLabel: sessionCount > 0 ? "LIVE" : undefined,
        roleLabel: "DIALOG",
      },
      identity: {
        name: title,
        roleLine: truncateScope(contextSummary),
        voiceQuote:
          contextSummary.length > 0 && contextSummary.length <= 240
            ? contextSummary
            : undefined,
        voicePlaceholder: "Where this dialog lives",
      },
      traits,
      credits,
      actions: resolveActions(handlers),
    }
  },
}

export function resolveDialogCoverContent(
  record: DialogCoverRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return dialogCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
