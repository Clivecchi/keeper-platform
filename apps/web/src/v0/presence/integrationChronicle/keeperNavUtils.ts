import { apiFetch } from "../../../lib/apiFetch"

export type KeeperNavRow = {
  id: string
  display_label: string | null
  title: string
}

export type KeeperNavRowPatch = {
  keeperId: string
  display_label?: string
  description?: string
}

/** Chronicle cover title — shared by cover schema identity.name and Nav. */
export function keeperChronicleTitle(
  row: Pick<KeeperNavRow, "display_label" | "title">,
): string {
  const trimmed = row.display_label?.trim()
  if (trimmed) return trimmed
  return row.title?.trim() || "Untitled keeper"
}

export async function fetchAllDomainKeeperRows(
  domainId: string,
): Promise<KeeperNavRow[]> {
  const res = (await apiFetch(
    `/api/keepers?domainId=${encodeURIComponent(domainId)}`,
  )) as { data?: { keepers?: KeeperNavRow[] } }
  const list = res?.data?.keepers ?? []
  return list.map((row) => ({
    id: row.id,
    display_label: row.display_label ?? null,
    title: row.title,
  }))
}

export function applyKeeperNavRowPatch(
  rows: KeeperNavRow[],
  patch: KeeperNavRowPatch | null,
): KeeperNavRow[] {
  if (!patch) return rows
  return rows.map((row) =>
    row.id === patch.keeperId
      ? {
          ...row,
          ...(patch.display_label !== undefined
            ? { display_label: patch.display_label, title: patch.display_label }
            : {}),
        }
      : row,
  )
}
