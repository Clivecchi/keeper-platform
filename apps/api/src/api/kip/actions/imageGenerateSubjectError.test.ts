import { describe, expect, it } from 'vitest';
import { imageGenerateMissingSubjectMessage } from './imageGenerateSubjectError.js';

describe('imageGenerateMissingSubjectMessage', () => {
  it('names the fields the model sent instead of subject', () => {
    const message = imageGenerateMissingSubjectMessage({
      title: 'House Frogmore Yard Birds',
      description: 'A porch goose adorned with Lowcountry elements',
      style: 'illustration',
    });
    expect(message).toContain('Image was not created');
    expect(message).toContain('title, description, style');
    expect(message).toContain('left subject empty');
    expect(message).toContain('image provider was not called');
  });

  it('says the payload was empty when nothing was sent', () => {
    expect(imageGenerateMissingSubjectMessage({})).toContain('The payload was empty.');
  });
});
