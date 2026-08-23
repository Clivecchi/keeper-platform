import { describe, expect, it } from 'vitest';
import { detectReorganizeIntent } from '../services/kip/documentReorganizeIntent.js';

describe('detectReorganizeIntent', () => {
  it('hears review and reorganize', () => {
    expect(detectReorganizeIntent('Please review and reorganize Finding the Plot')).toBe(
      'required',
    );
    expect(detectReorganizeIntent('reorganize the document')).toBe('required');
    expect(detectReorganizeIntent('propose a better document')).toBe('required');
  });

  it('ignores ordinary Point asks', () => {
    expect(detectReorganizeIntent('add a point about the plot')).toBe('none');
    expect(detectReorganizeIntent('what is the point of this')).toBe('none');
  });
});
