import { describe, expect, it } from 'vitest';
import { imageGenerateFailureCopy } from './imageGenerateFailureCopy';

describe('imageGenerateFailureCopy', () => {
  it('expands the saved validation sentence', () => {
    const copy = imageGenerateFailureCopy('subject is required for image.generate');
    expect(copy).toContain('without a subject');
    expect(copy).toContain('image provider was not called');
    expect(copy).not.toBe('subject is required for image.generate');
  });

  it('keeps a server message that already explains the missing subject', () => {
    const server = 'Image was not created. image.generate needs a subject — a concrete description of the picture. This request sent title, description and left subject empty. The image provider was not called.';
    expect(imageGenerateFailureCopy(server)).toBe(server);
  });
});
