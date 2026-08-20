/**
 * Document Chronicle identity — same header job as Cdraft, without Realm idle copy.
 */

export const DOCUMENT_EMPTY_POINTS_COPY = "No Points yet."
export const DOCUMENT_SELECT_DIALOG_COPY = "Select a Dialog to see its Document"
export const DOCUMENT_LOADING_COPY = "Loading Document…"

export function resolveDocumentHeaderTitle(input: {
  dialogTitle?: string | null
  forwardTitle?: string | null
  navTitle?: string | null
}): string {
  const dialogTitle = input.dialogTitle?.trim()
  if (dialogTitle) return dialogTitle
  const forwardTitle = input.forwardTitle?.trim()
  if (forwardTitle) return forwardTitle
  const navTitle = input.navTitle?.trim()
  if (navTitle) return navTitle
  return "Untitled document"
}

export function formatDocumentStatusLabel(status?: string | null): string {
  const raw = status?.trim() || "document"
  return raw.replace(/_/g, " ")
}
