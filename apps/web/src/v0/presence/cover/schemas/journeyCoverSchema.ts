/**
 * Layer 2 — Journey EntityKind cover schema.
 */
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverAvatarGlow,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type JourneyCoverRecord = {
  id: string
  name?: string
  forward?: string | null
  createdAt?: string
  momentCount?: number
  pathCount?: number
  keeperTitle?: string
  isActive?: boolean
}

function formatCreatedDate(iso: string | undefined): string {
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

function statusGlow(isActive: boolean): CoverAvatarGlow {
  return isActive ? "active" : "inactive"
}

function resolveEngagementActions(
  handlers: CoverActionHandlers,
  isActive: boolean,
): CoverActionDef[] {
  const actions: CoverActionDef[] = []

  if (!isActive && handlers.onSetActive) {
    actions.push({
      id: "set-active",
      label: "Set as Active",
      variant: "primary",
      icon: "play",
      onClick: handlers.onSetActive,
    })
  }

  if (handlers.onEngagementAct) {
    actions.push({
      id: "add-moment",
      label: "Add Moment",
      variant: isActive ? "primary" : "secondary",
      icon: "play",
      onClick: () => handlers.onEngagementAct!("journey.addMoment"),
    })
    actions.push({
      id: "create-path",
      label: "New Path",
      variant: "secondary",
      onClick: () => handlers.onEngagementAct!("path.create"),
    })
    actions.push({
      id: "create-moment",
      label: "New Moment",
      variant: "secondary",
      onClick: () => handlers.onEngagementAct!("moment.create"),
    })
  }

  actions.push({
    id: "configure",
    label: "Configure",
    variant: "secondary",
    icon: "gear",
    onClick: handlers.onConfigure,
  })

  return actions
}

export const journeyCoverSchema: EntityCoverSchema<JourneyCoverRecord> = {
  objectType: "journey",

  resolve(record, fieldValues, ctx, handlers): ResolvedCoverContent {
    const name =
      fieldValues.name?.trim() ||
      record.name?.trim() ||
      "Untitled journey"
    const forward =
      fieldValues.forward?.trim() ||
      (typeof record.forward === "string" ? record.forward.trim() : "") ||
      ""
    const momentCount = record.momentCount ?? 0
    const pathCount = record.pathCount ?? 0
    const isActive = record.isActive ?? false
    const glow = statusGlow(isActive)

    const traits = [
      ...(record.keeperTitle
        ? [{ label: "Keeper", value: record.keeperTitle }]
        : []),
      {
        label: "Moments",
        value: String(momentCount),
        pulse: momentCount > 0,
      },
      ...(pathCount > 0
        ? [{ label: "Paths", value: String(pathCount) }]
        : []),
      {
        label: "Created",
        value: formatCreatedDate(record.createdAt),
      },
      {
        label: "Status",
        value: isActive ? "Active" : "Present",
        pulse: isActive,
      },
    ]

    const credits: string[] = []
    if (pathCount > 0) {
      credits.push(`${pathCount} path${pathCount === 1 ? "" : "s"}`)
    }
    if (momentCount > 0) {
      credits.push(`${momentCount} moment${momentCount === 1 ? "" : "s"}`)
    }

    const slug = ctx.objectId.replace(/-/g, "").slice(0, 8).toUpperCase()

    return {
      hero: {
        avatar: "🧭",
        avatarGlow: glow,
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · JOURNEY · ${slug}`,
        statusLabel: isActive ? "MOVING" : undefined,
        roleLabel: "JOURNEY",
      },
      identity: {
        name,
        roleLine: forward
          ? forward.length > 72
            ? `${forward.slice(0, 71)}…`
            : forward
          : "Where this journey is headed",
        voiceQuote: forward || undefined,
        voicePlaceholder: "What is this journey for?",
      },
      traits,
      credits,
      actions: resolveEngagementActions(handlers, isActive),
    }
  },
}

export function resolveJourneyCoverContent(
  record: JourneyCoverRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return journeyCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
