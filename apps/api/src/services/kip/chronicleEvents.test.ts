import { describe, expect, it, vi } from 'vitest';
import { isChronicleEventType } from '@keeper/shared';

vi.mock('@keeper/database', () => ({
  prisma: {},
}));

import {
  buildConsultChapterMeta,
  buildKeptChronicleMeta,
  buildSessionChapterMeta,
  deriveSessionCloseMeta,
  firstTakeaway,
  groupChronicleEvents,
  mapChronicleEventRow,
} from './chronicleEvents.js';

describe('firstTakeaway', () => {
  it('returns the first sentence capped for History scan', () => {
    expect(
      firstTakeaway(
        'Outlined the MCP auth boundary for domain keys. Then a long novel about everything else that happened in the room.',
        56,
      ),
    ).toBe('Outlined the MCP auth boundary for domain keys');
  });
});

describe('buildSessionChapterMeta', () => {
  it('prefers close-out meta when present', () => {
    expect(
      buildSessionChapterMeta({
        actor: 'Kip',
        userMessage: 'hello',
        replyText: 'unused reply text for this path.',
        closeMeta: { title: 'MCP auth boundary', summary: 'Kip clarified domain-scoped keys.' },
      }),
    ).toEqual({
      title: 'MCP auth boundary',
      summary: 'Kip clarified domain-scoped keys.',
    });
  });

  it('prefers the user topic cue over a long reply', () => {
    const meta = buildSessionChapterMeta({
      actor: 'Kip',
      userMessage: 'Let us settle MCP URL and OAuth scoping',
      replyText:
        'Outlined the History write path for solo Dialog turns and then continued with a very long explanation that should not become the title.',
    });
    expect(meta?.title).toContain('MCP URL');
    expect((meta?.summary ?? '').length).toBeLessThanOrEqual(120);
  });
});

describe('buildKeptChronicleMeta', () => {
  it('writes short Kept rows for accept and skips propose noise', () => {
    expect(
      buildKeptChronicleMeta({
        actionType: 'draft.point.accept',
        actor: 'Ceox',
        draftTitle: 'Becoming Together - manuscript',
        message: 'Proposed decision — tap Accept to keep it. Extra prose that must not flood History.',
      }),
    ).toEqual({
      eventType: 'moment',
      title: 'Kept in Document',
      summary: 'Proposed decision — tap Accept to keep it',
    });

    expect(
      buildKeptChronicleMeta({
        actionType: 'draft.update.propose',
        actor: 'Ceox',
        draftTitle: 'Becoming Together - manuscript',
        message: 'Proposed something',
      }),
    ).toBeNull();

    expect(
      buildKeptChronicleMeta({
        actionType: 'draft.point.promote',
        actor: 'Kip',
        draftTitle: 'Manuscript',
        message: 'Kept the identity Moment.',
      })?.title,
    ).toBe('Promoted to Moment');
  });
});

describe('buildConsultChapterMeta', () => {
  it('lists consulted actors instead of dumping replies', () => {
    expect(
      buildConsultChapterMeta({
        userMessage: 'Can Cloud and Rendr weigh in on the cast strip?',
        consultedActors: ['Cloud', 'Rendr'],
      }),
    ).toEqual({
      title: 'Can Cloud and Rendr weigh in on the cast strip',
      summary: 'Consulted Cloud, Rendr.',
    });
  });
});

describe('deriveSessionCloseMeta', () => {
  it('names an auto-generated Session with a topic cue', () => {
    const meta = deriveSessionCloseMeta({
      agentName: 'Kip',
      existingName: 'Session with Kip',
      userMessage: 'Chronicle history milestone plan',
      replyText: 'Created a concise plan for the next Chronicle history milestone. The implementation can now proceed.',
    });

    expect(meta?.title).toBe('Chronicle history milestone plan');
    expect((meta?.summary ?? '').length).toBeLessThanOrEqual(120);
  });

  it('does not overwrite an authored name', () => {
    expect(
      deriveSessionCloseMeta({
        agentName: 'Kip',
        existingName: 'Chronicle API design',
        replyText: 'Created a plan.',
      }),
    ).toBeNull();
  });
});

describe('Chronicle event mapping', () => {
  it('groups children beneath their parent', () => {
    const createdAt = new Date('2026-07-31T00:00:00.000Z');
    const events = groupChronicleEvents([
      {
        id: 'parent',
        dialogId: 'dialog-1',
        domainId: 'domain-1',
        actor: 'Kip',
        actorSlug: 'kip',
        eventType: 'session',
        title: 'Cast strip consult',
        summary: 'Consulted Cloud, Rendr.',
        anchor: null,
        parentEventId: null,
        createdAt,
      },
      {
        id: 'child',
        dialogId: 'dialog-1',
        domainId: 'domain-1',
        actor: 'Cloud',
        actorSlug: 'cloud',
        eventType: 'session',
        title: 'Cloud consulted',
        summary: 'Cloud returned an operational note.',
        anchor: null,
        parentEventId: 'parent',
        createdAt,
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.children?.map((event) => event.id)).toEqual(['child']);
  });

  it('uses a valid shared Chronicle event type when mapping rows', () => {
    const event = mapChronicleEventRow({
      id: 'event-1',
      dialogId: 'dialog-1',
      domainId: 'domain-1',
      actor: 'Kip',
      actorSlug: 'kip',
      eventType: 'moment',
      title: 'Kept in Document',
      summary: 'Kip accepted a Point.',
      anchor: null,
      parentEventId: null,
      createdAt: new Date('2026-07-31T00:00:00.000Z'),
    });

    expect(event.eventType).toBe('moment');
    expect(isChronicleEventType(event.eventType)).toBe(true);
  });
});
