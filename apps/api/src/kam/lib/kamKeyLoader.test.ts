import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadKamServiceKeys } from './kamKeyLoader.js';

const ORIGINAL_ENV = { ...process.env } as Record<string, string | undefined>;

describe('loadKamServiceKeys', () => {
  beforeEach(() => {
    delete process.env.KAM_SERVICE_KEYS;
    delete process.env.KAM_SERVICE_KEY;
  });
  afterEach(() => {
    // Restore
    Object.keys(process.env).forEach((k) => {
      if (!(k in ORIGINAL_ENV)) delete (process.env as any)[k];
    });
    for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
      if (typeof v === 'string') (process.env as any)[k] = v;
      else delete (process.env as any)[k];
    }
  });

  it('returns empty when none are set', () => {
    expect(loadKamServiceKeys()).toEqual([]);
  });

  it('parses only CSV list', () => {
    process.env.KAM_SERVICE_KEYS = 'a,b,c';
    expect(loadKamServiceKeys().sort()).toEqual(['a', 'b', 'c']);
  });

  it('parses only single', () => {
    process.env.KAM_SERVICE_KEY = 'solo';
    expect(loadKamServiceKeys()).toEqual(['solo']);
  });

  it('merges both and de-dupes', () => {
    process.env.KAM_SERVICE_KEYS = 'a,b';
    process.env.KAM_SERVICE_KEY = 'b';
    const out = loadKamServiceKeys().sort();
    expect(out).toEqual(['a', 'b']);
  });

  it('trims whitespace and filters empties', () => {
    process.env.KAM_SERVICE_KEYS = ' a ,  , b  ,';
    process.env.KAM_SERVICE_KEY = '  c  ';
    const out = loadKamServiceKeys().sort();
    expect(out).toEqual(['a', 'b', 'c']);
  });
});


