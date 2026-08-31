/**
 * Lay out the single story on the named Stage.
 * Writes Domain.settings.keeperStage.story — not a Prisma Story table.
 */

import {
  parseStageStory,
  type KeeperStageComposition,
  type StageStory,
} from '@keeper/shared';
import { loadKeeperStage, saveKeeperStage } from '../domains/keeperStageStore.js';

export type LayoutStageStoryInput = {
  domainId: string;
  slides: unknown;
  rationale?: string;
};

export type LayoutStageStorySuccess = {
  ok: true;
  story: StageStory;
  stage: KeeperStageComposition;
  rationale: string | null;
};

export type LayoutStageStoryError = {
  ok: false;
  code: 'VALIDATION_ERROR' | 'SAVE_FAILED';
  message: string;
};

export type LayoutStageStoryResult = LayoutStageStorySuccess | LayoutStageStoryError;

export async function layoutStageStory(input: LayoutStageStoryInput): Promise<LayoutStageStoryResult> {
  const story = parseStageStory({ slides: input.slides });
  if (!story) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Lay out at least one Slide. First slide is the title that already exists.',
    };
  }

  try {
    const current = await loadKeeperStage(input.domainId);
    const stage = await saveKeeperStage(input.domainId, {
      ...current,
      story,
    });
    const rationale = input.rationale?.trim() || null;
    return { ok: true, story, stage, rationale };
  } catch {
    return {
      ok: false,
      code: 'SAVE_FAILED',
      message: 'Could not write the Stage story.',
    };
  }
}
