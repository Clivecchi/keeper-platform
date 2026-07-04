/** Max length for nav/cover titles — descriptions hold the rest. */
export const RECORD_TITLE_MAX_LEN = 72;

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 24) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
}

/**
 * Shape a short human title from agent prose, prompts, or filenames.
 * Full text belongs in `description` / body — not the nav label.
 */
export function shapeRecordTitle(
  raw: string | null | undefined,
  fallback = "Untitled",
): string {
  let text = raw?.trim() ?? "";
  if (!text) return fallback;

  text = text.replace(/^Generated\s*[·•\-–—]\s*/i, "").trim();

  const quoted =
    text.match(/^["'](.+)["']$/s)?.[1]?.trim()
    ?? text.match(/["']([^"']{1,120})["']/)?.[1]?.trim();
  if (quoted) return truncateAtWord(quoted, RECORD_TITLE_MAX_LEN);

  const sentence = text.match(/^(.+?[.!?])(?:\s|$)/)?.[1]?.trim();
  if (sentence && sentence.length <= RECORD_TITLE_MAX_LEN) return sentence;

  const firstLine = text.split(/\n/)[0]?.trim() ?? text;
  if (firstLine.length <= RECORD_TITLE_MAX_LEN) return firstLine;

  return truncateAtWord(firstLine, RECORD_TITLE_MAX_LEN);
}

/** Long-form text when it differs from the shaped title. */
export function shapeRecordDescription(
  raw: string | null | undefined,
  title?: string | null,
): string | null {
  const text = raw?.trim();
  if (!text) return null;
  const shaped = shapeRecordTitle(title ?? text);
  if (text === shaped) return null;
  return text;
}
