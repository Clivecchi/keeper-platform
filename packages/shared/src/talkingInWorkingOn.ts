/**
 * Talking in / Working on — conversation vs action target.
 *
 * Talking in = the conversation you are in (named Dialog, or a Session/Chatter).
 * Working on = Chronicle focus / Point write target (Draft if focused, else the Dialog Document).
 *
 * These can differ. A Draft in Chronicle does not change Talking in.
 * Visible work is the default action target. Never invent a Document so a Session has one.
 */

import {
  inferDialogTitleSource,
  isDocumentBearingDialogTitleSource,
} from './dialogTitleSource.js';

export const TALKING_IN_KINDS = ['dialog', 'session'] as const;
export type TalkingInKind = (typeof TALKING_IN_KINDS)[number];

export const WORKING_ON_KINDS = [
  'document',
  'draft',
  'journey',
  'path',
  'moment',
  'keeper',
  'agent',
  'session',
] as const;
export type WorkingOnKind = (typeof WORKING_ON_KINDS)[number];

export type TalkingInRef = {
  kind: TalkingInKind;
  id: string;
  title: string;
};

export type WorkingOnRef = {
  kind: WorkingOnKind;
  id: string;
  title: string;
};

export type TalkingInWorkingOn = {
  talkingIn: TalkingInRef | null;
  workingOn: WorkingOnRef | null;
};

export type ResolveTalkingInWorkingOnInput = {
  dialogId?: string | null;
  dialogTitle?: string | null;
  dialogTitleSource?: string | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  draftId?: string | null;
  draftTitle?: string | null;
  journeyId?: string | null;
  journeyTitle?: string | null;
  pathId?: string | null;
  pathTitle?: string | null;
  momentId?: string | null;
  momentTitle?: string | null;
  keeperId?: string | null;
  keeperTitle?: string | null;
  agentId?: string | null;
  agentTitle?: string | null;
};

