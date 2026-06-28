import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateMock = vi.fn();

vi.mock('together-ai', () => {
  class APIError extends Error {
    status: number;
    error: unknown;
    constructor(status: number, error: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.error = error;
    }
  }

  return {
    default: class Together {
      images = { generate: generateMock };
    },
    APIError,
  };
});

import { DEFAULT_IMAGE_MODEL, ModelProviderService, resolveImageModel } from './ModelProviderService.js';

describe('resolveImageModel', () => {
  it('returns default when model is missing', () => {
    expect(resolveImageModel(undefined)).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('rejects free-tier FLUX Schnell', () => {
    expect(resolveImageModel('black-forest-labs/FLUX.1-schnell-Free')).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('keeps valid configured models', () => {
    expect(resolveImageModel('black-forest-labs/FLUX.1-dev')).toBe('black-forest-labs/FLUX.1-dev');
  });
});

describe('ModelProviderService.generateImage', () => {
  beforeEach(() => {
    generateMock.mockReset();
    process.env.TOGETHER_API_KEY = 'together-test-key-abcdefghijklmnopqrstuvwxyz';
  });

  it('calls Together SDK with retries and returns image URL', async () => {
    generateMock.mockResolvedValue({
      model: DEFAULT_IMAGE_MODEL,
      data: [{ url: 'https://cdn.example.com/image.png', index: 0, type: 'url' }],
    });

    const result = await ModelProviderService.generateImage({
      prompt: 'a keeper desk at dusk',
      width: 1024,
      height: 1024,
    });

    expect(result.url).toBe('https://cdn.example.com/image.png');
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: DEFAULT_IMAGE_MODEL,
        prompt: 'a keeper desk at dusk',
        width: 1024,
        height: 1024,
        steps: 4,
        response_format: 'url',
      }),
    );
  });

  it('surfaces Together API errors with status', async () => {
    const { APIError } = await import('together-ai');
    generateMock.mockRejectedValue(
      new APIError(500, { message: 'Internal server error', type: 'server_error' }, '500 error'),
    );

    await expect(
      ModelProviderService.generateImage({ prompt: 'test image' }),
    ).rejects.toThrow('Together AI API error: 500');
  });
});
