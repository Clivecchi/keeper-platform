/**
 * DomainResolutionService unit tests — keeper.domains slug resolution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Domain } from '@prisma/client';
import { DomainResolutionService } from '@keeper/database';

function mockDomain(overrides: Partial<Domain> = {}): Domain {
  return {
    id: 'domain-1',
    name: 'Test Domain',
    slug: 'staging',
    ownerId: 'user-1',
    isActive: true,
    status: 'active',
    customDomain: null,
    customDomainVerified: false,
    settings: {},
    features: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    verificationToken: null,
    verificationMethod: null,
    verifiedAt: null,
    frame_json: null,
    tier: 'personal',
    tagline: null,
    ...overrides,
  } as Domain;
}

describe('DomainResolutionService', () => {
  const getDomainBySlug = vi.fn();
  const getDomainByHostname = vi.fn();
  const getDomainById = vi.fn();

  const domainService = {
    getDomainBySlug,
    getDomainByHostname,
    getDomainById,
  };

  const cacheService = {};

  let service: DomainResolutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    getDomainBySlug.mockReset();
    getDomainByHostname.mockReset();
    service = new DomainResolutionService(domainService as never, cacheService as never);
  });

  it('resolves {slug}.keeper.domains to Domain by slug', async () => {
    getDomainBySlug.mockResolvedValue(mockDomain());

    const result = await service.resolveDomain('staging.keeper.domains');

    expect(getDomainBySlug).toHaveBeenCalledWith('staging');
    expect(result.isValid).toBe(true);
    expect(result.resolutionMethod).toBe('slug');
    expect(result.domain?.slug).toBe('staging');
  });

  it('includes https://{slug}.keeper.domains in allowedOrigins', async () => {
    getDomainBySlug.mockResolvedValue(mockDomain({ slug: 'livecchi' }));

    const result = await service.resolveDomain('livecchi.keeper.domains');

    expect(result.allowedOrigins).toContain('https://livecchi.keeper.domains');
  });

  it('treats www.keeper.domains as platform fallback (no tenant Domain)', async () => {
    const result = await service.resolveDomain('www.keeper.domains');

    expect(getDomainBySlug).not.toHaveBeenCalled();
    expect(result.resolutionMethod).toBe('fallback');
    expect(result.domain).toBeNull();
  });

  it('treats ke3p.com as platform fallback', async () => {
    const result = await service.resolveDomain('ke3p.com');

    expect(getDomainBySlug).not.toHaveBeenCalled();
    expect(result.resolutionMethod).toBe('fallback');
    expect(result.domain).toBeNull();
  });

  it('returns not_found when slug has no Domain record', async () => {
    getDomainBySlug.mockResolvedValue(null);

    const result = await service.resolveDomain('missing.keeper.domains');

    expect(result.isValid).toBe(false);
    expect(result.resolutionMethod).toBe('not_found');
  });
});
