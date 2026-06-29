export type AgentNavRow = {
  id: string
  name: string
  model: string | null
}

export type AgentNavRowPatch = {
  agentId: string
  name?: string
  model?: string | null
}

export function applyAgentNavRowPatch(
  rows: AgentNavRow[],
  patch: AgentNavRowPatch | null,
): AgentNavRow[] {
  if (!patch) return rows
  return rows.map((row) =>
    row.id === patch.agentId
      ? {
          ...row,
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.model !== undefined ? { model: patch.model } : {}),
        }
      : row,
  )
}
