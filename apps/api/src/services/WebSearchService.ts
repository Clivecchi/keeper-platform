/**
 * Web search for Kip agents — Brave Search API.
 *
 * Platform-scoped: BRAVE_SEARCH_API_KEY on the API service.
 * Used by the `web.search` Kip action (all agents).
 */

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;
const FETCH_TIMEOUT_MS = 15_000;

export type WebSearchResultItem = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchSuccess = {
  ok: true;
  query: string;
  provider: 'brave';
  results: WebSearchResultItem[];
};

export type WebSearchFailure = {
  ok: false;
  query: string;
  errorCode: 'MISSING_API_KEY' | 'PROVIDER_ERROR' | 'TIMEOUT' | 'INVALID_QUERY';
  message: string;
};

export type WebSearchOutcome = WebSearchSuccess | WebSearchFailure;

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
};

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
  message?: string;
  error?: { message?: string };
};

export function clampWebSearchCount(count: unknown): number {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return DEFAULT_COUNT;
  }
  const n = Math.floor(count);
  if (n < 1) return 1;
  if (n > MAX_COUNT) return MAX_COUNT;
  return n;
}

export class WebSearchService {
  static isConfigured(): boolean {
    return Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
  }

  static async search(params: {
    query: string;
    count?: number;
  }): Promise<WebSearchOutcome> {
    const query = params.query.trim();
    if (!query) {
      return {
        ok: false,
        query: '',
        errorCode: 'INVALID_QUERY',
        message: 'query is required for web.search',
      };
    }

    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        query,
        errorCode: 'MISSING_API_KEY',
        message:
          'Web search is not configured. Set BRAVE_SEARCH_API_KEY on the API service (Brave Search API).',
      };
    }

    const count = clampWebSearchCount(params.count);
    const url = new URL(BRAVE_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(count));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: BraveSearchResponse;
      try {
        payload = JSON.parse(text) as BraveSearchResponse;
      } catch {
        return {
          ok: false,
          query,
          errorCode: 'PROVIDER_ERROR',
          message: `Brave Search returned invalid JSON (${response.status})`,
        };
      }

      if (!response.ok) {
        const providerMessage =
          payload.message ||
          payload.error?.message ||
          `Brave Search API error (${response.status})`;
        return {
          ok: false,
          query,
          errorCode: 'PROVIDER_ERROR',
          message: providerMessage,
        };
      }

      const raw = Array.isArray(payload.web?.results) ? payload.web.results : [];
      const results: WebSearchResultItem[] = raw
        .map((row) => ({
          title: typeof row.title === 'string' ? row.title.trim() : '',
          url: typeof row.url === 'string' ? row.url.trim() : '',
          snippet: typeof row.description === 'string' ? row.description.trim() : '',
        }))
        .filter((row) => row.title && row.url)
        .slice(0, count);

      return {
        ok: true,
        query,
        provider: 'brave',
        results,
      };
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || /aborted/i.test(error.message));
      if (aborted) {
        return {
          ok: false,
          query,
          errorCode: 'TIMEOUT',
          message: `Web search timed out after ${FETCH_TIMEOUT_MS}ms`,
        };
      }
      return {
        ok: false,
        query,
        errorCode: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Web search failed',
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
