/**
 * Rendr Stage expression — how Resolved Meaning should be experienced.
 * Receives meaning + compact Set only. Never the transcript or Document.
 */

import { type ResolvedMeaning } from '@keeper/shared';
import { RENDR_IDENTITY_LOCK } from './rendrAgentConfig.js';

export type CompactPerformanceSet = {
  domainLabel?: string | null;
  talkingIn?: { kind: string; title: string } | null;
  workingOn?: { kind: string; title: string } | null;
  keeperStage?: {
    slug: string;
    title: string;
    selectedPresenceId: string | null;
    objects: Array<{
      kind: string;
      objectId: string;
      title: string;
    }>;
    storyTitles: string[];
  } | null;
};

export function buildStageExpressionSystemPrompt(): string {
  return [
    RENDR_IDENTITY_LOCK,
    'You compose how a resolved performance should be experienced on Stage.',
    'You do not decide what the performance meant. That is already resolved.',
    'You do not write Keeper truth. You do not write the Document. You do not emit actions.',
    'You do not receive or invent Cast voices. You do not reinterpret a transcript.',
    'Output raw JSON only. One Frame. One existing text_slide beat.',
    '{"type":"stage_expression","beat":{"title":"Short slide title","body":"What the audience should experience."},"rationale":"optional — how, not a new meaning"}',
  ].join('\n');
}

export function buildStageExpressionUserPrompt(input: {
  resolvedMeaning: ResolvedMeaning;
  set: CompactPerformanceSet;
}): string {
  const set = input.set;
  const lines = [
    'RESOLVED MEANING (already decided — express this, do not change it):',
    JSON.stringify(input.resolvedMeaning, null, 2),
    '',
    'SET / CONTEXT (source material — not meaning, not to clone):',
  ];
  if (set.domainLabel?.trim()) {
    lines.push(`Domain: ${set.domainLabel.trim()}`);
  }
  if (set.talkingIn) {
    lines.push(`Talking in: ${set.talkingIn.kind} “${set.talkingIn.title}”`);
  }
  if (set.workingOn) {
    lines.push(`Working on: ${set.workingOn.kind} “${set.workingOn.title}”`);
  }
  if (set.keeperStage) {
    lines.push(
      `Stage: “${set.keeperStage.title}” (${set.keeperStage.slug})`,
      `Selected presence: ${set.keeperStage.selectedPresenceId ?? 'none'}`,
    );
    for (const object of set.keeperStage.objects) {
      lines.push(`- ${object.kind} “${object.title}” (${object.objectId})`);
    }
    if (set.keeperStage.storyTitles.length) {
      lines.push(`Current filmstrip titles: ${set.keeperStage.storyTitles.join(' · ')}`);
    } else {
      lines.push('Current filmstrip: none yet (Cover is already the Root).');
    }
  }
  lines.push(
    '',
    'Compose exactly one text_slide beat that expresses the Resolved Meaning.',
    'Do not copy Point or Document bodies. Do not quote Cast. Do not restyle the meaning into a new claim.',
    'Do not emit stage.story.layout. Do not emit agent_output actions.',
  );
  return lines.join('\n');
}

export function compactPerformanceSetFromEnvironment(environment: unknown): CompactPerformanceSet {
  const env = environment && typeof environment === 'object' && !Array.isArray(environment)
    ? (environment as Record<string, unknown>)
    : {};
  const dialog = env.dialogDocument && typeof env.dialogDocument === 'object'
    ? (env.dialogDocument as Record<string, unknown>)
    : null;
  const draft = env.activeDraft && typeof env.activeDraft === 'object'
    ? (env.activeDraft as Record<string, unknown>)
    : null;
  const stage = env.keeperStage && typeof env.keeperStage === 'object'
    ? (env.keeperStage as Record<string, unknown>)
    : null;
  const presences = Array.isArray(stage?.presences) ? stage.presences : [];
  const story = stage?.story && typeof stage.story === 'object'
    ? (stage.story as Record<string, unknown>)
    : null;
  const slides = Array.isArray(story?.slides) ? story.slides : [];

  const talkingIn =
    typeof dialog?.dialogId === 'string' && dialog.dialogId.trim()
      ? {
          kind: 'dialog',
          title: typeof dialog.title === 'string' && dialog.title.trim() ? dialog.title.trim() : 'Dialog',
        }
      : null;
  const workingOn =
    typeof draft?.id === 'string' && draft.id.trim()
      ? {
          kind: 'draft',
          title: typeof draft.title === 'string' && draft.title.trim() ? draft.title.trim() : 'Draft',
        }
      : talkingIn
        ? { kind: 'document', title: talkingIn.title }
        : null;

  return {
    domainLabel: typeof env.domainName === 'string' ? env.domainName : null,
    talkingIn,
    workingOn,
    keeperStage: stage
      ? {
          slug: typeof stage.slug === 'string' ? stage.slug : 'keeper',
          title: typeof stage.title === 'string' ? stage.title : 'Keeper',
          selectedPresenceId:
            typeof stage.selectedPresenceId === 'string' ? stage.selectedPresenceId : null,
          objects: presences
            .map((row) => {
              if (!row || typeof row !== 'object') return null;
              const rec = row as Record<string, unknown>;
              if (typeof rec.kind !== 'string' || typeof rec.objectId !== 'string') return null;
              return {
                kind: rec.kind,
                objectId: rec.objectId,
                title: typeof rec.title === 'string' ? rec.title : rec.kind,
              };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null),
          storyTitles: slides
            .map((row) => {
              if (!row || typeof row !== 'object') return null;
              const title = (row as { title?: unknown }).title;
              return typeof title === 'string' && title.trim() ? title.trim() : null;
            })
            .filter((title): title is string => Boolean(title)),
        }
      : null,
  };
}
