/**
 * Dialog copy when image.generate arrives without payload.subject.
 * The picture text often lands in title or description instead.
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
