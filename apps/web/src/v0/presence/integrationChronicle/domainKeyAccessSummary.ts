import {
  collapseKeyNavRows,
  IDE_AI_PROVIDERS,
  type KeyNavRow,
  providerDisplayLabel,
} from "./keyNavUtils"

export type KeyAccessKind = "yours" | "included" | "infrastructure"

/** User-facing source — never expose raw key_source values like "platform". */
export function keyAccessKind(row: Pick<KeyNavRow, "key_source">): KeyAccessKind {
  if (row.key_source === "user") return "yours"
  if (row.key_source === "env") return "infrastructure"
  return "included"
}

export function keyAccessKindLabel(kind: KeyAccessKind): string {
  switch (kind) {
    case "yours":
      return "Yours"
    case "infrastructure":
      return "Included"
    default:
      return "Included"
  }
}

export interface DomainProviderAccessLine {
  provider: string
  providerLabel: string
  accessKind: KeyAccessKind
  accessLabel: string
  status: string
  /** Resolved Key presence id — for Chronicle when user manages their override. */
  keyId: string | null
  canManage: boolean
}

export interface DomainAiAccessSummary {
  lines: DomainProviderAccessLine[]
  yoursCount: number
  includedCount: number
  connectedCount: number
}

export function summarizeDomainKeyAccess(rows: KeyNavRow[]): DomainAiAccessSummary {
  const collapsed = collapseKeyNavRows(rows)
  const byProvider = new Map(collapsed.map((row) => [row.provider, row]))

  const lines: DomainProviderAccessLine[] = IDE_AI_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider)
    if (!row) {
      return {
        provider,
        providerLabel: providerDisplayLabel(provider),
        accessKind: "included",
        accessLabel: "Not connected",
        status: "missing",
        keyId: null,
        canManage: true,
      }
    }

    const accessKind = keyAccessKind(row)
    return {
      provider,
      providerLabel: providerDisplayLabel(provider, row.display_label),
      accessKind,
      accessLabel: keyAccessKindLabel(accessKind),
      status: row.status,
      keyId: row.id,
      canManage: accessKind === "yours" || row.status !== "valid",
    }
  })

  const yoursCount = lines.filter((line) => line.accessKind === "yours" && line.status === "valid").length
  const includedCount = lines.filter(
    (line) => line.accessKind !== "yours" && line.status === "valid",
  ).length
  const connectedCount = lines.filter((line) => line.status === "valid").length

  return { lines, yoursCount, includedCount, connectedCount }
}
