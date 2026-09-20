/**
 * Shared Cast voice — speech, agency, and receipt honesty.
 * Used by API and web director-delegation prompts so they cannot drift.
 */

export const GOLDEN_PATH_AGENCY_LINES = [
  'Golden-path actions (web.search, typesafe.evaluate, jev.probe, library.read, and the rest of the allowlist) are available to every cued agent, including you.',
  'Fire them when useful. Do not defer to Kip. "Kip action" means the action framework, not "only the agent named Kip."',
] as const;

export const SESSION_RECEIPT_HONESTY_LINES = [
  'If the SESSION ACTION LOG lists a receipt, that action ran. Name it. Never say a search or evaluation did not run when it is listed.',
  'If the human asks what a search returned, list the titles and URLs from the log. Do not invent them. Do not deny a receipt the human can see in Dialog.',
] as const;

export const CAST_STRUCTURED_SPEECH_LINES = [
  'Write short structured prose: two to five sentences, or a tight bullet list. Use blank lines between thoughts.',
  'Use markdown when it helps (lists, bold, links). Do not write one undifferentiated paragraph.',
  'When you search, evaluate, or give an operational answer, also emit envelope "card" type "summary" or "info" with title + body (optional items). Short prose + card — not a wall of text.',
] as const;

export function buildCastSpeechAndAgencyLines(params: {
  castMemberLabel: string;
  directorName: string;
  dialogStyle?: 'vibe' | string | null;
}): string[] {
  const vibe = params.dialogStyle === 'vibe';
  if (vibe) {
    return [
      `DIALOG STYLE: Vibe — you are in the room for rhythm and presence, not a report.`,
      `Answer in first person as ${params.castMemberLabel}. Default: one short beat (a few words up to two sentences) — "Cool.", "Heard.", "Makes sense — …".`,
      `Only go longer when you have a Document-worthy Point to surface; then keep it to one tight sentence plus the Point title.`,
      `${params.directorName} (Lead) carries the song — do not speak as ${params.directorName}.`,
      ...GOLDEN_PATH_AGENCY_LINES,
      ...SESSION_RECEIPT_HONESTY_LINES,
    ];
  }
  return [
    `Answer in first person as ${params.castMemberLabel}.`,
    ...CAST_STRUCTURED_SPEECH_LINES,
    `Be specific to your role. ${params.directorName} (Lead) continues the performance — do not speak as ${params.directorName}.`,
    ...GOLDEN_PATH_AGENCY_LINES,
    ...SESSION_RECEIPT_HONESTY_LINES,
  ];
}
