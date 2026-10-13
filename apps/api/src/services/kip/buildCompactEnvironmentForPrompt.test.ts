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

  it('keeps a stored slide body in the compact Stage reading', () => {
    const compact = buildCompactEnvironmentForPrompt({
      version: 'env-v1',
      keeperStage: {
        slug: 'keeper',
        title: 'Keeper',
        presences: [],
        story: {
          slides: [
            { id: 'slide-1', kind: 'beat', title: 'Bring Something Unfinished', body: 'An unfinished thing is the start.' },
          ],
        },
      },
    });
    expect(compact?.keeperStage?.story?.slides[0]).toMatchObject({
      id: 'slide-1',
      title: 'Bring Something Unfinished',
      body: 'An unfinished thing is the start.',
    });
  });
});
