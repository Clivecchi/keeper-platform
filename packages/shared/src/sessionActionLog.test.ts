import { describe, expect, it } from 'vitest';
import {
  buildSessionActionLogPrompt,
  collectSessionActionLogLines,
  sessionActionReceiptLabel,
} from './sessionActionLog.js';

describe('sessionActionReceiptLabel', () => {
  it('names a proposed Point from prelude', () => {
    expect(
      sessionActionReceiptLabel({
        type: 'draft.update.propose',
        status: 'success',
        data: { point: { prelude: 'The agent cannot audit itself', content: 'No session log.' } },
      }),
    ).toBe('The agent cannot audit itself');
  });

  it('flags a refused duplicate', () => {
    expect(
      sessionActionReceiptLabel({
        type: 'draft.update.propose',
        status: 'success',
        data: { duplicate: true, point: { prelude: 'Same again' } },
      }),
    ).toBe('already on Document — did not add twice');
  });
});

describe('collectSessionActionLogLines', () => {
  it('skips user messages and orders receipts chronologically', () => {
    const lines = collectSessionActionLogLines([
      {
        sender: 'user',
        created_at: new Date('2026-08-26T21:17:00.000Z'),
        metadata: { actionResults: [{ type: 'ignored', status: 'success' }] },
      },
      {
        sender: 'agent',
        created_at: new Date('2026-08-26T21:23:00.000Z'),
        metadata: {
          actionResults: [
            {
              type: 'draft.update.propose',
              status: 'success',
              data: { point: { prelude: 'The agent cannot audit itself' } },
            },
          ],
        },
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('2026-08-26 21:23:00 UTC');
    expect(lines[0]).toContain('draft.update.propose');
    expect(lines[0]).toContain('The agent cannot audit itself');
  });
});

describe('buildSessionActionLogPrompt', () => {
  it('says so when nothing has run', () => {
    const prompt = buildSessionActionLogPrompt([]);
    expect(prompt).toContain('No actions have receipts in this session yet.');
    expect(prompt).toContain('Narration is not evidence');
  });
});
