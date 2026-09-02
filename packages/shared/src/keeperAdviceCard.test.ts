import { describe, expect, it } from 'vitest';
import {
  extractKeeperAdviceCardFromRunResult,
  formatKeeperAdviceCardForPrompt,
  hasDeliveredKeeperAdvice,
  isAdviseOnlySkip,
  parseKeeperAdviceCard,
  withoutAdviseOnlySkips,
} from './keeperAdviceCard.js';

const reportCard = {
  type: 'summary',
  title: 'Keeping Judgment Contract — Architectural Report',
  body: 'Current truth → Gap analysis.',
  items: [
    '**A. Keeping Judgment — Proposed Contract**\n\nForm before capability.',
    '**B. Current Primitives**\n\nProposal/accept already exists.',
  ],
};

describe('parseKeeperAdviceCard', () => {
  it('requires type and title', () => {
    expect(parseKeeperAdviceCard(null)).toBeNull();
    expect(parseKeeperAdviceCard({ type: 'summary' })).toBeNull();
    expect(parseKeeperAdviceCard(reportCard)?.title).toBe(reportCard.title);
    expect(parseKeeperAdviceCard(reportCard)?.items).toHaveLength(2);
  });
});

describe('extractKeeperAdviceCardFromRunResult', () => {
  it('walks the System/Kip run envelope', () => {
    expect(
      extractKeeperAdviceCardFromRunResult({
        success: true,
        data: {
          action: 'system_interaction',
          data: {
            response: 'Let me give you the architectural report.',
            card: reportCard,
            actions: [
              {
                type: 'stage.story.layout',
                status: 'skipped',
                message: 'Skipped — Cast advises only.',
              },
            ],
          },
        },
      }),
    ).toEqual(reportCard);
  });
});

describe('hasDeliveredKeeperAdvice', () => {
  it('treats a card as delivered even when prose is only an intro', () => {
    expect(
      hasDeliveredKeeperAdvice({
        reply: 'Let me give you the architectural report.',
        card: reportCard,
      }),
    ).toBe(true);
  });

  it('treats a reply without a card as delivered prose', () => {
    expect(hasDeliveredKeeperAdvice({ reply: 'Here is the analysis.', card: null })).toBe(true);
    expect(hasDeliveredKeeperAdvice({ reply: '  ', card: null })).toBe(false);
  });
});

describe('formatKeeperAdviceCardForPrompt', () => {
  it('includes title and items so Lead synthesis can see the artifact', () => {
    const text = formatKeeperAdviceCardForPrompt(reportCard);
    expect(text).toContain('Keeping Judgment Contract — Architectural Report');
    expect(text).toContain('Form before capability');
  });
});

describe('advise-only skips', () => {
  it('does not treat Cast-advise skips as a failed turn', () => {
    const skipped = {
      type: 'stage.story.layout',
      status: 'skipped',
      message:
        'Skipped — Cast advises only. The Lead writes Points with draft.update.propose (payload.section when they named a Section). Not reorganize. Not Stage layout. Not Accept.',
    };
    expect(isAdviseOnlySkip(skipped)).toBe(true);
    expect(withoutAdviseOnlySkips([skipped])).toEqual([]);
  });
});
