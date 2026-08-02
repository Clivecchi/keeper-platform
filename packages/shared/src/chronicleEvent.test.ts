import { describe, expect, it } from 'vitest'
import {
  isChronicleEventType,
  resolveChroniclePanelBody,
  type ChronicleEvent,
  type ChronicleDocumentChip,
} from './chronicleEvent.js'

describe('chronicleEvent', () => {
  it('accepts the three event types', () => {
    expect(isChronicleEventType('session')).toBe(true)
    expect(isChronicleEventType('moment')).toBe(true)
    expect(isChronicleEventType('structural')).toBe(true)
    expect(isChronicleEventType('draft_waiting')).toBe(false)
  })

  it('shapes a grouped parent with children', () => {
    const parent: ChronicleEvent = {
      id: 'parent-1',
      dialogId: 'dialog-1',
      domainId: 'domain-1',
      actor: 'Kip',
      actorSlug: 'kip',
      eventType: 'session',
      title: 'Consulted the cast on orchestration',
      summary: 'Kip fanned the turn to Cloud, Rendr, and Ceox.',
      timestamp: '2026-07-30T21:00:00.000Z',
      parentEventId: null,
      children: [
        {
          id: 'child-1',
          dialogId: 'dialog-1',
          domainId: 'domain-1',
          actor: 'Ceox',
          actorSlug: 'ceox',
          eventType: 'session',
          title: 'Named the cast honesty gap',
          summary: 'Flagged deselected agents responding out of turn.',
          timestamp: '2026-07-30T21:01:00.000Z',
          parentEventId: 'parent-1',
        },
      ],
    }
    expect(parent.children?.[0]?.parentEventId).toBe(parent.id)
  })

  it('keeps Document and History distinct when a Dialog is active even if a Realm feed exists', () => {
    expect(
      resolveChroniclePanelBody({
        dialogActive: true,
        panelMode: 'document',
        hasUserFeedContent: true,
      }),
    ).toBe('document')
    expect(
      resolveChroniclePanelBody({
        dialogActive: true,
        panelMode: 'history',
        hasUserFeedContent: true,
      }),
    ).toBe('history')
    expect(
      resolveChroniclePanelBody({
        dialogActive: false,
        panelMode: 'document',
        hasUserFeedContent: true,
      }),
    ).toBe('userFeed')
  })

  it('shapes an in-stream document chip with anchor breadcrumb', () => {
    const chip: ChronicleDocumentChip = {
      type: 'chronicle_update',
      title: 'Kip added to Becoming Together',
      dialogId: 'dialog-1',
      dialogTitle: 'Becoming Together',
      actor: 'Kip',
      anchor: {
        dialogId: 'dialog-1',
        manuscriptDraftId: 'draft-1',
        pointId: 'point-1',
        entityKind: 'point',
        breadcrumb: ['Becoming Together', 'Chapter 2', 'new paragraph'],
      },
    }
    expect(chip.anchor.pointId).toBe('point-1')
    expect(chip.anchor.breadcrumb?.join(' › ')).toContain('Chapter 2')
  })
})
