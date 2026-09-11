import { describe, expect, it } from 'vitest';
import {
  applyKeepingChoiceSelection,
  buildKeepingChoiceExercisePrompt,
  canExerciseKeepingChoice,
  extractKeepingChoicesFromRunResult,
  formatKeepingChoiceLeadInput,
  isKeepingChoiceSelected,
  KEEPING_CHOICE_STORY_BUILDER_RULE,
  parseKeepingChoiceOffers,
  parseKeepingChoiceRecords,
  stampKeepingChoiceRecords,
  type KeepingChoiceExercise,
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

describe('keeping-choice exercise contract', () => {
  const exercise: KeepingChoiceExercise = {
    choiceId: 'choice-cast',
    sourceMessageId: 'msg-offer',
    label: 'Keep the Casting principle',
    direction: 'Hold this as a Stage / Casting principle if it still holds.',
    meaning: 'Role is not authority.',
    about: 'Casting',
    source: {
      ...source,
      messageId: 'msg-offer',
    },
  };

  it('lead input experiences and understands without a pull-to-act', () => {
    const input = formatKeepingChoiceLeadInput(exercise);
    expect(input).toContain('Experience it. Understand it.');
    expect(input).toContain('Re-evaluate against current Keeper truth.');
    expect(input).toContain('Do not treat this selection as an order to write.');
    expect(input).not.toContain('keep it appropriately');
    expect(input).toContain('Label: Keep the Casting principle');
    expect(input).toContain('Direction: Hold this as a Stage / Casting principle if it still holds.');
  });

  it('exercise prompt makes both judgments available without requiring recitation', () => {
    const prompt = buildKeepingChoiceExercisePrompt(exercise);
    expect(prompt).toContain('Experience this selection. Understand it.');
    expect(prompt).toContain('independently, be capable of Keeping Judgment and Learning Judgment');
    expect(prompt).toContain('Do not enumerate them unless the case is not obvious');
    expect(prompt).toContain('Quiet when obvious');
    expect(prompt).toContain('Neither judgment requires an action');
    expect(prompt).toContain('Determine the Form sufficiently to keep well');
    expect(prompt).toContain('no adequate Form has yet emerged');
    expect(prompt).toContain('No additional keeping is a competent outcome');
    expect(prompt).toContain('Naming a Kind is optional');
    expect(prompt).toContain('The source is not learning');
    expect(prompt).toContain('Agent-specific learning, or no learning, are both competent');
    expect(prompt).toContain('Do not sole.save the source');
    expect(prompt).toContain('the judgment has failed');
    expect(prompt).toContain('Act, Propose, Advise, Notice, or Leave As-Is');
    expect(prompt).toContain('Do not sole.save merely because a choice was selected');
    expect(prompt).not.toContain('keep it appropriately');
    expect(prompt).not.toContain('name the Form');
    expect(prompt).not.toContain('name the Kind');
    expect(prompt).not.toMatch(/step\s+[1-7]/i);
    expect(prompt).not.toContain('keepingJudgment');
    expect(prompt).not.toContain('learningJudgment');
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
