/**
 * Agency Board selection grammar (runtime id remains `agent`).
 * Agent remains Chronicle subject. A Dialog is performance/environment context.
 */

export type AgencyRoom =
  | { kind: "people"; userId?: string | null }
  | { kind: "inspect" }

export function isAgentBoardId(boardId: string | null | undefined): boolean {
  const id = boardId?.trim()
  return id === "agent" || id === "agency"
}

export function shouldKeepAgentWhenSelectingDialog(
  boardId: string | null | undefined,
  selectedAgentId: string | null | undefined,
): boolean {
  return isAgentBoardId(boardId) && Boolean(selectedAgentId?.trim())
}

export function shouldKeepDialogWhenSelectingAgent(
  boardId: string | null | undefined,
): boolean {
  return isAgentBoardId(boardId)
}

export function shouldKeepAgentWhenSelectingLibrary(
  boardId: string | null | undefined,
): boolean {
  return isAgentBoardId(boardId)
}
