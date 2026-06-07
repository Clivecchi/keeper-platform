import { describe, expect, it } from 'vitest';
import { staticCatalogModels } from './integrationCatalog.js';

describe('integrationCatalog static fallback', () => {
  it('returns modelCatalog entries for openai with source fallback', () => {
    const models = staticCatalogModels('openai');
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.source === 'fallback')).toBe(true);
    expect(models.some((m) => m.id === 'gpt-4o')).toBe(true);
  });
});
