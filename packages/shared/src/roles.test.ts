import { describe, expect, it } from 'vitest';
import {
  CUSTOM_DOMAIN_ROLES_ENABLED,
  OWNER_ROLE_INFO,
  ROLE_MAP,
  ROLE_OPTIONS,
  isDomainRole,
  permissionsForDomainRole,
} from './roles.js';

describe('domain roles', () => {
  it('labels the stored user key as Member and keeps Owner display-only', () => {
    expect(ROLE_MAP.user.label).toBe('Member');
    expect(OWNER_ROLE_INFO.label).toBe('Owner');
    expect(ROLE_OPTIONS.map((option) => option.value)).toEqual([
      'admin',
      'user',
      'friend',
      'connection',
    ]);
    expect(CUSTOM_DOMAIN_ROLES_ENABLED).toBe(false);
  });

  it('returns the permission bundle for each relationship', () => {
    expect(permissionsForDomainRole('connection')).toEqual(['read']);
    expect(permissionsForDomainRole('friend')).toEqual(['read', 'write']);
    expect(permissionsForDomainRole('user')).toEqual(['read', 'write', 'share']);
    expect(permissionsForDomainRole('admin')).toEqual([
      'read',
      'write',
      'share',
      'admin',
      'invite',
      'delete',
    ]);
    expect(permissionsForDomainRole('unknown')).toEqual(['read']);
    expect(isDomainRole('admin')).toBe(true);
    expect(isDomainRole('owner')).toBe(false);
  });
});
