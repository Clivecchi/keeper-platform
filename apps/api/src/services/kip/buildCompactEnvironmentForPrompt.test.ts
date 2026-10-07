import { describe, expect, it } from 'vitest';
import { buildCompactEnvironmentForPrompt } from './buildCompactEnvironmentForPrompt.js';

describe('buildCompactEnvironmentForPrompt', () => {
  it('does not preload Domain titles or the draft directory', () => {
    const compact = buildCompactEnvironmentForPrompt({
      version: 'env-v1',
      draftsDirectory: [{ id: 'd1', title: 'Hidden draft', kind: 'draft', status: 'draft', updatedAt: '2026-10-06' }],
      domainIndex: {
        keepers: [{ id: 'k1', title: 'Hidden keeper' }],
        dialogs: [{ id: 'dlg', title: 'Hidden dialog', titleSource: 'user_set', documentStatus: 'drafts', updatedAt: '2026-10-06' }],
      },
      activeDraft: { id: 'focus', kind: 'draft', key: 'focus', title: 'In focus', status: 'draft', updatedAt: '2026-10-06' },
    });
    expect(compact?.draftsDirectory).toBeUndefined();
    expect(compact?.domainIndex).toBeUndefined();
    expect(compact?.activeDraft?.title).toBe('In focus');
    expect(JSON.stringify(compact)).not.toMatch(/Hidden draft|Hidden keeper|Hidden dialog/);
  });
});
