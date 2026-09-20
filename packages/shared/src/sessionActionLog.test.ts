import { describe, expect, it } from 'vitest';
import {
  buildSessionActionLogPrompt,
  collectSessionActionLogLines,
  collectWebSearchEvidenceLines,
  extractWebSearchReceiptResults,
  resolveEphemeralSessionAccess,
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

  it('names web.search titles so agents can answer what came back', () => {
    const label = sessionActionReceiptLabel({
      type: 'web.search',
      status: 'success',
      message: 'Found 3 web results for query',
      data: {
        query: 'JEV TypeSafe',
        results: [
          { title: 'Jev on typed decisions', url: 'https://example.com/jev', snippet: 'A note.' },
          { title: 'TypeSafe intro', url: 'https://example.com/ts' },
        ],
      },
    });
    expect(label).toContain('Found 3 web results');
    expect(label).toContain('Jev on typed decisions');
  });
});

describe('extractWebSearchReceiptResults', () => {
  it('keeps titled rows and drops empties', () => {
    expect(
      extractWebSearchReceiptResults({
        results: [
          { title: 'One', url: 'https://a.example', snippet: 'Hello' },
          { title: '', url: '' },
          { url: 'https://b.example' },
        ],
      }),
    ).toEqual([
      { title: 'One', url: 'https://a.example', snippet: 'Hello' },
      { title: 'Result', url: 'https://b.example', snippet: '' },
    ]);
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

describe('collectWebSearchEvidenceLines', () => {
  it('lists titles and URLs for a successful search', () => {
    const lines = collectWebSearchEvidenceLines([
      {
        sender: 'agent',
        created_at: new Date('2026-09-20T23:29:00.000Z'),
        metadata: {
          actionResults: [
            {
              type: 'web.search',
              status: 'success',
              message: 'Found 3 web results for query',
              data: {
                query: 'JEV X',
                results: [
                  { title: 'Post A', url: 'https://example.com/a', snippet: 'Talks JEV.' },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(lines[0]).toContain('JEV X');
    expect(lines[1]).toContain('Post A');
    expect(lines[1]).toContain('https://example.com/a');
    expect(lines[2]).toContain('Talks JEV');
  });
});

describe('buildSessionActionLogPrompt', () => {
  it('says so when nothing has run, without denying a visible receipt', () => {
    const prompt = buildSessionActionLogPrompt([]);
    expect(prompt).toContain('No actions have receipts in this session yet.');
    expect(prompt).toContain('Narration is not evidence');
    expect(prompt).toContain('Do not deny a receipt the human can see');
  });

  it('includes web search evidence when a search ran', () => {
    const prompt = buildSessionActionLogPrompt([
      {
        sender: 'agent',
        created_at: new Date('2026-09-20T23:29:00.000Z'),
        metadata: {
          actionResults: [
            {
              type: 'web.search',
              status: 'success',
              message: 'Found 3 web results for query',
              data: {
                query: 'JEV',
                results: [{ title: 'Jev note', url: 'https://example.com/jev' }],
              },
            },
          ],
        },
      },
    ]);
    expect(prompt).toContain('web.search');
    expect(prompt).toContain('Never say a search or evaluation did not run');
    expect(prompt).toContain('Jev note');
    expect(prompt).toContain('https://example.com/jev');
  });
});

describe('resolveEphemeralSessionAccess', () => {
  it('reads the Dialog session and never writes when ephemeral', () => {
    expect(
      resolveEphemeralSessionAccess({ ephemeral: true, sessionId: 'sess-dialog' }),
    ).toEqual({ loadSessionId: 'sess-dialog', persistSessionId: null });
  });

  it('reads and writes the same session on a normal turn', () => {
    expect(
      resolveEphemeralSessionAccess({ ephemeral: false, sessionId: 'sess-dialog' }),
    ).toEqual({ loadSessionId: 'sess-dialog', persistSessionId: 'sess-dialog' });
  });

  it('creates nothing when ephemeral and no session was passed', () => {
    expect(resolveEphemeralSessionAccess({ ephemeral: true })).toEqual({
      loadSessionId: null,
      persistSessionId: null,
    });
  });
});
