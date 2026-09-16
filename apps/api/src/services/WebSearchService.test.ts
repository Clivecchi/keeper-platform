import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampWebSearchCount,
  extractPageUrlFromQuery,
  isSafePublicHttpUrl,
  parseDuckDuckGoHtml,
  WebSearchService,
} from './WebSearchService.js';

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

  it('extracts public page URLs from visit-style queries', () => {
    expect(extractPageUrlFromQuery('typesafe.ai')).toBe('https://typesafe.ai');
    expect(extractPageUrlFromQuery('Visit www.typesafe.ai and read the docs')).toBe(
      'https://www.typesafe.ai',
    );
    expect(extractPageUrlFromQuery('https://typesafe.ai/docs')).toBe('https://typesafe.ai/docs');
    expect(extractPageUrlFromQuery('keeper platform')).toBeNull();
    expect(extractPageUrlFromQuery('http://127.0.0.1/secret')).toBeNull();
    expect(extractPageUrlFromQuery('http://localhost/admin')).toBeNull();
  });

  it('rejects private fetch targets', () => {
    expect(isSafePublicHttpUrl('https://typesafe.ai')).toBe(true);
    expect(isSafePublicHttpUrl('http://127.0.0.1/')).toBe(false);
    expect(isSafePublicHttpUrl('http://10.0.0.8/')).toBe(false);
    expect(isSafePublicHttpUrl('http://192.168.1.9/')).toBe(false);
    expect(isSafePublicHttpUrl('http://169.254.169.254/latest')).toBe(false);
  });

  it('parses DuckDuckGo HTML results and decodes redirect hrefs', () => {
    const html = `
      <a class="result__a" href="https://www.typesafe.ai/">Typesafe</a>
      <a class="result__snippet">Agent identity platform</a>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdocs.typesafe.ai%2F">Docs</a>
    `;
    expect(parseDuckDuckGoHtml(html, 5)).toEqual([
      {
        title: 'Typesafe',
        url: 'https://www.typesafe.ai/',
        snippet: 'Agent identity platform',
      },
      {
        title: 'Docs',
        url: 'https://docs.typesafe.ai/',
        snippet: '',
      },
    ]);
  });

  it('returns MISSING_API_KEY when Brave is unset and fallbacks return nothing', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<html><body>no results</body></html>',
        arrayBuffer: async () => Buffer.from('<html><body>no results</body></html>'),
      }),
    );
    const outcome = await WebSearchService.search({ query: 'keeper platform' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.errorCode).toBe('MISSING_API_KEY');
      expect(outcome.message).toContain('BRAVE_SEARCH_API_KEY');
    }
  });

  it('falls back to DuckDuckGo when BRAVE_SEARCH_API_KEY is unset', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          '<a class="result__a" href="https://www.typesafe.ai/">Typesafe</a><a class="result__snippet">Identity for agents</a>',
        arrayBuffer: async () => Buffer.from(''),
      }),
    );

    const outcome = await WebSearchService.search({ query: 'Typesafe.ai', count: 5 });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.provider === 'duckduckgo' || outcome.provider === 'page').toBe(true);
      expect(outcome.results.some((row) => row.url.includes('typesafe.ai'))).toBe(true);
    }
  });

  it('fetches a named public page when Brave is unset', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('html.duckduckgo.com')) {
          return {
            ok: true,
            status: 200,
            text: async () => '<html></html>',
            arrayBuffer: async () => Buffer.from('<html></html>'),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => '<html><title>Typesafe</title><p>Agent identity docs live here.</p></html>',
          arrayBuffer: async () =>
            Buffer.from('<html><title>Typesafe</title><p>Agent identity docs live here.</p></html>'),
        };
      }),
    );

    const outcome = await WebSearchService.search({ query: 'www.typesafe.ai' });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.provider).toBe('page');
      expect(outcome.results[0]?.title).toBe('Typesafe');
      expect(outcome.results[0]?.snippet).toContain('Agent identity docs live here');
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
        arrayBuffer: async () => Buffer.from(''),
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
        arrayBuffer: async () => Buffer.from(''),
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
