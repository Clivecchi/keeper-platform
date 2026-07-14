/**
 * Read-only Library pointer refs — connective index (Pass 1).
 * Format: keeper://draft/{id} | keeper://sole/{id} | doc://{repoPath}
 */

export type LibraryPointerKind = 'draft' | 'sole' | 'doc';

export type LibraryPointerRef = {
  kind: LibraryPointerKind;
  targetId: string;
  label: string;
};

export function parseLibraryPointerRef(sourceRef: string): LibraryPointerRef | null {
  const trimmed = sourceRef.trim();
  const draftMatch = /^keeper:\/\/draft\/([^/?#]+)/i.exec(trimmed);
  if (draftMatch?.[1]) {
    return { kind: 'draft', targetId: draftMatch[1], label: `Draft ${draftMatch[1]}` };
  }
  const soleMatch = /^keeper:\/\/sole\/([^/?#]+)/i.exec(trimmed);
  if (soleMatch?.[1]) {
    return { kind: 'sole', targetId: soleMatch[1], label: `SOLE card ${soleMatch[1]}` };
  }
  const docMatch = /^doc:\/\/([^?#]+)/i.exec(trimmed);
  if (docMatch?.[1]) {
    return { kind: 'doc', targetId: docMatch[1], label: docMatch[1] };
  }
  return null;
}
