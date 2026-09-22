/**
 * Document Orientation — Lead-maintained operational map on a Dialog.
 * Beside Forward. Not a turn summary. Not System One.
 */

export const DOCUMENT_ORIENTATION_MAX_CHARS = 2000;

export type DocumentOrientation = {
  body: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type OrientationLandmark = {
  kind: 'section' | 'point';
  /** Section title, or "Point N — title". */
  label: string;
  ref: string;
};

function mentionsPhrase(body: string, phrase: string): boolean {
  const trimmed = phrase.trim();
  if (trimmed.length < 2) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(body);
  } catch {
    return body.toLowerCase().includes(trimmed.toLowerCase());
  }
}

/**
 * Landmarks already named in the Orientation prose.
 * Sections match by title. Points match "Point 4" / "Points 12" against Chronicle numbers.
 */
export function deriveOrientationLandmarks(input: {
  body: string;
  sections?: Array<{ id?: string; title: string }>;
  points?: Array<{ number: number; title?: string }>;
}): OrientationLandmark[] {
  const body = input.body.trim();
  if (!body) return [];

  const landmarks: OrientationLandmark[] = [];
  const seen = new Set<string>();

  for (const section of input.sections ?? []) {
    const title = section.title.trim();
    if (!title || !mentionsPhrase(body, title)) continue;
    const ref = section.id?.trim() || title;
    const key = `section:${ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    landmarks.push({ kind: 'section', label: title, ref });
  }

  const mentioned = new Set<number>();
  for (const match of body.matchAll(/\bpoints?\s+#?(\d{1,3})\b/gi)) {
    const number = Number(match[1]);
    if (Number.isFinite(number) && number >= 1) mentioned.add(number);
  }

  const points = [...(input.points ?? [])].sort((a, b) => a.number - b.number);
  for (const point of points) {
    if (!mentioned.has(point.number)) continue;
    const key = `point:${point.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const title = point.title?.trim();
    landmarks.push({
      kind: 'point',
      label: title ? `Point ${point.number} — ${title}` : `Point ${point.number}`,
      ref: String(point.number),
    });
  }

  return landmarks;
}

/** Standing Dialog Document lines. Same block for Lead and Cast. */
export function formatOrientationForAgent(input: {
  orientation?: DocumentOrientation | null;
  sections?: Array<{ id?: string; title: string }>;
  points?: Array<{ number: number; title?: string }>;
}): string[] {
  const body = input.orientation?.body.trim() ?? '';
  if (!body) {
    return [
      'Orientation — not written yet. The Lead sets it with document.orientation.update only when the shared reading of this Document materially changes. It is not a turn summary and it is not Forward.',
    ];
  }

  const lines = [
    `Orientation (Lead-maintained map for how to read this Document — persistent, not Forward, not a turn summary): ${body}`,
  ];
  const landmarks = deriveOrientationLandmarks({
    body,
    sections: input.sections,
    points: input.points,
  });
  if (landmarks.length > 0) {
    lines.push(
      `Orientation landmarks (deeper account is the Section or Point already listed below): ${landmarks
        .map((landmark) => landmark.label)
        .join('; ')}`,
    );
  }
  const updatedBy = input.orientation?.updatedBy?.trim();
  if (updatedBy) {
    lines.push(`Orientation last set by ${updatedBy}.`);
  }
  lines.push(
    'Do not rewrite Orientation on an ordinary turn. Cite these landmarks when you need the deeper account; the Point preview in this block is that account.',
  );
  return lines;
}
