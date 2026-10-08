import { describe, expect, it } from 'vitest';
import { dialogAudienceWhere, dialogVisibleToUserWhere } from './dialogVisibility.js';

describe('dialog audience', () => {
  it('keeps a keeper Dialog with its user and hides it when no user is present', () => {
    expect(dialogAudienceWhere('chuck')).toEqual(dialogVisibleToUserWhere('chuck'));
    const anonymous = dialogAudienceWhere(null);
    expect(JSON.stringify(anonymous)).not.toContain('keeper');
    expect(JSON.stringify(anonymous)).toContain('admin');
    expect(JSON.stringify(anonymous)).toContain('member');
  });
});
