import { apiFetch } from "../../../lib/apiFetch"

export type CapabilityKind = "infra" | "tool" | "permission" | "action"

export type CapabilityNavRow = {
  id: string
  slug: string
  kind: CapabilityKind
  display_label: string | null
}

export type CapabilityNavRowPatch = {
  capabilityId: string
  display_label?: string
  description?: string
}

const KIND_ORDER: CapabilityKind[] = ["infra", "tool", "permission", "action"]

export const CAPABILITY_KIND_LABELS: Record<CapabilityKind, string> = {
  infra: "Infra",
  tool: "Tool",
  permission: "Permission",
  action: "Action",
}

/** Chronicle cover title — matches capabilityCoverSchema identity.name. */
export function capabilityChronicleTitle(
  row: Pick<CapabilityNavRow, "display_label" | "slug">,
): string {
  const trimmed = row.display_label?.trim()
  if (trimmed) return trimmed
  return row.slug
}

export function groupCapabilitiesByKind(
  rows: CapabilityNavRow[],
): Record<CapabilityKind, CapabilityNavRow[]> {
  const grouped: Record<CapabilityKind, CapabilityNavRow[]> = {
    infra: [],
    tool: [],
    permission: [],
    action: [],
  }
  for (const row of rows) {
    const kind = row.kind as CapabilityKind
    if (grouped[kind]) grouped[kind].push(row)
  }
  for (const kind of KIND_ORDER) {
    grouped[kind].sort((a, b) =>
      capabilityChronicleTitle(a).localeCompare(capabilityChronicleTitle(b)),
    )
  }
  return grouped
}

export async function fetchAllCapabilityRows(): Promise<CapabilityNavRow[]> {
  const rows = (await apiFetch("/api/capabilities")) as CapabilityNavRow[]
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    kind: row.kind as CapabilityKind,
    display_label: row.display_label ?? null,
  }))
}

export function applyCapabilityNavRowPatch(
  rows: CapabilityNavRow[],
  patch: CapabilityNavRowPatch | null,
): CapabilityNavRow[] {
  if (!patch) return rows
  return rows.map((row) =>
    row.id === patch.capabilityId
      ? {
          ...row,
          ...(patch.display_label !== undefined
            ? { display_label: patch.display_label }
            : {}),
        }
      : row,
  )
}

/** Static source reference for definition Chronicle block. */
export function capabilitySourceFile(kind: CapabilityKind): string {
  switch (kind) {
    case "infra":
      return "infraCapabilities.ts"
    case "action":
      return "agentCapabilityConstants.ts"
    case "tool":
    case "permission":
      return "kip-agents.seed.ts"
    default:
      return "—"
  }
}

export function capabilityEnforcementLabel(kind: CapabilityKind): string {
  return kind === "infra" ? "Enforced" : "Display only"
}
