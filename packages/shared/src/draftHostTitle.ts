/**
 * Human-facing host name for a Draft or Dialog Document Point card.
 * `document_manuscript` is Dialog storage — never show the "· manuscript" suffix.
 */

export function displayDraftHostTitle(input: {
  kind?: string | null;
  draftTitle?: string | null;
  dialogTitle?: string | null;
}): string {
  const kind = input.kind?.trim() ?? '';
  const dialogTitle = input.dialogTitle?.trim() ?? '';
  const draftTitle = input.draftTitle?.trim() ?? '';
  if (kind === 'document_manuscript') {
    if (dialogTitle) return dialogTitle;
    const stripped = draftTitle.replace(/\s*[·—\-]\s*manuscript$/i, '').trim();
    return stripped || 'Document';
  }
  return draftTitle || 'Draft';
}
