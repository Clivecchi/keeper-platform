import { describe, expect, it } from 'vitest';
import { DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES, isDomainAccessKeyScope } from './domainAccessKey.js';

describe('domainAccessKey', () => {
  it('mints new keys with library, dialog, and gloss — not library-only', () => {
    expect(DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES).toEqual([
      'library.ro',
      'dialog.ro',
      'dialog.rw',
      'gloss.rw',
    ]);
    expect(DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES.every(isDomainAccessKeyScope)).toBe(true);
  });
});
