import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  domain: { findUnique: vi.fn() },
  dialog: { findMany: vi.fn(), findFirst: vi.fn() },
  kip_messages: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  kip_sessions: { findFirst: vi.fn(), create: vi.fn() },
  kip_drafts: { findMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('@keeper/database', () => ({
  prisma: prismaMock,
}));

vi.mock('./kip/loadDialogDocumentForAgent.js', () => ({
  loadDialogDocumentForAgent: vi.fn(async () => ({
    dialogId: 'dialog-1',
    title: 'Becoming Together',
    status: 'drafts',
    forward: { title: 'Becoming Together', description: 'North star' },
    step: { title: 'Now', body: 'Tip' },
    paths: [],
    points: [{ id: 'point-1', status: 'proposed', type: 'note', preview: 'Hello', rewritable: true }],
    manuscriptDraftId: 'draft-1',
  })),
}));

import { DialogMcpService } from './DialogMcpService.js';

describe('DialogMcpService (read-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.domain.findUnique.mockResolvedValue({
      id: 'domain-1',
      name: 'Keeper',
      slug: 'default',
    });
  });

  it('listDialogs returns dialog and draft items', async () => {
    prismaMock.dialog.findMany.mockResolvedValue([
      {
        id: 'dialog-1',
        title: 'Becoming Together',
        updated_at: new Date('2026-08-02T00:00:00.000Z'),
      },
    ]);
    prismaMock.kip_drafts.findMany.mockResolvedValue([
      {
        id: 'draft-1',
        title: 'Becoming Together manuscript',
        updated_at: new Date('2026-08-03T00:00:00.000Z'),
      },
    ]);

    const result = await DialogMcpService.listDialogs({ domainId: 'domain-1' });
    expect(result.domainName).toBe('Keeper');
    expect(result.items).toEqual([
      {
        id: 'draft-1',
        title: 'Becoming Together manuscript',
        entityKind: 'draft',
        updatedAt: '2026-08-03T00:00:00.000Z',
      },
      {
        id: 'dialog-1',
        title: 'Becoming Together',
        entityKind: 'dialog',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ]);
    expect(prismaMock.kip_sessions.create).not.toHaveBeenCalled();
    expect(prismaMock.kip_messages.create).not.toHaveBeenCalled();
  });

  it('readDialog returns messageId + suggestedAnchor from existing messages only', async () => {
    prismaMock.dialog.findFirst.mockResolvedValue({
      id: 'dialog-1',
      title: 'Becoming Together',
    });
    prismaMock.kip_messages.findMany.mockResolvedValue([
      {
        id: 'msg-latest',
        role: 'user',
        content: 'Discuss this Point',
        created_at: new Date('2026-08-04T12:00:00.000Z'),
      },
      {
        id: 'msg-older',
        role: 'assistant',
        content: 'Earlier reply',
        created_at: new Date('2026-08-04T11:00:00.000Z'),
      },
    ]);

    const result = await DialogMcpService.readDialog({
      domainId: 'domain-1',
      entityId: 'dialog-1',
    });

    expect(result.messageId).toBe('msg-latest');
    expect(result.suggestedAnchor).toMatchObject({
      entityKind: 'draft',
      entityId: 'draft-1',
      nodeId: 'point-1',
      messageId: 'msg-latest',
    });
    expect(result.messages).toHaveLength(2);
    expect(prismaMock.kip_messages.create).not.toHaveBeenCalled();
    expect(prismaMock.kip_sessions.create).not.toHaveBeenCalled();
  });

  it('readDialog fails clearly when Dialog has no messages', async () => {
    prismaMock.dialog.findFirst.mockResolvedValue({
      id: 'dialog-1',
      title: 'Becoming Together',
    });
    prismaMock.kip_messages.findMany.mockResolvedValue([]);

    await expect(
      DialogMcpService.readDialog({ domainId: 'domain-1', entityId: 'dialog-1' }),
    ).rejects.toThrow(/read-only and will not create/);
  });
});
