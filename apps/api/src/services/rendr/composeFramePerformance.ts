/**
 * Rendr composes a Frame Performance from resolved meaning and selected lines.
 * No transcript. No markup. No Theatre state.
 */

import {
  type FramePerformanceContext,
  type ResolvedMeaning,
  type SelectedVoice,
} from '@keeper/shared';
import { RENDR_IDENTITY_LOCK } from './rendrAgentConfig.js';
import {
  compactPerformanceSetFromEnvironment,
  type CompactPerformanceSet,
} from './composeStageExpression.js';

export function buildFramePerformanceSystemPrompt(): string {
  return [
    RENDR_IDENTITY_LOCK,
    'You compose how a resolved meaning might be experienced.',
    'You do not decide what it meant. That is already resolved.',
    'You do not invent significance, quotes, or voices.',
    'You do not decide that the Dialog becomes presentation. The Lead does, unless the human explicitly asked for a Frame.',
    'Do not emit promote. That stamp is not yours.',
    'You may set recommendPresentation true when you would present this. That is a recommendation only.',
    'You do not write Keeper truth, the Document, or actions that mutate anything.',
    'Output raw JSON only. No HTML. No CSS. No Theatre project state.',
    'Document title and Section title are context. They are not the headline.',
    'title is the Point — the subject of this telling.',
    'beats[].title is one beat inside that telling. Do not reuse the Document title as either.',
    'At most 4 beats. The first beat carries the resolved Point. Later beats may give one selected line more room.',
    'Do not give every voice equal space. Omit voice when no selected line belongs in that beat.',
    'voice.text must be copied from SELECTED VOICES. voice.slug must be that voice\'s slug.',
    '{"version":1,"title":"Point title","beats":[{"title":"Beat title","body":"Narrative.","voice":{"slug":"ceox","attributedTo":"Ceox","text":"exact selected line"}}],"cue":{"prompt":"Ready to move this forward?","actions":[{"kind":"review_cast","label":"Review the Cast"},{"kind":"open_stage","label":"Take to Stage"}]}}',
    'Composition is yours: beats, voice, cue, and how the telling should look. Presentation authority is not.',
    'action.kind is only keep, review_cast, open_stage, or open_point.',
  ].join('\n');
}

export function buildFramePerformanceUserPrompt(input: {
  resolvedMeaning: ResolvedMeaning;
  selectedVoices: readonly SelectedVoice[];
  set: CompactPerformanceSet;
}): string {
  const set = input.set;
  const lines = [
    'RESOLVED MEANING (already decided — compose this, do not change it):',
    JSON.stringify(input.resolvedMeaning, null, 2),
    '',
    'SELECTED VOICES (the only lines you may quote — copy them, do not invent):',
    input.selectedVoices.length
      ? JSON.stringify(input.selectedVoices, null, 2)
      : '(none — do not add a voice)',
    '',
    'CONTEXT (not the headline, not meaning):',
  ];
  if (set.domainLabel?.trim()) lines.push(`Domain: ${set.domainLabel.trim()}`);
  if (set.talkingIn) lines.push(`Document: “${set.talkingIn.title}”`);
  if (set.workingOn) lines.push(`Working on: ${set.workingOn.kind} “${set.workingOn.title}”`);
  if (set.keeperStage) {
    lines.push(`Stage room: “${set.keeperStage.title}”`);
    if (set.keeperStage.storyTitles.length) {
      lines.push(`Filmstrip already has: ${set.keeperStage.storyTitles.join(' · ')}`);
    }
  }
  lines.push(
    '',
    'Compose the telling. title is the Point. beats are that telling. Do not set title to the Document title.',
    'Do not emit promote. recommendPresentation is optional and does not present the Frame.',
    'Do not copy Point or Document bodies. Do not quote anyone who is not in SELECTED VOICES.',
    'Do not emit stage.story.layout. Do not emit HTML.',
  );
  return lines.join('\n');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Document and Section Keeper already knows. Rendr does not get to name them. */
export function performanceContextFromEnvironment(
  environment: unknown,
  resolvedMeaning: ResolvedMeaning,
): FramePerformanceContext | undefined {
  const env = asRecord(environment) ?? {};
  const dialog = asRecord(env.dialogDocument);
  const documentTitle = typeof dialog?.title === 'string' ? dialog.title.trim() : '';
  if (!documentTitle) return undefined;

  const paths = Array.isArray(dialog?.paths) ? dialog.paths : [];
  const points = Array.isArray(dialog?.points) ? dialog.points : [];
  const pointRef = resolvedMeaning.about.find((ref) => ref.kind === 'point');
  const point = pointRef
    ? points
        .map((row) => asRecord(row))
        .find((row): row is Record<string, unknown> => Boolean(row && row.id === pointRef.id))
    : undefined;
  const pathGroupId = typeof point?.pathGroupId === 'string' ? point.pathGroupId.trim() : '';
  const section = pathGroupId
    ? paths
        .map((row) => asRecord(row))
        .find((row) => row?.id === pathGroupId)
    : undefined;
  const sectionTitle = typeof section?.title === 'string' && section.title.trim()
    ? section.title.trim()
    : null;

  return { documentTitle, sectionTitle };
}

export function pointBindingFromTurn(input: {
  resolvedMeaning: ResolvedMeaning;
  environment?: unknown;
  actionResults?: ReadonlyArray<Record<string, unknown>>;
}): { pointId?: string; draftId?: string; dialogId?: string } {
  const env = asRecord(input.environment) ?? {};
  const dialog = asRecord(env.dialogDocument);
  const dialogId = typeof dialog?.dialogId === 'string' ? dialog.dialogId.trim() : undefined;
  const draftId = typeof dialog?.manuscriptDraftId === 'string'
    ? dialog.manuscriptDraftId.trim()
    : undefined;
  const aboutPoint = input.resolvedMeaning.about.find((ref) => ref.kind === 'point')?.id;
  const walked = findProposedPointId(input.actionResults);
  const pointId = aboutPoint || walked || undefined;
  return {
    ...(pointId ? { pointId } : {}),
    ...(draftId ? { draftId } : {}),
    ...(dialogId ? { dialogId } : {}),
  };
}

function findProposedPointId(value: unknown, depth = 0): string | undefined {
  if (!value || typeof value !== 'object' || depth > 6) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProposedPointId(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  const rec = value as Record<string, unknown>;
  if (typeof rec.pointId === 'string' && rec.pointId.trim()) return rec.pointId.trim();
  const point = asRecord(rec.point);
  if (point && typeof point.id === 'string' && point.id.trim()) return point.id.trim();
  for (const child of Object.values(rec)) {
    const found = findProposedPointId(child, depth + 1);
    if (found) return found;
  }
  return undefined;
}

export { compactPerformanceSetFromEnvironment };
