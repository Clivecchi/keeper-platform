/**
 * Agent Board selection grammar.
 * Agent remains Chronicle subject. A Dialog is performance/environment context.
 */

export function isAgentBoardId(boardId: string | null | undefined): boolean {
  return boardId?.trim() === "agent"
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
