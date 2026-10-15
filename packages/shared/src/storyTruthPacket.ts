/**
 * Truth packet for a Keeper Story.
 * Sentences Keeper can already support. The Cast may choose among them.
 * It may not add history that is not here.
 */

import type { ResolvedMeaning, ResolvedMeaningRef } from './resolvedMeaning.js';
import {
  whereWeAreClaimLine,
  whereWeAreUncertainty,
} from './stageComposition.js';
import type { WhereWeAreReading } from './stageArrival.js';
import { isAuthoredDocumentForward } from './document.js';

/** How many source claims a direction may cite. A Frame may still hold fewer beats. */
export const STORY_DIRECTION_MAX_CLAIMS = 12 as const;
export const ALREADY_IN_PROGRESS_TITLE = 'Already in Progress...';
export const ALREADY_IN_PROGRESS_STORY_ID = 'already-in-progress';

export type StoryTruthSource =
  | { kind: 'domain'; id: string }
  | { kind: 'dialog'; id: string }
  | { kind: 'claim'; claimKind: string; dialogId: string };

export type StoryTruthClaim = {
  id: string;
  text: string;
  source: StoryTruthSource;
};

export type StoryTruthPacket = {
  domainId: string;
  dialogId: string;
  dialogTitle: string;
  claims: StoryTruthClaim[];
};

export type StoryTruthFocus = {
  id: string;
  title: string;
  documentStatus?: string | null;
  orientation?: string | null;
  forwardTitle?: string | null;
  forwardDescription?: string | null;
  stepTitle?: string | null;
  stepBody?: string | null;
  /** True when session Chronicle rows exist. Their bodies are not in this packet. */
  hasSessionTrail: boolean;
};

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function push(claims: StoryTruthClaim[], claim: StoryTruthClaim | null) {
  if (!claim?.text.trim() || !claim.id.trim()) return;
  if (claims.some((row) => row.id === claim.id)) return;
  claims.push(claim);
}

export function buildStoryTruthPacket(input: {
  domainId: string;
  domainName: string;
  wordmark?: string | null;
  tagline?: string | null;
  focus: StoryTruthFocus;
  reading: WhereWeAreReading;
}): StoryTruthPacket {
  const title = trimmed(input.focus.title) || 'This Dialog';
  const place = trimmed(input.wordmark) || trimmed(input.domainName) || 'This Domain';
  const tagline = trimmed(input.tagline);
  const claims: StoryTruthClaim[] = [];

  push(claims, {
    id: 'domain-cover',
    text: tagline ? `${place}. ${tagline}` : place,
    source: { kind: 'domain', id: input.domainId },
  });

  const status = trimmed(input.focus.documentStatus);
  if (status === 'kept' || status === 'drafts' || status === 'presented') {
    const said = status === 'drafts' ? 'in drafts' : status;
    push(claims, {
      id: 'dialog-status',
      text: `${title} is ${said}.`,
      source: { kind: 'dialog', id: input.focus.id },
    });
  }

  push(claims, {
    id: trimmed(input.focus.orientation) ? 'dialog-orientation' : 'dialog-orientation-absent',
    text: trimmed(input.focus.orientation)
      ? `${title} has an Orientation.`
      : `${title} has no Orientation.`,
    source: { kind: 'dialog', id: input.focus.id },
  });

  const hasForward = isAuthoredDocumentForward({
    forwardTitle: input.focus.forwardTitle,
    forwardDescription: input.focus.forwardDescription,
  });
  push(claims, {
    id: hasForward ? 'dialog-forward' : 'dialog-forward-absent',
    text: hasForward ? `${title} has an authored Forward.` : `${title} has no Forward.`,
    source: { kind: 'dialog', id: input.focus.id },
  });

  const hasStep = Boolean(trimmed(input.focus.stepTitle) || trimmed(input.focus.stepBody));
  push(claims, {
    id: hasStep ? 'dialog-step' : 'dialog-step-absent',
    text: hasStep ? `${title} has a Step.` : `${title} has no Step.`,
    source: { kind: 'dialog', id: input.focus.id },
  });

  if (input.focus.hasSessionTrail) {
    push(claims, {
      id: 'chronicle-session-trail',
      text: `${title} has a Chronicle session trail.`,
      source: { kind: 'dialog', id: input.focus.id },
    });
  }

  const uncertainty = whereWeAreUncertainty(input.reading);
  if (uncertainty) {
    push(claims, {
      id: 'where-uncertainty',
      text: uncertainty,
      source: { kind: 'domain', id: input.domainId },
    });
  }

  for (const claim of input.reading.claims) {
    push(claims, {
      id: `where-${claim.kind}-${claim.dialogId}`,
      text: whereWeAreClaimLine(claim),
      source: { kind: 'claim', claimKind: claim.kind, dialogId: claim.dialogId },
    });
  }

  return {
    domainId: input.domainId,
    dialogId: input.focus.id,
    dialogTitle: title,
    claims,
  };
}

/** Kip's order. Unknown ids are dropped. This is the factual boundary, not the wording of the Story. */
export function selectStoryClaims(
  packet: StoryTruthPacket,
  claimIds: readonly string[],
): { claims: StoryTruthClaim[]; trimmed: boolean } {
  const byId = new Map(packet.claims.map((claim) => [claim.id, claim]));
  const claims: StoryTruthClaim[] = [];
  let trimmed = false;
  for (const raw of claimIds) {
    const claim = byId.get(raw.trim());
    if (!claim || claims.some((row) => row.id === claim.id)) continue;
    if (claims.length >= STORY_DIRECTION_MAX_CLAIMS) {
      trimmed = true;
      break;
    }
    claims.push(claim);
  }
  return { claims, trimmed };
}

