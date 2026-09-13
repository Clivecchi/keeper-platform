import { describe, expect, it } from 'vitest';
import { isLeadAgentRole } from './agentRole.js';

describe('isLeadAgentRole', () => {
  it('treats Lead as a class role, not a slug', () => {
    expect(isLeadAgentRole('Lead')).toBe(true);
    expect(isLeadAgentRole('lead')).toBe(true);
    expect(isLeadAgentRole(' Standard ')).toBe(false);
    expect(isLeadAgentRole(null)).toBe(false);
  });

  it('does not infer Lead from Kip identity', () => {
    expect(isLeadAgentRole('kip')).toBe(false);
    expect(isLeadAgentRole('Kip')).toBe(false);
  });
});
