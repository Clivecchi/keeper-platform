import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDraftLinkedToSessionDialog } from './linkDraftToSessionDialog.js';

describe('ensureDraftLinkedToSessionDialog', () => {
  const db = {
    kip_sessions: { findFirst: vi.fn() },
    kip_drafts: { findUnique: vi.fn(), update: vi.fn() },
    dialog: { findUnique: vi.fn(), updateMany: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not link or promote when the session Dialog is Chatter', async () => {
    db.kip_sessions.findFirst.mockResolvedValue({ dialog_id: 'dialog-chatter' });
    db.dialog.findUnique.mockResolvedValue({
      id: 'dialog-chatter',
      title_source: 'auto_generated',
    });

    const linked = await ensureDraftLinkedToSessionDialog(db as never, {
      draftId: 'draft-1',
      sessionId: 'session-1',
    });

    expect(linked).toBeNull();
    expect(db.kip_drafts.findUnique).not.toHaveBeenCalled();
    expect(db.kip_drafts.update).not.toHaveBeenCalled();
    expect(db.dialog.updateMany).not.toHaveBeenCalled();
  });

  it('links to a named Dialog without promoting Chatter', async () => {
    db.kip_sessions.findFirst.mockResolvedValue({ dialog_id: 'dialog-named' });
    db.dialog.findUnique.mockResolvedValue({
      id: 'dialog-named',
      title_source: 'user_set',
    });
    db.kip_drafts.findUnique.mockResolvedValue({ dialog_id: null });
    db.kip_drafts.update.mockResolvedValue({});

    const linked = await ensureDraftLinkedToSessionDialog(db as never, {
      draftId: 'draft-1',
      sessionId: 'session-1',
    });

    expect(linked).toBe('dialog-named');
    expect(db.kip_drafts.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { dialog_id: 'dialog-named', updated_at: expect.any(Date) },
    });
    expect(db.dialog.updateMany).not.toHaveBeenCalled();
  });
});
