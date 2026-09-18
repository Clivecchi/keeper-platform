import { describe, expect, it } from 'vitest';
import { dialogVisibleToUserOr } from './dialogVisibility.js';

describe('dialogVisibleToUserOr', () => {
  it('includes member without granting guest Dialog persistence', () => {
    const clauses = dialogVisibleToUserOr('user-1');
    expect(clauses).toEqual([
      { available_to: { has: 'admin' } },
      { available_to: { has: 'member' } },
      { user_id: 'user-1', available_to: { has: 'keeper' } },
    ]);
    expect(JSON.stringify(clauses)).not.toContain('guest');
  });
});
