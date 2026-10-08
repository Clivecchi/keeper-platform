import { describe, expect, it } from 'vitest';
import {
  anonymousKeyLostWriteAccess,
  assessAnonymousClaimResponse,
} from './anonymousClaimContract.js';

const kept = {
  success: true,
  data: {
    id: 'moment-1',
    title: 'Diagnostics anonymous draft',
    body: 'kept text',
    status: 'kept',
    keptAt: '2026-10-08T22:00:00.000Z',
    domain: { id: 'domain-1', name: 'KE3P', slug: 'ke3p' },
  },
};

describe('anonymous claim contract', () => {
  it('accepts a kept Moment on the same Domain without ownerId', () => {
    expect(assessAnonymousClaimResponse({
      httpOk: true,
      body: kept,
      draftId: 'moment-1',
      domainSlug: 'ke3p',
    })).toEqual({ ok: true });
  });

  it('rejects a response that omits the kept state or changes Domain', () => {
    expect(assessAnonymousClaimResponse({
      httpOk: true,
      body: { data: { id: 'moment-1', status: 'draft', keptAt: null, domain: { slug: 'ke3p' } } },
      draftId: 'moment-1',
      domainSlug: 'ke3p',
    }).ok).toBe(false);
    expect(assessAnonymousClaimResponse({
      httpOk: true,
      body: kept,
      draftId: 'moment-1',
      domainSlug: 'other',
    }).reason).toMatch(/Domain/);
  });

  it('treats a refused anonymous write as lost access', () => {
    expect(anonymousKeyLostWriteAccess(403)).toBe(true);
    expect(anonymousKeyLostWriteAccess(200)).toBe(false);
  });
});
