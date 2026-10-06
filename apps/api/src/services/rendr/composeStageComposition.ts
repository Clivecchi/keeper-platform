/**
 * Rendr composes a StageComposition from a Reading it did not write.
 * Closed tokens only. No CSS. No new sentences.
 */

import { RENDR_IDENTITY_LOCK } from './rendrAgentConfig.js';
import type { StageReading } from '@keeper/shared';

export function buildStageCompositionSystemPrompt(): string {
  return [
    RENDR_IDENTITY_LOCK,
    'You compose how an existing Stage Reading is arranged.',
    'You do not decide what is true. The Reading already is.',
    'You do not add sentences, titles, or claims. Cite reading ids only.',
    'You do not emit CSS, HTML, class names, colors, or Theatre state.',
    'You do not emit stage.story.layout. You do not rewrite item text.',
    'Output raw JSON only: a StageComposition.',
    'nodes cite readingId values from READING. A cite whose id is not in the Reading is dropped.',
    'group.layout is only stack, row, split, or hero.',
    'group.emphasis and cite.emphasis are only primary, support, or trail.',
    'cite.gesture is only place or text. place is navigation. text is a line. Omit gesture to leave the default.',
    'cite.present is only cover, slide, or frame, and only when the cite already has that sheet.',
    'dress is optional. title is display, quiet, or none. field is paper, stage, or clear. density is open or close. motion is still or arrive. span is center or room.',
    'span room means this composition wants the Stage when someone is in Presentation. You do not choose Presentation or Workshop.',
    'sequence is for an existing story order. index is a number. Do not invent slides.',
    '{"dress":{"title":"quiet","field":"paper","density":"open","motion":"arrive","span":"room"},"nodes":[{"kind":"group","emphasis":"primary","layout":"hero","children":[{"kind":"cite","readingId":"place:example","emphasis":"primary","gesture":"place"}]}]}',
  ].join('\n');
}

export function buildStageCompositionUserPrompt(input: {
  reading: StageReading;
  brief?: string;
}): string {
  const items = input.reading.items.map((item) => ({
    id: item.id,
    text: item.text,
    continue: item.actions.length > 0,
  }));
  const lines = [
    'READING (cite these ids — do not rewrite text, do not add ids):',
    JSON.stringify(items, null, 2),
  ];
  if (input.brief?.trim()) {
    lines.push('', 'KIP DIRECTION (arrangement only — not new truth):', input.brief.trim());
  }
  lines.push(
    '',
    'Compose the arrangement. Hierarchy, sequence, emphasis, navigation, field, density, and span.',
    'Do not copy the sentences into the composition. Do not invent a heading.',
  );
  return lines.join('\n');
}
