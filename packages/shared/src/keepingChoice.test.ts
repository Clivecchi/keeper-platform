import { describe, expect, it } from 'vitest';
import {
  applyKeepingChoiceSelection,
  canExerciseKeepingChoice,
  extractKeepingChoicesFromRunResult,
  isKeepingChoiceSelected,
  KEEPING_CHOICE_STORY_BUILDER_RULE,
  parseKeepingChoiceOffers,
  parseKeepingChoiceRecords,
  stampKeepingChoiceRecords,
  type KeepingChoiceSource,
} from './keepingChoice.js';

const source: KeepingChoiceSource = {
  messageId: 'msg-1',
  sessionId: 'sess-1',
  dialogId: 'dialog-1',
  actor: 'Kip',
  offeredAt: '2026-09-02T00:00:00.000Z',
};

describe('parseKeepingChoiceOffers', () => {
  it('keeps Local Stores-style offers and ignores kind', () => {
    const offers = parseKeepingChoiceOffers([
      {
        id: 'consequence',
        label: 'Keep this consequence',
        direction: 'Preserve this architectural consequence if it still holds.',
        meaning: 'Stage must not force mutation.',
        kind: 'ArchitecturalConsequence',
      },
      {
        label: 'Develop Local Stores',
        direction: 'Develop Local Stores as a Story if that still fits current Keeper truth.',
        about: 'Local Stores',
      },
      { label: 'Missing direction' },
    ]);
    expect(offers).toHaveLength(2);
    expect(offers[0]?.label).toBe('Keep this consequence');
    expect(offers[1]?.about).toBe('Local Stores');
    expect((offers[0] as { kind?: string }).kind).toBeUndefined();
  });

  it('caps at 6 and does not create objects', () => {
    const offers = parseKeepingChoiceOffers(
      Array.from({ length: 8 }, (_, index) => ({
        label: `Choice ${index + 1}`,
        direction: `Direction ${index + 1}`,
      })),
    );
    expect(offers).toHaveLength(6);
  });
});

describe('single-selection', () => {
  it('selecting A disables A and leaves B available', () => {
    const records = stampKeepingChoiceRecords(
      [
        { label: 'Keep this consequence', direction: 'Preserve the consequence.' },
        { label: 'Develop Local Stores', direction: 'Develop Local Stores as a Story.' },
      ],
      source,
      (() => {
        let n = 0;
        return () => `choice-${++n}`;
      })(),
    );
    expect(records).toHaveLength(2);
    expect(records.every((row) => canExerciseKeepingChoice(row))).toBe(true);

    const first = applyKeepingChoiceSelection(records, 'choice-1', {
      selectedAt: '2026-09-02T01:00:00.000Z',
      resultingUserMessageId: 'user-1',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(isKeepingChoiceSelected(first.records[0])).toBe(true);
    expect(canExerciseKeepingChoice(first.records[0])).toBe(false);
    expect(canExerciseKeepingChoice(first.records[1])).toBe(true);

    const replay = applyKeepingChoiceSelection(first.records, 'choice-1', {
      selectedAt: '2026-09-02T01:05:00.000Z',
      resultingUserMessageId: 'user-2',
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.reason).toBe('already_selected');
    expect(replay.records[0]?.selections).toHaveLength(1);

    const second = applyKeepingChoiceSelection(first.records, 'choice-2', {
      selectedAt: '2026-09-02T01:10:00.000Z',
      resultingUserMessageId: 'user-3',
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(isKeepingChoiceSelected(second.records[1])).toBe(true);
    expect(second.records[0]?.selections).toHaveLength(1);
  });

  it('reload from persisted metadata keeps A Selected and B available', () => {
    const records = stampKeepingChoiceRecords(
      [
        { label: 'Keep this consequence', direction: 'Preserve the consequence.' },
        { label: 'Develop Local Stores', direction: 'Develop Local Stores as a Story.' },
      ],
      source,
      (() => {
        let n = 0;
        return () => `choice-${++n}`;
      })(),
    );
    const selected = applyKeepingChoiceSelection(records, 'choice-1', {
      selectedAt: '2026-09-02T01:00:00.000Z',
      resultingUserMessageId: 'user-1',
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;

    const hydrated = parseKeepingChoiceRecords(JSON.parse(JSON.stringify(selected.records)));
    expect(hydrated).toHaveLength(2);
    expect(isKeepingChoiceSelected(hydrated[0]!)).toBe(true);
    expect(canExerciseKeepingChoice(hydrated[0]!)).toBe(false);
    expect(canExerciseKeepingChoice(hydrated[1]!)).toBe(true);
    expect(hydrated[0]?.selections[0]?.resultingUserMessageId).toBe('user-1');
  });
});

describe('offer creates no Keeper object', () => {
  it('stamped offers are metadata only — no kind, draft, or entity', () => {
    const records = stampKeepingChoiceRecords(
      [
        {
          label: 'Keep this consequence',
          direction: 'Preserve the consequence.',
          meaning: 'Stage must not force mutation.',
        },
        { label: 'Develop Local Stores', direction: 'Develop Local Stores as a Story.' },
      ],
      source,
      () => 'choice-offer',
    );
    expect(records[0]?.selections).toEqual([]);
    for (const row of records) {
      expect(row).not.toHaveProperty('kind');
      expect(row).not.toHaveProperty('entityId');
      expect(row).not.toHaveProperty('draftId');
      expect(row.refs).toBeUndefined();
    }
  });
});

describe('story-builder coexistence rule', () => {
  it('keeps directed acts on existing action/proposal paths', () => {
    expect(KEEPING_CHOICE_STORY_BUILDER_RULE).toContain('authorized action or proposal');
    expect(KEEPING_CHOICE_STORY_BUILDER_RULE).toContain('Do not substitute keepingChoices for that act');
    expect(KEEPING_CHOICE_STORY_BUILDER_RULE).toContain('Do not create or stage those meanings this turn');
    expect(KEEPING_CHOICE_STORY_BUILDER_RULE).toContain('each choice is independently selectable once');
  });
});

describe('extractKeepingChoicesFromRunResult', () => {
  it('walks the run envelope for stamped records', () => {
    const records = stampKeepingChoiceRecords(
      [{ label: 'Keep this consequence', direction: 'Preserve the consequence.' }],
      source,
      () => 'choice-1',
    );
    expect(
      extractKeepingChoicesFromRunResult({
        success: true,
        data: { data: { response: 'I see two meanings.', keepingChoices: records } },
      }),
    ).toEqual(records);
  });
});
