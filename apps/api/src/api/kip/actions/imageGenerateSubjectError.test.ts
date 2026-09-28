import { describe, expect, it } from 'vitest';
import {
  coerceImageGenerateSubject,
  humanAskedForImage,
  imageGenerateMissingSubjectMessage,
  imageRecoverySubject,
} from './imageGenerateSubjectError.js';

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

  it('uses title and description when subject is empty', () => {
    expect(coerceImageGenerateSubject({
      title: 'Yard Birds',
      description: 'A porch goose in painted regalia',
    })).toBe('A porch goose in painted regalia. Yard Birds');
  });

  it('keeps an explicit subject', () => {
    expect(coerceImageGenerateSubject({
      subject: 'a porch goose',
      title: 'Yard Birds',
    })).toBe('a porch goose');
  });

  it('recovers the Yard Birds picture from narration when no image action ran', () => {
    expect(humanAskedForImage(
      'well, let\'s see your design skills. Create an image for House Frogmore "Yard Birds".',
    )).toBe(true);
    const subject = imageRecoverySubject({
      human: 'Create an image for House Frogmore "Yard Birds".',
      responseText: [
        'Alright, no more fumbling the handoff.',
        '',
        '**Subject:** a decorative porch goose statue dressed in Lowcountry regalia — palmetto-frond collar, standing on a weathered plank porch.',
      ].join('\n'),
      cardTitle: 'Image generation started',
      cardBody: 'Yard Birds — a Lowcountry porch goose in painted regalia',
      results: [],
    });
    expect(subject).toContain('porch goose statue');
    expect(subject).not.toMatch(/image generation started/i);
  });

  it('does not call the provider again after it already failed', () => {
    expect(imageRecoverySubject({
      human: 'Create an image of the goose.',
      responseText: 'Subject: a porch goose',
      results: [{
        type: 'image.generate',
        status: 'error',
        message: 'Together AI API key not configured.',
      }],
    })).toBeNull();
  });
});