/**
 * Keep the Lead's telling. Cite the Dialogs behind the chosen claims.
 * Does not replace that telling with the source sentences.
 */
export function meaningWithStorySources(
  prior: ResolvedMeaning | undefined,
  claims: readonly StoryTruthClaim[],
  focus?: { dialogId: string; dialogTitle: string },
): ResolvedMeaning {
  const about: ResolvedMeaningRef[] = [];
  const push = (ref: ResolvedMeaningRef) => {
    if (about.some((row) => row.kind === ref.kind && row.id === ref.id)) return;
    about.push(ref);
  };
  for (const ref of prior?.about ?? []) push(ref);
  for (const claim of claims) {
    const dialogId = claim.source.kind === 'dialog'
      ? claim.source.id
      : claim.source.kind === 'claim'
        ? claim.source.dialogId
        : null;
    if (!dialogId) continue;
    const title = focus && dialogId === focus.dialogId ? focus.dialogTitle : undefined;
    push({
      kind: 'dialog',
      id: dialogId,
      ...(title ? { title } : {}),
    });
  }
  const directed = prior?.meaning?.trim();
  return {
    meaning: directed || 'Tell what the chosen claims already support. Do not add history.',
    ...(prior?.because ? { because: prior.because } : {}),
    about,
    performedBy: prior?.performedBy?.length ? prior.performedBy : ['kip'],
    presentFrame: true,
  };
}

const STORY_REQUEST_VERBS = 'create|make|save|write|start|build';

function storyRequestIsBlocked(text: string): boolean {
  return new RegExp(
    `\\b(?:don'?t|do not|never)\\s+(?:${STORY_REQUEST_VERBS})\\b(?:\\s+\\S+){0,6}\\s+story\\b`,
    'i',
  ).test(text);
}

/** The human asked for a Keeper Story. Any create/make/save/write/start/build plus “story” counts. */
export function humanRequestsKeeperStory(text: string): boolean {
  const normalized = text.trim();
  if (!normalized || storyRequestIsBlocked(normalized)) return false;
  if (/already in progress/i.test(normalized)) return true;
  return new RegExp(
    `\\b(?:${STORY_REQUEST_VERBS})\\b(?:\\s+\\S+){0,6}\\s+story\\b`,
    'i',
  ).test(normalized);
}

function cleanRequestedStoryTitle(value: string | undefined): string | null {
  if (!value) return null;
  const title = value
    .replace(/^(?:called|named|titled)\s+/i, '')
    .replace(/^["“']+|["”']+$/g, '')
    .replace(/[.?!]+$/g, '')
    .trim();
  if (!title || /^(?:a|an|the|this|that|one|it)$/i.test(title)) return null;
  return title.slice(0, 200);
}

/** Title the human gave this Story. Null when they asked for a Story and did not name it. */
export function requestedKeeperStoryTitle(text: string): string | null {
  const raw = text.trim();
  if (!raw || storyRequestIsBlocked(raw)) return null;
  if (/already in progress/i.test(raw)) return ALREADY_IN_PROGRESS_TITLE;
  const labeled = raw.match(/\bstory\b\s*(?:,|:|—|–|-)\s*(.+)$/i);
  const named = raw.match(/\bstory\b\s+(?:called|named|titled)\s+["“']?(.+?)["”']?\s*$/i);
  return cleanRequestedStoryTitle(labeled?.[1] ?? named?.[1]);
}

export function buildKeeperStoryDirectionPrompt(dialogId: string | null, title?: string | null): string {
  const named = title?.trim() || null;
  const read = dialogId
    ? `Call story.truth.read with { "dialogId": "${dialogId}" } before you decide.`
    : 'Call story.truth.read with this Dialog’s id before you decide.';
  const save = named
    ? `Emit story.save { "title": ${JSON.stringify(named)}, "dialogId": "<this Dialog>", "claimIds": ["..."], "description": "<your telling>" }.`
    : 'Emit story.save { "title": "<short title from the human>", "dialogId": "<this Dialog>", "claimIds": ["..."], "description": "<your telling>" }.';
  return [
    'KEEPER STORY — you direct. Rendr composes the Frame after this turn, from the meaning you resolve. Rendr does not choose the Story.',
    'Do not emit stage.story.layout. That writes the Stage filmstrip. This Story is saved apart from it.',
    'Saying you see a story does not save one. Narration without story.save leaves the Story empty.',
    read,
    'When the packet is in front of you, choose the claim ids the Story should stand on. Leave out a claim that is not worth telling. Those ids are the factual boundary. They are not the sentences the audience must hear.',
    'Direct the telling in your own words. You may summarize, phrase, sequence, and emphasize. Do not state an event, motive, name, date, or outcome the packet does not support.',
    named
      ? `The human named this Story ${JSON.stringify(named)}. Use that title. If that Story already exists, story.save fills it.`
      : 'If the human named a title, use it. Otherwise choose a short title from their words.',
    save,
    'Emit resolvedMeaning with presentFrame true. meaning is that telling, not a paste of the claim sentences. Cite their Dialogs in about. performedBy is you.',
    'Rendr will compose how the telling is experienced. Rendr does not choose the Story.',
  ].join('\n');
}

export function keeperStoryIdForTitle(title: string): string {
  if (title.trim().toLowerCase() === ALREADY_IN_PROGRESS_TITLE.toLowerCase()) {
    return ALREADY_IN_PROGRESS_STORY_ID;
  }
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (slug || 'story').slice(0, 80);
}
