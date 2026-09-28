/**
 * Dialog receipt for a failed image.generate.
 * Saved turns still carry the short validation sentence; expand that here.
 */
export function imageGenerateFailureCopy(message: string | undefined): string {
  const text = message?.trim() ?? '';
  if (text.startsWith('Image was not created.')) return text;
  if (/subject is required for image\.generate/i.test(text)) {
    return 'Image was not created. The model called image.generate without a subject — the picture description that action requires. Title or description fields are ignored. The image provider was not called.';
  }
  return text || 'Image was not created. The image provider was not called.';
}
