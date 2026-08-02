import { describe, expect, it, vi } from 'vitest';
import { isChronicleEventType } from '@keeper/shared';

vi.mock('@keeper/database', () => ({
  prisma: {},
}));

import {
  buildSessionTurnMeta,
  deriveSessionCloseMeta,
  groupChronicleEvents,
  mapChronicleEventRow,
} from './chronicleEvents.js';

describe('buildSessionTurnMeta', () => {
  it('prefers close-out meta when present', () => {
    expect(
      buildSessionTurnMeta({
        actor: 'Kip',
        userMessage: 'hello',
        replyText: 'unused reply text for this path.',
        closeMeta: { title: 'Named the Dialog turn', summary: 'Kip named the Dialog turn.' },
      }),
    ).toEqual({
      title: 'Named the Dialog turn',
      summary: 'Kip named the Dialog turn.',
    });
  });

  it('falls back to the reply first sentence for History rows', () => {
    const meta = buildSessionTurnMeta({
      actor: 'Kip',
      userMessage: 'What next?',
      replyText: 'Outlined the History write path for solo Dialog turns. More detail follows.',
    });
    expect(meta?.title).toContain('Outlined the History write path');
    expect(meta?.summary).toBeTruthy();
  });
});

describe('deriveSessionCloseMeta', () => {
  it('replaces an auto-generated Session with name', () => {
    const meta = deriveSessionCloseMeta({
      agentName: 'Kip',
      existingName: 'Session with Kip',
      replyText: 'Created a concise plan for the next Chronicle history milestone. The implementation can now proceed.',
    });

    expect(meta).toEqual({
      title: 'Created a concise plan for the next Chronicle history milestone',
      summary: 'Created a concise plan for the next Chronicle history milestone.',
    });
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
        title: 'Kip consulted the cast',
        summary: 'Kip consulted two cast members.',
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
      title: 'Point updated',
      summary: 'Kip updated a point.',
      anchor: null,
      parentEventId: null,
      createdAt: new Date('2026-07-31T00:00:00.000Z'),
    });

    expect(event.eventType).toBe('moment');
    expect(isChronicleEventType(event.eventType)).toBe(true);
  });
});
