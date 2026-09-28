const SUBJECT_ALIAS_KEYS = ['prompt', 'description', 'body', 'text', 'title'] as const;

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Picture text often lands in title or description. Fold those into subject
 * so the provider is called.
 */
export function coerceImageGenerateSubject(payload: Record<string, unknown>): string {
  const direct = stringField(payload.subject);
  if (direct) return direct.slice(0, 1800);
  const parts: string[] = [];
  for (const key of SUBJECT_ALIAS_KEYS) {
    const value = stringField(payload[key]);
    if (value && !parts.includes(value)) parts.push(value);
  }
  return parts.join('. ').slice(0, 1800);
}

/** Explicit ask for a picture. Narrating one is not the same request. */
export function humanAskedForImage(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return /\b(create|make|generate|draw|paint|render)\b[\s\S]{0,80}\b(?:an? |the )?(?:image|picture|illustration|portrait)\b/i.test(value);
}

const STARTED_CARD = /image generation started/i;

/** The picture Mutsy described when he did not emit a usable image.generate. */
export function subjectFromImageNarration(params: {
  responseText?: string | null;
  cardTitle?: string | null;
  cardBody?: string | null;
}): string {
  const response = params.responseText ?? '';
  const marked = response.match(/\*{0,2}Subject:\*{0,2}\s*([\s\S]+)/i);
  if (marked?.[1]) {
    const line = marked[1]
      .split(/\n\s*\n/)[0]
      .replace(/\*+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (line.length >= 12) return line.slice(0, 1800);
  }
  const body = (params.cardBody ?? '').replace(/\s+/g, ' ').trim();
  if (body.length >= 12 && !STARTED_CARD.test(body)) return body.slice(0, 1800);
  const title = (params.cardTitle ?? '').replace(/\s+/g, ' ').trim();
  if (title.length >= 12 && !STARTED_CARD.test(title)) return title.slice(0, 1800);
  return '';
}

export function imageRecoverySubject(params: {
  human: string;
  responseText?: string | null;
  cardTitle?: string | null;
  cardBody?: string | null;
  results: Array<{ type: string; status: string; message?: string }>;
}): string | null {
  if (!humanAskedForImage(params.human)) return null;
  const attempts = params.results.filter((result) => result.type === 'image.generate');
  if (attempts.some((result) => result.status === 'success')) return null;
  const providerWasCalled = attempts.some((result) => {
    if (result.status === 'success') return true;
    if (result.status !== 'error') return false;
    return !/subject|provider was not called|was not called/i.test(result.message ?? '');
  });
  if (providerWasCalled) return null;
  return subjectFromImageNarration(params) || null;
}

/**
 * Dialog copy when image.generate arrives without any picture text.
 */
export function imageGenerateMissingSubjectMessage(payload: Record<string, unknown>): string {
  const sent = Object.keys(payload).filter((key) => {
    const value = payload[key];
    if (typeof value === 'string') return value.trim().length > 0;
    return value != null;
  });
  const sentClause = sent.length > 0
    ? `This request sent ${sent.join(', ')} and left subject empty.`
    : 'The payload was empty.';
  return `Image was not created. image.generate needs a subject — a concrete description of the picture. ${sentClause} The image provider was not called.`;
}
