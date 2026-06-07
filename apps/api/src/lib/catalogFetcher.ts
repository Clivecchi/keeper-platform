/**
 * Connected Gateway catalog fetch utility.
 * Provider-agnostic: callers supply endpoint, auth, transform, and fallback.
 */

export type CatalogItem = {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, unknown>;
};

export type CatalogFetchResult = {
  ok: boolean;
  items: CatalogItem[];
  fetchedAt: string;
  source: 'live' | 'fallback';
  error?: string;
};

export type CatalogFetcherConfig = {
  endpoint: string;
  authHeader: (apiKey: string) => Record<string, string>;
  transform: (rawResponse: unknown) => CatalogItem[];
  fallback: () => CatalogItem[];
  filter?: (item: CatalogItem) => boolean;
};

export async function fetchCatalog(
  apiKey: string,
  config: CatalogFetcherConfig,
): Promise<CatalogFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(config.endpoint, {
      headers: {
        Accept: 'application/json',
        ...config.authHeader(apiKey),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Catalog API ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }

    const raw = await res.json();
    let items = config.transform(raw);
    if (config.filter) {
      items = items.filter(config.filter);
    }

    if (items.length === 0) {
      throw new Error('Catalog API returned no items after filtering');
    }

    return {
      ok: true,
      items,
      fetchedAt,
      source: 'live',
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown catalog fetch error';
    const fallbackItems = config.fallback();
    const filteredFallback = config.filter
      ? fallbackItems.filter(config.filter)
      : fallbackItems;

    return {
      ok: false,
      items: filteredFallback.length > 0 ? filteredFallback : fallbackItems,
      fetchedAt,
      source: 'fallback',
      error,
    };
  }
}
