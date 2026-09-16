/**
 * Web search for Kip agents.
 *
 * Preferred: Brave Search API (`BRAVE_SEARCH_API_KEY` env, then platform key
 * `brave` / `brave-search`). Fallback: DuckDuckGo HTML + direct page fetch
 * when the query names a public URL or domain.
 */

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/';
const BRAVE_PLATFORM_PROVIDERS = ['brave', 'brave-search'] as const;
const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;
const FETCH_TIMEOUT_MS = 15_000;
const PAGE_SNIPPET_CHARS = 4_000;
const PAGE_MAX_BYTES = 512_000;
const SEARCH_USER_AGENT = 'Keeper-WebSearch/1.0 (+https://ke3p.com)';

const PAGE_HOST_RE =
  /(?:https?:\/\/[^\s<>"'()]+)|(?:www\.[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,})|(?:\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|ai|io|org|net|dev|app|co|us|edu|gov|info|xyz|to|me|gg|sh)\b)/i;

export type WebSearchProvider = 'brave' | 'duckduckgo' | 'page';

export type WebSearchResultItem = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchSuccess = {
  ok: true;
  query: string;
  provider: WebSearchProvider;
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function stripHtmlToText(raw: string, maxChars: number): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;:!?]+$/g, '');
}

export function isSafePublicHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '169.254.169.254'
  ) {
    return false;
  }
  if (/^(127|10)\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return false;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return false;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return false;
  }
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return false;
  }
  return true;
}

export function extractPageUrlFromQuery(query: string): string | null {
  const match = query.match(PAGE_HOST_RE);
  if (!match?.[0]) return null;
  let candidate = stripTrailingPunctuation(match[0].trim());
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!isSafePublicHttpUrl(candidate)) {
    return null;
  }
  return candidate;
}

function decodeDuckDuckGoHref(href: string): string {
  const normalized = href.startsWith('//') ? `https:${href}` : href;
  try {
    const url = new URL(normalized);
    const uddg = url.searchParams.get('uddg');
    return uddg && isSafePublicHttpUrl(uddg) ? uddg : url.href;
  } catch {
    return href;
  }
}

export function parseDuckDuckGoHtml(html: string, count: number): WebSearchResultItem[] {
  const results: WebSearchResultItem[] = [];
  const anchorRe = /<a\b[^>]*\bclass="[^"]*\bresult__a\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null && results.length < count) {
    const tag = match[0];
    const hrefMatch = tag.match(/\bhref="([^"]+)"/i);
    const title = decodeHtmlEntities(tag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    const href = hrefMatch?.[1] ? decodeDuckDuckGoHref(hrefMatch[1]) : '';
    if (!title || !href || !isSafePublicHttpUrl(href)) continue;

    const after = html.slice(match.index + tag.length, match.index + tag.length + 800);
    const snippetMatch = after.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|span|div)>/i,
    );
    const snippet = snippetMatch?.[1]
      ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
      : '';

    results.push({ title, url: href, snippet });
  }
  return results;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /aborted/i.test(error.message))
  );
}

async function resolveBraveApiKey(): Promise<string | null> {
  const envKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (envKey) return envKey;
  if (process.env.VITEST || !process.env.DATABASE_URL?.trim()) return null;

  try {
    const { prisma } = await import('@keeper/database');
    const row = await prisma.kip_platform_keys.findFirst({
      where: {
        is_active: true,
        provider: { in: [...BRAVE_PLATFORM_PROVIDERS] },
      },
      select: { api_key: true },
    });
    const platformKey = row?.api_key?.trim();
    return platformKey || null;
  } catch {
    return null;
  }
}

async function searchBrave(
  query: string,
  count: number,
  apiKey: string,
): Promise<WebSearchOutcome> {
  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
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
    if (isAbortError(error)) {
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
  }
}

async function searchDuckDuckGo(
  query: string,
  count: number,
): Promise<WebSearchOutcome> {
  const url = new URL(DUCKDUCKGO_HTML_URL);
  url.searchParams.set('q', query);

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        'User-Agent': SEARCH_USER_AGENT,
      },
    });
    const html = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        query,
        errorCode: 'PROVIDER_ERROR',
        message: `DuckDuckGo search failed (${response.status})`,
      };
    }
    const results = parseDuckDuckGoHtml(html, count);
    return {
      ok: true,
      query,
      provider: 'duckduckgo',
      results,
    };
  } catch (error) {
    if (isAbortError(error)) {
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
      message: error instanceof Error ? error.message : 'DuckDuckGo search failed',
    };
  }
}

async function fetchPublicPage(pageUrl: string): Promise<WebSearchResultItem | null> {
  try {
    const response = await fetchWithTimeout(pageUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': SEARCH_USER_AGENT,
      },
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const raw = buffer.subarray(0, PAGE_MAX_BYTES).toString('utf8');
    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim()
      ? decodeHtmlEntities(titleMatch[1])
      : pageUrl;
    const snippet = stripHtmlToText(raw, PAGE_SNIPPET_CHARS);
    if (!snippet) return null;
    return { title, url: pageUrl, snippet };
  } catch {
    return null;
  }
}

function mergeResults(
  primary: WebSearchResultItem[],
  extra: WebSearchResultItem[],
  count: number,
): WebSearchResultItem[] {
  const seen = new Set<string>();
  const merged: WebSearchResultItem[] = [];
  for (const row of [...extra, ...primary]) {
    const key = row.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= count) break;
  }
  return merged;
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

    const count = clampWebSearchCount(params.count);
    const pageUrl = extractPageUrlFromQuery(query);
    const pageResult = pageUrl ? await fetchPublicPage(pageUrl) : null;
    const apiKey = await resolveBraveApiKey();

    if (apiKey) {
      const brave = await searchBrave(query, count, apiKey);
      if (brave.ok) {
        return {
          ...brave,
          results: pageResult
            ? mergeResults(brave.results, [pageResult], count)
            : brave.results,
        };
      }
      if (pageResult) {
        return {
          ok: true,
          query,
          provider: 'page',
          results: [pageResult],
        };
      }
      return brave;
    }

    const fallback = await searchDuckDuckGo(query, count);
    if (fallback.ok && fallback.results.length > 0) {
      return {
        ...fallback,
        results: pageResult
          ? mergeResults(fallback.results, [pageResult], count)
          : fallback.results,
      };
    }
    if (pageResult) {
      return {
        ok: true,
        query,
        provider: 'page',
        results: [pageResult],
      };
    }

    return {
      ok: false,
      query,
      errorCode: 'MISSING_API_KEY',
      message:
        'Web search is not configured. Set BRAVE_SEARCH_API_KEY on the API service (Brave Search API), or add a platform key for provider brave.',
    };
  }
}
