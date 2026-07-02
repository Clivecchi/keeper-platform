import { describe, expect, it } from 'vitest';
import {
  filterContentByAudience,
  isContentVisibleToAudience,
} from './filterContentByAudience.js';

describe('filterContentByAudience', () => {
  const items = [
    { id: '1', presenceSchema: { realmVisibility: 'public' } },
    { id: '2', presenceSchema: { realmVisibility: 'friends' } },
    { id: '3', presenceSchema: { realmVisibility: 'owner' } },
    { id: '4', presenceSchema: null },
  ];

  it('shows public and unset for guest', () => {
    const visible = filterContentByAudience(items, 'guest');
    expect(visible.map((i) => i.id)).toEqual(['1', '4']);
  });

  it('includes friends tier for friend audience', () => {
    const visible = filterContentByAudience(items, 'friend');
    expect(visible.map((i) => i.id)).toEqual(['1', '2', '4']);
  });

  it('includes owner tier for keeper and admin', () => {
    expect(filterContentByAudience(items, 'keeper').map((i) => i.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(isContentVisibleToAudience({ realmVisibility: 'owner' }, 'friend')).toBe(false);
    expect(isContentVisibleToAudience({ realmVisibility: 'owner' }, 'admin')).toBe(true);
  });
});
