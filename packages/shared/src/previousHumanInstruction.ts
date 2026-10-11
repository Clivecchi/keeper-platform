/**
 * When the current sentence points at an earlier human instruction,
 * that sentence has to travel with the specialist. The aim stays the task.
 */

const PREVIOUS_INSTRUCTION_PATTERNS = [
  /\b(previous|prior|opening|earlier) (prompt|instruction|message|request)\b/i,
  /\brefer to (the )?(previous|prior|last|earlier)\b/i,
  /\bcontinue (the |from )?(my |the )?(opening |previous |prior )?(prompt|objective|instruction)\b/i,
];

const MAX_INSTRUCTION_CHARS = 4_000;

export function refersToPreviousHumanInstruction(text: string | null | undefined): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;
  return PREVIOUS_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(input));
}

/** Quoted earlier sentence. Clipped so a long prompt stays one block. */
export function formatPreviousHumanInstruction(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const body = compact.length <= MAX_INSTRUCTION_CHARS
    ? compact
    : `${compact.slice(0, MAX_INSTRUCTION_CHARS - 1).trim()}…`;
  return [
    'PREVIOUS HUMAN INSTRUCTION — the current sentence refers to this. It is recoverable text.',
    'The aim is still the task. Do not replace this instruction with a narrower reading of the current sentence.',
    `"${body}"`,
  ].join('\n');
}
