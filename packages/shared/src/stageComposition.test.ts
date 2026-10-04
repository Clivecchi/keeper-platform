import { describe, expect, it } from 'vitest';
import type { RealmWhereWeAreReading } from './realmArrival.js';
import type { WhereWeAreReading } from './stageArrival.js';
import {
  composeStagePass,
  dropUnsourcedNodes,
  projectDomainWhereWeAre,
  projectRealmWhereWeAre,
  projectStoryPass,
  selectStageTruth,
  type StageComposition,
  type StageContext,
  type StageReading,
} from './stageComposition.js';

const adminRealm: StageContext = {
  scope: 'realm',
  audience: 'admin',
  arriving: true,
};

const adminDomain: StageContext = {
  scope: 'domain',
  domainId: 'ke3p-id',
  audience: 'admin',
  arriving: true,
};

const domainTruth: WhereWeAreReading = {
  places: [{ dialogId: 'dlg-1', title: 'Becoming Together' }],
  claims: [
    {
      kind: 'kept-orientation',
      dialogId: 'dlg-1',
      title: 'Becoming Together',
      provenance: { orientationUpdatedBy: 'Chuck Livecchi' },
    },
  ],
  trail: {
    stageBeatTitles: ['Root is not the story'],
    chatterTitles: [],
    history: [],
  },
};

const realmTruth: RealmWhereWeAreReading = {
  continuations: [
    {
      domainId: 'ke3p-id',
      domainSlug: 'ke3p',
      domainName: 'KE3P',
      reading: domainTruth,
    },
  ],
  face: { domainId: 'face-id', domainSlug: 'face', domainName: 'Face Domain' },
  trail: {
    stageBeats: [],
    draftForwards: [],
    chatter: [],
    history: [],
    feed: [],
  },
};

function citeIds(composition: StageComposition): string[] {
  const ids: string[] = []
  const walk = (nodes: StageComposition['nodes']) => {
    for (const node of nodes) {
      if (node.kind === 'cite' || node.kind === 'media') ids.push(node.readingId)
      else walk(node.children)
    }
  }
  walk(composition.nodes)
  return ids
}

describe('selectStageTruth', () => {
  it('sends an arriving admin to the scope reading, and everyone else to story', () => {
    expect(selectStageTruth(adminRealm)).toBe('realm-where-we-are')
    expect(selectStageTruth(adminDomain)).toBe('domain-where-we-are')
    expect(selectStageTruth({ ...adminRealm, arriving: false })).toBe('story')
    expect(selectStageTruth({ ...adminDomain, audience: 'keeper' })).toBe('story')
  })
})

describe('projectDomainWhereWeAre', () => {
  it('cites the dialog without leaving the room in the action', () => {
    const { reading, composition } = projectDomainWhereWeAre({
      context: adminDomain,
      truth: domainTruth,
    })
    const place = reading.items.find((item) => item.id === 'place:dlg-1')
    expect(place?.actions).toEqual([
      { kind: 'continue', subject: { kind: 'dialog', id: 'dlg-1' } },
    ])
    expect(place?.actions[0]?.nextContext).toBeUndefined()
    expect(reading.items.some((item) => item.text === 'Becoming Together has the kept Orientation.')).toBe(true)
    expect(reading.items.some((item) => item.text === 'On Stage: Root is not the story')).toBe(true)
    expect(citeIds(composition)).toContain('place:dlg-1')
    expect(composition.nodes.some((node) => node.kind === 'sequence')).toBe(false)
  })
})

describe('projectRealmWhereWeAre', () => {
  it('continues into the Domain pass and does not cite an anchor story', () => {
    const { reading, composition } = projectRealmWhereWeAre({
      context: adminRealm,
      truth: realmTruth,
    })
    const place = reading.items.find((item) => item.id === 'place:ke3p-id')
    expect(place?.text).toBe('KE3P')
    expect(place?.actions[0]?.nextContext).toEqual({
      scope: 'domain',
      domainId: 'ke3p-id',
      audience: 'admin',
      arriving: true,
    })
    expect(reading.items.some((item) => item.source.kind === 'stage-slide')).toBe(false)
    expect(reading.items.some((item) => item.text.startsWith('Face:'))).toBe(true)
    const face = reading.items.find((item) => item.id === 'trail:face:face-id')
    expect(face?.actions).toEqual([])
    expect(citeIds(composition)).toContain('place:ke3p-id')
  })
})

describe('projectStoryPass', () => {
  it('maps cover, stored beats, and a live frame onto one sequence', () => {
    const { reading, composition } = projectStoryPass({
      context: { ...adminDomain, arriving: false },
      domainId: 'ke3p-id',
      slides: [
        { id: 'root', title: 'KE3P', body: '', kind: 'root' },
        {
          id: 'beat-1',
          title: 'Kept',
          body: 'body',
          kind: 'beat',
          source: { kind: 'point', id: 'pt-1' },
        },
        {
          id: 'live-1',
          title: 'Frame',
          body: '',
          kind: 'beat',
          source: { kind: 'live', id: 'msg-9' },
          frameMessageId: 'msg-9',
        },
      ],
    })
    expect(reading.items.find((item) => item.id === 'root')?.lifecycle).toBe('derived')
    expect(reading.items.find((item) => item.id === 'slide:beat-1')?.lifecycle).toBe('stored')
    expect(reading.items.find((item) => item.id === 'frame:msg-9')?.lifecycle).toBe('live')
    const sequence = composition.nodes.find((node) => node.kind === 'sequence')
    expect(sequence?.kind).toBe('sequence')
    if (sequence?.kind !== 'sequence') return
    expect(sequence.children).toEqual([
      { kind: 'cite', readingId: 'root', emphasis: 'primary', present: 'cover' },
      { kind: 'cite', readingId: 'slide:beat-1', emphasis: 'primary', present: 'slide' },
      { kind: 'cite', readingId: 'frame:msg-9', emphasis: 'primary', present: 'frame' },
    ])
    expect(composition.nodes.some((node) => node.kind === 'media' && node.readingId === 'cover-plate')).toBe(true)
  })

  it('does not invent a cover when the pass has no domain', () => {
    const { reading, composition } = projectStoryPass({
      context: { scope: 'realm', audience: 'admin', arriving: false },
      slides: [{ id: 'root', title: 'Anchor', body: '', kind: 'root' }],
    })
    expect(reading.items).toEqual([])
    expect(composition.nodes).toEqual([])
  })
})

describe('dropUnsourcedNodes', () => {
  it('drops a cite whose reading id was not in the Reading', () => {
    const reading: StageReading = {
      context: adminDomain,
      items: [
        {
          id: 'place:dlg-1',
          lifecycle: 'derived',
          text: 'Becoming Together',
          source: { kind: 'dialog', id: 'dlg-1' },
          actions: [],
        },
      ],
    }
    const forged: StageComposition = {
      id: 'forged',
      context: adminDomain,
      treatment: 'domain',
      nodes: [
        {
          kind: 'group',
          emphasis: 'primary',
          layout: 'stack',
          children: [
            { kind: 'cite', readingId: 'place:dlg-1', emphasis: 'primary' },
            { kind: 'cite', readingId: 'invented', emphasis: 'primary' },
          ],
        },
      ],
    }
    const kept = dropUnsourcedNodes(forged, reading)
    expect(citeIds(kept)).toEqual(['place:dlg-1'])
    const arranged = composeStagePass(reading, 'domain-where-we-are')
    expect(citeIds(arranged)).not.toContain('invented')
  })
})
