import { describe, expect, it } from 'vitest';
import {
  buildTalkingInWorkingOnPrompt,
  resolvePointWriteTarget,
  resolveTalkingInWorkingOn,
} from './talkingInWorkingOn.js';

describe('resolveTalkingInWorkingOn', () => {
  it('defaults both coordinates to the named Dialog Document', () => {
    expect(
      resolveTalkingInWorkingOn({
        dialogId: 'dlg-1',
        dialogTitle: 'Finding the plot',
        dialogTitleSource: 'user_set',
      }),
    ).toEqual({
      talkingIn: { kind: 'dialog', id: 'dlg-1', title: 'Finding the plot' },
      workingOn: { kind: 'document', id: 'dlg-1', title: 'Finding the plot' },
    });
  });

  it('keeps Talking in on the Dialog when Working on is a Draft', () => {
    expect(
      resolveTalkingInWorkingOn({
        dialogId: 'dlg-1',
        dialogTitle: 'Finding the plot',
        dialogTitleSource: 'user_set',
        draftId: 'draft-1',
        draftTitle: 'Keeper UI Insights and Actions',
      }),
    ).toEqual({
      talkingIn: { kind: 'dialog', id: 'dlg-1', title: 'Finding the plot' },
      workingOn: { kind: 'draft', id: 'draft-1', title: 'Keeper UI Insights and Actions' },
    });
  });

  it('uses the Session when a Draft is born in Chatter', () => {
    expect(
      resolveTalkingInWorkingOn({
        dialogId: 'dlg-chatter',
        dialogTitle: 'Domain · conversation · Aug 21',
        dialogTitleSource: 'auto_generated',
        sessionId: 'sess-1',
        draftId: 'draft-1',
        draftTitle: 'New draft',
      }),
    ).toEqual({
      talkingIn: { kind: 'session', id: 'sess-1', title: 'this Session' },
      workingOn: { kind: 'draft', id: 'draft-1', title: 'New draft' },
    });
  });

  it('does not invent a Document for a Session with no Draft', () => {
    expect(
      resolveTalkingInWorkingOn({
        sessionId: 'sess-1',
        sessionTitle: 'this Session',
        dialogTitleSource: 'auto_generated',
      }),
    ).toEqual({
      talkingIn: { kind: 'session', id: 'sess-1', title: 'this Session' },
      workingOn: { kind: 'session', id: 'sess-1', title: 'this Session' },
    });
  });
});

describe('resolvePointWriteTarget', () => {
  it('writes to the focused Draft, not the Dialog manuscript', () => {
    const coords = resolveTalkingInWorkingOn({
      dialogId: 'dlg-1',
      dialogTitle: 'Finding the plot',
      dialogTitleSource: 'user_set',
      draftId: 'draft-1',
      draftTitle: 'Keeper UI Insights',
    });
    expect(
      resolvePointWriteTarget({
        talkingInWorkingOn: coords,
        manuscriptDraftId: 'ms-1',
        activeDraftId: 'draft-1',
      }),
    ).toEqual({ writeKind: 'draft', writeDraftId: 'draft-1' });
  });

  it('writes to the Dialog manuscript when nothing else is focused', () => {
    const coords = resolveTalkingInWorkingOn({
      dialogId: 'dlg-1',
      dialogTitle: 'Finding the plot',
      dialogTitleSource: 'user_set',
    });
    expect(
      resolvePointWriteTarget({
        talkingInWorkingOn: coords,
        manuscriptDraftId: 'ms-1',
      }),
    ).toEqual({ writeKind: 'document', writeDraftId: 'ms-1' });
  });
});

describe('buildTalkingInWorkingOnPrompt', () => {
  it('tells the agent not to treat the Dialog title as a fiction plot', () => {
    const prompt = buildTalkingInWorkingOnPrompt({
      talkingIn: { kind: 'dialog', title: 'Finding the plot' },
      workingOn: { kind: 'document', title: 'Finding the plot' },
    });
    expect(prompt).toContain('Talking in: Dialog “Finding the plot”');
    expect(prompt).toContain('Working on: Document “Finding the plot”');
    expect(prompt).toContain('fiction-plot outline');
    expect(prompt).toContain('Sections — not the Dialog');
  });

  it('separates a focused Draft from the Dialog manuscript', () => {
    const prompt = buildTalkingInWorkingOnPrompt({
      talkingIn: { kind: 'dialog', title: 'Finding the plot' },
      workingOn: { kind: 'draft', title: 'Keeper UI Insights and Actions' },
    });
    expect(prompt).toContain('Working on: Draft “Keeper UI Insights and Actions”');
    expect(prompt).toContain('Do not write the Dialog manuscript');
  });
});
