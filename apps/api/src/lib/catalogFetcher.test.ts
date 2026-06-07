import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCatalog, type CatalogFetcherConfig } from './catalogFetcher.js';

const testConfig: CatalogFetcherConfig = {
  endpoint: 'https://example.com/models',
  authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  transform: (raw) => {
    const rows = Array.isArray(raw) ? raw : [];
    return rows.map((row: { id: string; name: string; type: string }) => ({
      id: row.id,
      label: row.name,
      type: row.type,
      metadata: { ...row },
    }));
  },
  filter: (item) => item.type === 'language',
  fallback: () => [
    { id: 'fallback-model', label: 'Fallback', type: 'language', metadata: {} },
  ],
};

describe('fetchCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns live items when the provider API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'live-1', name: 'Live One', type: 'language' },
          { id: 'img-1', name: 'Image', type: 'image' },
        ],
      }),
    );

    const result = await fetchCatalog('test-key', testConfig);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('live-1');
  });

  it('falls back when the provider API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'invalid key',
      }),
    );

    const result = await fetchCatalog('bad-key', testConfig);
    expect(result.ok).toBe(false);
    expect(result.source).toBe('fallback');
    expect(result.items[0]?.id).toBe('fallback-model');
    expect(result.error).toContain('401');
  });
});
