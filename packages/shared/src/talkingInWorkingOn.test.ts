import { describe, expect, it } from 'vitest';
import {
  buildTalkingInWorkingOnPrompt,
  resolvePointWriteTarget,
  resolveTalkingInWorkingOn,
  workingOnRepeatsTalkingInTitle,
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

  it('keeps Talking in on a linked Dialog when title_source and title are still loading', () => {
    expect(
      resolveTalkingInWorkingOn({
        dialogId: 'dlg-1',
        draftId: 'draft-1',
        draftTitle: 'Keeper UI Insights and Actions',
        sessionId: 'sess-1',
      }),
    ).toEqual({
      talkingIn: { kind: 'dialog', id: 'dlg-1', title: 'this Dialog' },
      workingOn: { kind: 'draft', id: 'draft-1', title: 'Keeper UI Insights and Actions' },
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
    expect(prompt).toContain('primary conversational background');
    expect(prompt).toContain('directional objective');
    expect(prompt).toContain('Open is the quieter Section');
    expect(prompt).toContain('governance and by code');
  });

  it('names the Domain when provided', () => {
    const prompt = buildTalkingInWorkingOnPrompt({
      talkingIn: { kind: 'dialog', title: 'Finding the plot' },
      workingOn: { kind: 'document', title: 'Finding the plot' },
      domainName: 'ke3p',
    });
    expect(prompt).toContain('Domain: “ke3p”');
  });

  it('collapses Working on when it repeats the Dialog Document title', () => {
    expect(
      workingOnRepeatsTalkingInTitle(
        { kind: 'dialog', title: 'Finding the plot' },
        { kind: 'document', title: 'Finding the plot' },
      ),
    ).toBe(true);
    expect(
      workingOnRepeatsTalkingInTitle(
        { kind: 'dialog', title: 'Finding the plot' },
        { kind: 'draft', title: 'Keeper UI Insights and Actions' },
      ),
    ).toBe(false);
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
