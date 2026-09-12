/**
 * Lay out the single story on the named Stage.
 * Writes Domain.settings.keeperStage.story — not a Prisma Story table.
 */

import {
  appendStageStoryBeats,
  findLiveSourcedSlide,
  parseStageStory,
  type KeeperStageComposition,
  type StageStory,
  type StageStorySlide,
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

export type AppendStageExpressionBeatInput = {
  domainId: string;
  leadMessageId: string;
  title: string;
  body: string;
  rationale?: string;
};

export type AppendStageExpressionBeatSuccess = {
  ok: true;
  alreadyPresent: boolean;
  slide: StageStorySlide;
  story: StageStory;
  stage: KeeperStageComposition;
};

export type AppendStageExpressionBeatResult =
  | AppendStageExpressionBeatSuccess
  | LayoutStageStoryError;

/**
 * Keeper appends one performance Frame. Does not replace the story or rewrite Cover.
 * Idempotent on leadMessageId — one performance → one live-sourced beat.
 */
export async function appendStageExpressionBeat(
  input: AppendStageExpressionBeatInput,
): Promise<AppendStageExpressionBeatResult> {
  const leadMessageId = input.leadMessageId.trim();
  const title = input.title.trim();
  if (!leadMessageId || !title) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'A performance Frame needs a title and the Lead message that caused it.',
    };
  }

  try {
    const current = await loadKeeperStage(input.domainId);
    const existing = findLiveSourcedSlide(current.story, leadMessageId);
    if (existing) {
      return {
        ok: true,
        alreadyPresent: true,
        slide: existing,
        story: current.story ?? { version: 1, slides: [existing] },
        stage: current,
      };
    }

    const story = appendStageStoryBeats(current.story, [
      {
        id: `live-${leadMessageId}`.slice(0, 80),
        title,
        body: input.body,
        source: { kind: 'live', id: leadMessageId },
      },
    ]);
    if (!story) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Could not append a Stage beat for this performance.',
      };
    }

    const stage = await saveKeeperStage(input.domainId, {
      ...current,
      story,
    });
    const slide = findLiveSourcedSlide(stage.story, leadMessageId);
    if (!slide) {
      return {
        ok: false,
        code: 'SAVE_FAILED',
        message: 'Could not write the Stage story.',
      };
    }
    return { ok: true, alreadyPresent: false, slide, story: stage.story ?? story, stage };
  } catch {
    return {
      ok: false,
      code: 'SAVE_FAILED',
      message: 'Could not write the Stage story.',
    };
  }
}
