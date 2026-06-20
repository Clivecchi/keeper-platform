/**
 * Layer 2 — Draft EntityKind cover schema.
 */
import { parseDraftPoints, type DraftPoint } from "@keeper/shared"
import type {
  CoverActionDef,
  CoverActionHandlers,
  CoverAvatarGlow,
  CoverResolveContext,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type DraftCoverRecord = {
  id: string
  title?: string
  kind?: string
  status?: string
  keeperTitle?: string
  updatedLabel?: string
  points?: DraftPoint[]
  isSessionActive?: boolean
}

export function draftChronicleTitle(record: {
  title?: string | null
  id?: string
}): string {
  const title = record.title?.trim()
  if (title) return title
  return record.id ? `Draft ${record.id.slice(0, 8)}` : "Untitled draft"
}

function countPoints(points: DraftPoint[]): { accepted: number; pending: number } {
  let accepted = 0
  let pending = 0
  for (const point of points) {
    if (point.status === "accepted") accepted += 1
    else pending += 1
  }
  return { accepted, pending }
}

function statusGlow(status: string | undefined, pendingCount: number): CoverAvatarGlow {
  if (status === "promoted" || status === "archived") return "inactive"
  if (pendingCount > 0) return "active"
  return status === "approved" || status === "reviewed" ? "active" : "inactive"
}

function formatKind(kind: string | undefined): string {
  if (!kind) return "Draft"
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function resolveActions(
  handlers: CoverActionHandlers,
  isSessionActive: boolean,
): CoverActionDef[] {
  const actions: CoverActionDef[] = []
  if (handlers.onSetActive && !isSessionActive) {
    actions.push({
      id: "set-active",
      label: "Set active",
      variant: "primary",
      icon: "play",
      onClick: handlers.onSetActive,
    })
  }
  actions.push({
    id: "configure",
    label: "Manage",
    variant: isSessionActive ? "primary" : "secondary",
    icon: "gear",
    onClick: handlers.onConfigure,
  })
  return actions
}

export const draftCoverSchema: EntityCoverSchema<DraftCoverRecord> = {
  objectType: "draft",

  resolve(record, fieldValues, ctx, handlers): ResolvedCoverContent {
    const title =
      fieldValues.title?.trim() ||
      record.title?.trim() ||
      draftChronicleTitle({ title: record.title, id: ctx.objectId })
    const points = record.points ?? []
    const { accepted, pending } = countPoints(points)
    const glow = statusGlow(record.status, pending)
    const kindLabel = formatKind(record.kind)

    const traits = [
      { label: "Status", value: record.status ?? "draft" },
      { label: "Kind", value: kindLabel },
      ...(accepted + pending > 0
        ? [{
            label: "Points",
            value: pending > 0 ? `${accepted} accepted · ${pending} pending` : `${accepted} accepted`,
            pulse: pending > 0,
          }]
        : []),
      ...(record.updatedLabel ? [{ label: "Updated", value: record.updatedLabel }] : []),
    ]

    const credits: string[] = []
    if (record.keeperTitle) credits.push(record.keeperTitle)
    if (record.isSessionActive) credits.push("Active in session")

    const slug = ctx.objectId.replace(/-/g, "").slice(0, 8).toUpperCase()

    return {
      hero: {
        avatar: "📝",
        avatarGlow: glow,
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · DRAFT · ${slug}`,
        statusLabel: pending > 0 ? "REVIEW" : record.status?.toUpperCase(),
        roleLabel: "DRAFT",
      },
      identity: {
        name: title,
        roleLine: kindLabel,
        voicePlaceholder: "What this draft carries",
      },
      traits,
      credits,
      actions: resolveActions(handlers, record.isSessionActive ?? false),
    }
  },
}

export function resolveDraftCoverContent(
  record: DraftCoverRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return draftCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
