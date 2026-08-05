import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampWebSearchCount, WebSearchService } from './WebSearchService.js';

describe('WebSearchService', () => {
  const originalKey = process.env.BRAVE_SEARCH_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.BRAVE_SEARCH_API_KEY;
    } else {
      process.env.BRAVE_SEARCH_API_KEY = originalKey;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clamps count to 1–10 with default 5', () => {
    expect(clampWebSearchCount(undefined)).toBe(5);
    expect(clampWebSearchCount(0)).toBe(1);
    expect(clampWebSearchCount(3.7)).toBe(3);
    expect(clampWebSearchCount(99)).toBe(10);
  });

  it('returns MISSING_API_KEY when BRAVE_SEARCH_API_KEY is unset', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    const outcome = await WebSearchService.search({ query: 'keeper platform' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errorCode).toBe('MISSING_API_KEY');
      expect(outcome.message).toContain('BRAVE_SEARCH_API_KEY');
    }
  });

  it('returns INVALID_QUERY for empty query', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';
    const outcome = await WebSearchService.search({ query: '   ' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errorCode).toBe('INVALID_QUERY');
    }
  });

  it('maps Brave web results on success', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            web: {
              results: [
                {
                  title: 'Keeper',
                  url: 'https://ke3p.com',
                  description: 'Platform home',
                },
                {
                  title: 'Missing url',
                  description: 'skip me',
                },
              ],
            },
          }),
      }),
    );

    const outcome = await WebSearchService.search({ query: 'keeper', count: 5 });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.provider).toBe('brave');
      expect(outcome.results).toEqual([
        {
          title: 'Keeper',
          url: 'https://ke3p.com',
          snippet: 'Platform home',
        },
      ]);
    }

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=keeper'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Subscription-Token': 'test-key',
        }),
      }),
    );
  });

  it('surfaces provider errors', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      }),
    );

    const outcome = await WebSearchService.search({ query: 'x' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errorCode).toBe('PROVIDER_ERROR');
      expect(outcome.message).toContain('Unauthorized');
    }
  });
});
