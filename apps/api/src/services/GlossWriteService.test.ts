import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlossAnchor } from '@keeper/shared';

const prismaMock = vi.hoisted(() => ({
  libraryItem: { findFirst: vi.fn() },
  kip_drafts: { findFirst: vi.fn() },
  moment: { findFirst: vi.fn() },
  kip_messages: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@keeper/database', () => ({
  prisma: prismaMock,
}));

import { appendGlossTurn } from './GlossWriteService.js';

const DOMAIN_ID = 'domain-1';
const MESSAGE_ID = 'msg-1';
const LIBRARY_ANCHOR: GlossAnchor = {
  entityKind: 'library',
  entityId: 'lib-1',
  nodeId: 'card',
};

describe('appendGlossTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.kip_messages.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
      if (args.where.id !== MESSAGE_ID) return null;
      if (args.select && 'kip_sessions' in args.select) {
        return {
          kip_sessions: { dialog: { domain_id: DOMAIN_ID } },
        };
      }
      return { metadata: { glossThreads: [] } };
    });
    prismaMock.libraryItem.findFirst.mockResolvedValue({ id: 'lib-1' });
    prismaMock.kip_messages.update.mockResolvedValue({});
  });

  it('appends a gloss turn to message metadata only', async () => {
    const result = await appendGlossTurn({
      domainId: DOMAIN_ID,
      messageId: MESSAGE_ID,
      anchor: LIBRARY_ANCHOR,
      content: 'External perspective',
      role: 'user',
    });

    expect(result.message.content).toBe('External perspective');
    expect(result.thread.messages).toHaveLength(1);
    expect(prismaMock.libraryItem.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.kip_messages.update).toHaveBeenCalledTimes(1);

    const updateArg = prismaMock.kip_messages.update.mock.calls[0]?.[0];
    expect(updateArg.where.id).toBe(MESSAGE_ID);
    expect(updateArg.data.metadata.glossThreads).toHaveLength(1);
    expect(prismaMock.libraryItem.update).toBeUndefined();
  });

  it('rejects when message domain does not match', async () => {
    prismaMock.kip_messages.findUnique.mockResolvedValueOnce({
      kip_sessions: { dialog: { domain_id: 'other-domain' } },
    });

    await expect(
      appendGlossTurn({
        domainId: DOMAIN_ID,
        messageId: MESSAGE_ID,
        anchor: LIBRARY_ANCHOR,
        content: 'Nope',
      }),
    ).rejects.toThrow('does not belong');
  });

  it('rejects invalid anchors', async () => {
    await expect(
      appendGlossTurn({
        domainId: DOMAIN_ID,
        messageId: MESSAGE_ID,
        anchor: { entityKind: 'library' },
        content: 'Hi',
      }),
    ).rejects.toThrow('valid GlossAnchor');
  });
});
