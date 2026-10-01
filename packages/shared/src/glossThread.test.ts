import { describe, expect, it } from 'vitest'
import type { GlossAnchor } from './glossAnchor.js'
import type { GlossThread } from './glossThread.js'
import {
  buildGlossThreadKey,
  canonicalGlossAnchor,
  mergeDocumentGlossThreads,
} from './glossThread.js'

function thread(params: {
  id: string
  anchor: GlossAnchor
  messages: Array<{ id: string; content: string; createdAt: string }>
}): GlossThread {
  return {
    id: params.id,
    anchor: params.anchor,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
    messages: params.messages.map((message) => ({
      ...message,
      role: 'agent' as const,
    })),
  }
}

const POINT: GlossAnchor = {
  entityKind: 'draft',
  entityId: 'manuscript-1',
  nodeId: 'bt-point-dialog-exists',
}

describe('canonical Document Gloss', () => {
  it('drops storage messageId so a Point matches the Chronicle anchor', () => {
    const stored: GlossAnchor = { ...POINT, messageId: 'thank-you-message' }
    const canonical = canonicalGlossAnchor(stored)
    expect(canonical.messageId).toBeUndefined()
    expect(buildGlossThreadKey(canonical)).toBe(buildGlossThreadKey(POINT))
    expect(buildGlossThreadKey(stored)).not.toBe(buildGlossThreadKey(POINT))
  })

  it('keeps messageId on in-stream Gloss that is not a Document Point', () => {
    const message: GlossAnchor = {
      entityKind: 'message',
      entityId: 'msg-1',
      nodeId: 'body',
      messageId: 'msg-1',
    }
    const library: GlossAnchor = {
      entityKind: 'library',
      entityId: 'lib-1',
      nodeId: 'card',
      messageId: 'msg-1',
    }
    expect(canonicalGlossAnchor(message)).toEqual(message)
    expect(canonicalGlossAnchor(library)).toEqual(library)
  })

  it('merges stranded turns onto the carrier thread for the same Point', () => {
    const carrier = thread({
      id: 'carrier-thread',
      anchor: POINT,
      messages: [{ id: 'm-carrier', content: 'One carrier turn', createdAt: '2026-08-07T00:00:00.000Z' }],
    })
    const stranded = thread({
      id: 'stranded-thread',
      anchor: { ...POINT, messageId: 'thank-you-message' },
      messages: [
        { id: 'm-84', content: 'Cursor gloss', createdAt: '2026-09-30T12:00:00.000Z' },
        { id: 'm-carrier', content: 'duplicate id', createdAt: '2026-08-07T00:00:00.000Z' },
      ],
    })

    const merged = mergeDocumentGlossThreads([carrier, stranded])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.id).toBe('carrier-thread')
    expect(merged[0]?.anchor.messageId).toBeUndefined()
    expect(merged[0]?.messages.map((message) => message.id)).toEqual(['m-carrier', 'm-84'])
    expect(buildGlossThreadKey(merged[0]!.anchor)).toBe(buildGlossThreadKey(POINT))
  })
})
