import { describe, expect, it } from 'vitest';
import {
  isChatterTitleSource,
  isDialogNavTitleSource,
  isDocumentBearingDialogTitleSource,
} from './dialogTitleSource.js';

describe('dialog title_source', () => {
  it('treats auto_generated as Chatter', () => {
    expect(isChatterTitleSource('auto_generated')).toBe(true);
    expect(isDialogNavTitleSource('auto_generated')).toBe(false);
    expect(isDocumentBearingDialogTitleSource('auto_generated')).toBe(false);
  });

  it('keeps system_promoted in Dialog Nav but not as a Document shell', () => {
    expect(isChatterTitleSource('system_promoted')).toBe(false);
    expect(isDialogNavTitleSource('system_promoted')).toBe(true);
    expect(isDocumentBearingDialogTitleSource('system_promoted')).toBe(false);
  });

  it('opens Document Chronicle only for human-named Dialogs', () => {
    expect(isDocumentBearingDialogTitleSource('user_set')).toBe(true);
    expect(isDialogNavTitleSource('user_set')).toBe(true);
    expect(isChatterTitleSource('user_set')).toBe(false);
  });
});
