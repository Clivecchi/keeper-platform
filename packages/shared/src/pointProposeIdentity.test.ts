import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import {
  collapseDuplicateDraftProposeActions,
  findDuplicateHostPoint,
  isDuplicatePointIdentity,
  pointProposeIdentityFrom,
} from './pointProposeIdentity.js';

describe('isDuplicatePointIdentity', () => {
  it('matches identical content regardless of prelude', () => {
    expect(
      isDuplicatePointIdentity(
        pointProposeIdentityFrom({ prelude: 'A', content: 'The agent cannot audit itself.' }),
        pointProposeIdentityFrom({ prelude: 'B', content: 'The agent cannot audit itself.' }),
      ),
    ).toBe(true);
  });

  it('matches a distinctive title with the same opening body', () => {
    expect(
      isDuplicatePointIdentity(
        pointProposeIdentityFrom({
          prelude: 'The agent cannot audit itself',
          content: 'No session log, no action receipt history.',
        }),
        pointProposeIdentityFrom({
          prelude: 'The agent cannot audit itself',
          content: 'No session log, no action receipt history. You are holding the record.',
        }),
      ),
    ).toBe(true);
  });

  it('does not match short generic titles with different bodies', () => {
    expect(
      isDuplicatePointIdentity(
        pointProposeIdentityFrom({ prelude: 'Note', content: 'First finding.' }),
        pointProposeIdentityFrom({ prelude: 'Note', content: 'A completely different beat.' }),
      ),
    ).toBe(false);
  });

  it('does not match the same distinctive title with unrelated bodies', () => {
    expect(
      isDuplicatePointIdentity(
        pointProposeIdentityFrom({
          prelude: 'The agent cannot audit itself',
          content: 'No session log, no action receipt history.',
        }),
        pointProposeIdentityFrom({
          prelude: 'The agent cannot audit itself',
          content: 'Web search still fails when the query is live.',
        }),
      ),
    ).toBe(false);
  });
});

describe('findDuplicateHostPoint', () => {
  const existing = createDraftPoint({
    content: 'The agent cannot audit itself. No session log.',
    proposedBy: 'ceox',
    status: 'accepted',
    prelude: 'The agent cannot audit itself',
  });

  it('finds a host Point with the same title', () => {
    const found = findDuplicateHostPoint(
      [existing],
      pointProposeIdentityFrom({
        prelude: 'The agent cannot audit itself',
        content: 'The agent cannot audit itself. No session log.',
      }),
    );
    expect(found?.id).toBe(existing.id);
  });

  it('ignores Cast Notes', () => {
    const note = createDraftPoint({
      content: 'The agent cannot audit itself. No session log.',
      proposedBy: 'cloud',
      status: 'accepted',
      prelude: 'The agent cannot audit itself',
      referencesPointId: existing.id,
    });
    expect(
      findDuplicateHostPoint(
        [existing, note],
        pointProposeIdentityFrom({
          prelude: 'Something else entirely worth keeping',
          content: 'A different body about the stage.',
        }),
      ),
    ).toBeUndefined();
  });
});

describe('collapseDuplicateDraftProposeActions', () => {
  it('keeps the first of two identical proposes in one turn', () => {
    const actions = collapseDuplicateDraftProposeActions([
      {
        type: 'draft.update.propose',
        payload: {
          title: 'The agent cannot audit itself',
          content: 'No session log, no action receipt history.',
        },
      },
      {
        type: 'gloss.append',
        payload: { content: 'You are holding the record.' },
      },
      {
        type: 'draft.update.propose',
        payload: {
          title: 'The agent cannot audit itself',
          content: 'No session log, no action receipt history.',
        },
      },
    ]);
    expect(actions.map((action) => action.type)).toEqual([
      'draft.update.propose',
      'gloss.append',
    ]);
  });

  it('collapses the same body even when the titles differ', () => {
    const actions = collapseDuplicateDraftProposeActions([
      {
        type: 'draft.update.propose',
        payload: { title: 'A', content: 'The agent cannot audit itself.' },
      },
      {
        type: 'draft.update.propose',
        payload: { title: 'B', content: 'The agent cannot audit itself.' },
      },
    ]);
    expect(actions).toHaveLength(1);
  });
});
