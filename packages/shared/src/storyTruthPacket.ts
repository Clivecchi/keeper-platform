/**
 * Truth packet for a Keeper Story.
 * Sentences Keeper can already support. The Cast may choose among them.
 * It may not add history that is not here.
 */

import type { FramePerformance } from './framePerformance.js';
import { FRAME_PERFORMANCE_MAX_BEATS } from './framePerformance.js';
import type { ResolvedMeaning, ResolvedMeaningRef } from './resolvedMeaning.js';
import {
  whereWeAreClaimLine,
  whereWeAreUncertainty,
} from './stageComposition.js';
import type { WhereWeAreReading } from './stageArrival.js';
import { isAuthoredDocumentForward } from './document.js';

export const STORY_DIRECTION_MAX_CLAIMS = FRAME_PERFORMANCE_MAX_BEATS;
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

/** Kip's order. Unknown ids are dropped. At most one Frame's worth of claims. */
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

export function meaningFromStoryClaims(
  claims: readonly StoryTruthClaim[],
  focus?: { dialogId: string; dialogTitle: string },
): ResolvedMeaning {
  const about: ResolvedMeaningRef[] = [];
  for (const claim of claims) {
    const dialogId = claim.source.kind === 'dialog'
      ? claim.source.id
      : claim.source.kind === 'claim'
        ? claim.source.dialogId
        : null;
    if (!dialogId || about.some((ref) => ref.kind === 'dialog' && ref.id === dialogId)) continue;
    const title = focus && dialogId === focus.dialogId ? focus.dialogTitle : undefined;
    about.push({
      kind: 'dialog',
      id: dialogId,
      ...(title ? { title } : {}),
    });
  }
  return {
    meaning: claims.map((claim) => claim.text).join('\n'),
    about,
    performedBy: ['kip'],
    presentFrame: true,
  };
}

function sameTitle(left: string, right: string): boolean {
  return left.replace(/\s+/g, ' ').trim().toLowerCase() === right.replace(/\s+/g, ' ').trim().toLowerCase();
}

function safeBeatTitle(title: string, line: string, documentTitle?: string): string {
  const fromLine = line.replace(/\.$/, '').trim().slice(0, 80);
  const candidate = title.trim().slice(0, 80) || fromLine || 'Beat';
  if (!documentTitle || !sameTitle(candidate, documentTitle)) return candidate;
  if (fromLine && !sameTitle(fromLine, documentTitle)) return fromLine;
  return 'Already in Progress';
}

/**
 * Rendr may title and order the beats it returned.
 * Each body stays the directed sentence. Extra beats are dropped.
 * Claims Rendr did not give a beat are left untold.
 */
export function groundFrameBodies(
  performance: FramePerformance,
  lines: readonly string[],
  documentTitle?: string,
): FramePerformance | null {
  const capped = lines.map((line) => line.trim()).filter(Boolean).slice(0, STORY_DIRECTION_MAX_CLAIMS);
  if (!capped.length || performance.beats.length === 0) return null;
  const beats = performance.beats.slice(0, capped.length).map((beat, index) => {
    const line = capped[index] ?? '';
    return {
      title: safeBeatTitle(beat.title, line, documentTitle),
      body: line,
      ...(beat.voice ? { voice: beat.voice } : {}),
    };
  });
  const title = safeBeatTitle(performance.title, capped[0] ?? performance.title, documentTitle);
  return { ...performance, title, beats };
}

export function humanRequestsKeeperStory(text: string): boolean {
  return /already in progress/i.test(text);
}

export function buildKeeperStoryDirectionPrompt(dialogId: string | null): string {
  const read = dialogId
    ? `Call story.truth.read with { "dialogId": "${dialogId}" } before you decide.`
    : 'Call story.truth.read with this Dialog’s id before you decide.';
  return [
    'KEEPER STORY — you direct. Rendr composes the Frame after this turn, from the meaning you resolve. Rendr does not choose the Story.',
    'Do not emit stage.story.layout. That writes the Stage filmstrip. This Story is saved apart from it.',
    read,
    'When the packet is in front of you, choose at most 4 claim ids, in the order the Story should tell them. Leave out a claim that is not worth telling.',
    'Emit story.save { "title": "Already in Progress...", "dialogId": "<this Dialog>", "claimIds": ["..."] }.',
    'Emit resolvedMeaning with presentFrame true. Copy the chosen sentences into meaning. Cite their Dialogs in about. performedBy is you.',
    'Do not add events, motives, or history that the packet does not contain.',
  ].join('\n');
}

export function keeperStoryIdForTitle(title: string): string {
  if (title.trim().toLowerCase() === ALREADY_IN_PROGRESS_TITLE.toLowerCase()) {
    return ALREADY_IN_PROGRESS_STORY_ID;
  }
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (slug || 'story').slice(0, 80);
}