function trimmed(value: string | null | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function isNamedDialog(input: ResolveTalkingInWorkingOnInput): boolean {
  if (!trimmed(input.dialogId)) return false;
  if (isDocumentBearingDialogTitleSource(input.dialogTitleSource)) return true;
  if (input.dialogTitleSource === 'auto_generated' || input.dialogTitleSource === 'system_promoted') {
    return false;
  }
  // Missing title_source: infer only when a title is present.
  // An empty title is not Chatter — do not drop a linked Dialog to Session.
  if (trimmed(input.dialogTitle)) {
    return isDocumentBearingDialogTitleSource(inferDialogTitleSource(input.dialogTitle));
  }
  return Boolean(trimmed(input.draftId));
}

/**
 * Resolve the two coordinates from current selection + session.
 * Returns null when there is no conversation and no work subject.
 */
export function resolveTalkingInWorkingOn(
  input: ResolveTalkingInWorkingOnInput,
): TalkingInWorkingOn | null {
  const dialogId = trimmed(input.dialogId);
  const sessionId = trimmed(input.sessionId);
  const named = isNamedDialog(input);

  let talkingIn: TalkingInRef | null = null;
  if (named && dialogId) {
    talkingIn = {
      kind: 'dialog',
      id: dialogId,
      title: trimmed(input.dialogTitle) ?? 'this Dialog',
    };
  } else if (sessionId) {
    talkingIn = {
      kind: 'session',
      id: sessionId,
      title: trimmed(input.sessionTitle) ?? 'this Session',
    };
  } else if (dialogId) {
    talkingIn = {
      kind: 'session',
      id: dialogId,
      title: trimmed(input.dialogTitle) ?? trimmed(input.sessionTitle) ?? 'this Session',
    };
  }

  const draftId = trimmed(input.draftId);
  const journeyId = trimmed(input.journeyId);
  const pathId = trimmed(input.pathId);
  const momentId = trimmed(input.momentId);
  const keeperId = trimmed(input.keeperId);
  const agentId = trimmed(input.agentId);

  let workingOn: WorkingOnRef | null = null;
  if (draftId) {
    workingOn = {
      kind: 'draft',
      id: draftId,
      title: trimmed(input.draftTitle) ?? 'this Draft',
    };
  } else if (agentId) {
    workingOn = {
      kind: 'agent',
      id: agentId,
      title: trimmed(input.agentTitle) ?? 'this Agent',
    };
  } else if (momentId) {
    workingOn = {
      kind: 'moment',
      id: momentId,
      title: trimmed(input.momentTitle) ?? 'this Moment',
    };
  } else if (pathId) {
    workingOn = {
      kind: 'path',
      id: pathId,
      title: trimmed(input.pathTitle) ?? 'this Path',
    };
  } else if (journeyId) {
    workingOn = {
      kind: 'journey',
      id: journeyId,
      title: trimmed(input.journeyTitle) ?? 'this Journey',
    };
  } else if (keeperId) {
    workingOn = {
      kind: 'keeper',
      id: keeperId,
      title: trimmed(input.keeperTitle) ?? 'this Keeper',
    };
  } else if (named && dialogId) {
    workingOn = {
      kind: 'document',
      id: dialogId,
      title: trimmed(input.dialogTitle) ?? 'this Document',
    };
  } else if (talkingIn?.kind === 'session') {
    workingOn = {
      kind: 'session',
      id: talkingIn.id,
      title: talkingIn.title,
    };
  }

  if (!talkingIn && !workingOn) return null;
  return { talkingIn, workingOn };
}

/** Human label for Working on — Document vs Draft vs the Chronicle subject. */
export function workingOnKindLabel(kind: WorkingOnKind): string {
  switch (kind) {
    case 'document':
      return 'Document';
    case 'draft':
      return 'Draft';
    case 'journey':
      return 'Journey';
    case 'path':
      return 'Path';
    case 'moment':
      return 'Moment';
    case 'keeper':
      return 'Keeper';
    case 'agent':
      return 'Agent';
    case 'session':
      return 'Session';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function talkingInKindLabel(kind: TalkingInKind): string {
  return kind === 'dialog' ? 'Dialog' : 'Session';
}

/**
 * When Talking in a Dialog and Working on its Document, do not shout the title twice.
 */
export function workingOnRepeatsTalkingInTitle(
  talkingIn?: { kind: TalkingInKind; title: string } | null,
  workingOn?: { kind: WorkingOnKind; title: string } | null,
): boolean {
  if (!talkingIn || !workingOn) return false;
  if (talkingIn.kind !== 'dialog' || workingOn.kind !== 'document') return false;
  return talkingIn.title.trim() === workingOn.title.trim();
}

/**
 * Point write target from the two coordinates.
 * Focused Draft wins. Named Dialog Document is the default.
 * Session/Chatter never invents a Document.
 */
export function resolvePointWriteTarget(input: {
  talkingInWorkingOn?: TalkingInWorkingOn | null;
  manuscriptDraftId?: string | null;
  activeDraftId?: string | null;
}): { writeKind: 'document' | 'draft'; writeDraftId: string } | { writeKind: 'none' } {
  const coords = input.talkingInWorkingOn;
  const activeDraftId = trimmed(input.activeDraftId);
  const manuscriptDraftId = trimmed(input.manuscriptDraftId);

  if (coords?.workingOn?.kind === 'draft' && activeDraftId) {
    return { writeKind: 'draft', writeDraftId: activeDraftId };
  }
  if (activeDraftId && activeDraftId !== manuscriptDraftId) {
    return { writeKind: 'draft', writeDraftId: activeDraftId };
  }
  if (coords?.workingOn?.kind === 'document' && manuscriptDraftId) {
    return { writeKind: 'document', writeDraftId: manuscriptDraftId };
  }
  if (manuscriptDraftId && coords?.talkingIn?.kind === 'dialog') {
    return { writeKind: 'document', writeDraftId: manuscriptDraftId };
  }
  if (activeDraftId) {
    return { writeKind: 'draft', writeDraftId: activeDraftId };
  }
  return { writeKind: 'none' };
}

/**
 * Agent grounding — Talking in is conversation; Working on is the write target.
 * Dialog titles are names, not fiction-plot outlines.
 */
export function buildTalkingInWorkingOnPrompt(input: {
  talkingIn?: { kind: TalkingInKind; title: string } | null;
  workingOn?: { kind: WorkingOnKind; title: string } | null;
  domainName?: string | null;
}): string | null {
  const talking = input.talkingIn;
  const working = input.workingOn;
  if (!talking && !working) return null;

  const lines = [
    'TALKING IN / WORKING ON (Keeper coordinates — not optional flavor):',
  ];
  const domainName = input.domainName?.trim();
  if (domainName) {
    lines.push(
      `Domain: “${domainName}” — always stay aware. A story here may later be promoted out as its own Domain.`,
    );
  }
  if (talking) {
    lines.push(
      `Talking in: ${talkingInKindLabel(talking.kind)} “${talking.title}” — conversation context.`,
    );
  }
  if (working) {
    lines.push(
      `Working on: ${workingOnKindLabel(working.kind)} “${working.title}” — Chronicle focus and Point write target.`,
    );
  }
  if (working?.kind === 'draft') {
    lines.push(
      'Write Points to this Draft. Do not write the Dialog manuscript just because Talking in is still that Dialog.',
    );
  } else if (working?.kind === 'document') {
    lines.push(
      'The Document is the primary conversational background. Write Points here. Linked Drafts are Sections of the Document, not a substitute for it.',
    );
  }
  lines.push(
    'A Dialog title is the conversation’s name — not a fiction-plot outline, and not the name of a Document Section.',
    'Forward is the directional objective of the Dialog — where this conversation is going — not the Document’s name.',
    'A Draft linked to the Dialog is a Section of that Document. Re-Center or UI Insights, if present, are Sections — not the Dialog.',
    'Open is the quieter Section for Points that do not yet fit. Authored Section names belong to this story; do not copy another Document’s Section names.',
    'The work is Dialog + Document + Drafts + Points coming together so a story can be made from the Dialog.',
    'You are driven by governance and by code. Where those two conflict, or lack support for the story to bloom, that lack is itself a Point.',
    'Points are durable findings from the conversation that is actually happening.',
  );
  return lines.join('\n');
}
