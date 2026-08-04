import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  domain: { findUnique: vi.fn() },
  dialog: { findMany: vi.fn(), findFirst: vi.fn() },
  kip_messages: { findFirst: vi.fn(), create: vi.fn() },
  kip_sessions: { findFirst: vi.fn(), create: vi.fn() },
  kip_drafts: { findMany: vi.fn() },
}));

vi.mock('@keeper/database', () => ({
  prisma: prismaMock,
}));

vi.mock('./domains/resolveDomainLeadAgent.js', () => ({
  resolveDomainLeadAgentFromDomain: vi.fn(async () => ({
    id: 'agent-1',
    slug: 'kip',
    name: 'Kip',
    source: 'settings',
  })),
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

describe('DialogMcpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.domain.findUnique.mockResolvedValue({
      id: 'domain-1',
      name: 'Keeper',
      slug: 'default',
      frame_json: {},
      settings: {},
      ownerId: 'user-owner',
    });
  });

  it('searchDialogs finds by title', async () => {
    prismaMock.dialog.findMany.mockResolvedValue([
      {
        id: 'dialog-1',
        title: 'Becoming Together',
        document_status: 'drafts',
        forward_title: 'Becoming Together',
        step_title: 'Now',
        updated_at: new Date('2026-08-01T00:00:00.000Z'),
        created_at: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);

    const result = await DialogMcpService.searchDialogs({
      domainId: 'domain-1',
      query: 'Becoming Together',
    });

    expect(result.domainName).toBe('Keeper');
    expect(result.dialogs).toHaveLength(1);
    expect(result.dialogs[0]?.title).toBe('Becoming Together');
    expect(prismaMock.dialog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain_id: 'domain-1',
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('readDialog returns messageId and suggestedAnchor', async () => {
    prismaMock.dialog.findFirst.mockResolvedValue({
      id: 'dialog-1',
      user_id: 'user-1',
      title: 'Becoming Together',
    });
    prismaMock.kip_messages.findFirst
      .mockResolvedValueOnce(null) // no tagged carrier
      .mockResolvedValueOnce({
        id: 'msg-existing',
        session_id: 'session-1',
      });

    const result = await DialogMcpService.readDialog({
      domainId: 'domain-1',
      dialogId: 'dialog-1',
      userId: 'user-1',
    });

    expect(result.messageId).toBe('msg-existing');
    expect(result.domainName).toBe('Keeper');
    expect(result.suggestedAnchor).toMatchObject({
      entityKind: 'draft',
      entityId: 'draft-1',
      nodeId: 'point-1',
      messageId: 'msg-existing',
    });
    expect(result.document.title).toBe('Becoming Together');
  });
});
