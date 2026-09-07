import { prisma } from '@keeper/database';
import { Prisma } from '@prisma/client';
import {
  applyKeepingChoiceSelection,
  mergeKeepingChoiceAgentMessageId,
  parseKeepingChoiceExercise,
  parseKeepingChoiceRecords,
  stampKeepingChoiceRecords,
  type KeepingChoiceExercise,
  type KeepingChoiceOffer,
  type KeepingChoiceRecord,
} from '@keeper/shared';

function metadataRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

export function readKeepingChoiceExercise(agentContext: unknown): KeepingChoiceExercise | null {
  if (!agentContext || typeof agentContext !== 'object' || Array.isArray(agentContext)) {
    return null;
  }
  return parseKeepingChoiceExercise((agentContext as Record<string, unknown>).keepingChoice);
}

export async function loadKeepingChoiceRecords(
  messageId: string,
): Promise<{ records: KeepingChoiceRecord[]; metadata: Record<string, unknown> } | null> {
  const message = await prisma.kip_messages.findUnique({
    where: { id: messageId },
    select: { metadata: true },
  });
  if (!message) return null;
  const metadata = metadataRecord(message.metadata);
  return {
    records: parseKeepingChoiceRecords(metadata.keepingChoices),
    metadata,
  };
}

export async function isKeepingChoiceExercisable(
  exercise: KeepingChoiceExercise,
): Promise<{ ok: true } | { ok: false; reason: 'missing' | 'already_selected' }> {
  const loaded = await loadKeepingChoiceRecords(exercise.sourceMessageId);
  if (!loaded) return { ok: false, reason: 'missing' };
  const current = loaded.records.find((row) => row.choiceId === exercise.choiceId);
  if (!current) return { ok: false, reason: 'missing' };
  if (current.selections.length > 0) return { ok: false, reason: 'already_selected' };
  return { ok: true };
}

export function stampOfferedKeepingChoices(input: {
  offers: readonly KeepingChoiceOffer[];
  messageId: string;
  sessionId: string;
  dialogId?: string | null;
  agentId?: string;
  agentSlug?: string;
  actor: string;
  idFactory: () => string;
}): KeepingChoiceRecord[] {
  return stampKeepingChoiceRecords(
    input.offers,
    {
      messageId: input.messageId,
      sessionId: input.sessionId,
      ...(input.dialogId !== undefined ? { dialogId: input.dialogId } : {}),
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(input.agentSlug ? { agentSlug: input.agentSlug } : {}),
      actor: input.actor,
      offeredAt: new Date().toISOString(),
    },
    input.idFactory,
  );
}

export async function recordKeepingChoiceSelection(input: {
  exercise: KeepingChoiceExercise;
  resultingUserMessageId: string;
}): Promise<{ ok: true; records: KeepingChoiceRecord[] } | { ok: false; reason: 'missing' | 'already_selected' }> {
  const loaded = await loadKeepingChoiceRecords(input.exercise.sourceMessageId);
  if (!loaded) return { ok: false, reason: 'missing' };
  const applied = applyKeepingChoiceSelection(loaded.records, input.exercise.choiceId, {
    selectedAt: new Date().toISOString(),
    resultingUserMessageId: input.resultingUserMessageId,
  });
  if (applied.ok === false) return { ok: false, reason: applied.reason };
  await prisma.kip_messages.update({
    where: { id: input.exercise.sourceMessageId },
    data: {
      metadata: {
        ...loaded.metadata,
        keepingChoices: applied.records,
      } as Prisma.InputJsonValue,
    },
  });
  return { ok: true, records: applied.records };
}

export async function attachKeepingChoiceResultMessage(input: {
  sourceMessageId: string;
  choiceId: string;
  resultingAgentMessageId: string;
}): Promise<void> {
  const loaded = await loadKeepingChoiceRecords(input.sourceMessageId);
  if (!loaded) return;
  const next = mergeKeepingChoiceAgentMessageId(
    loaded.records,
    input.choiceId,
    input.resultingAgentMessageId,
  );
  await prisma.kip_messages.update({
    where: { id: input.sourceMessageId },
    data: {
      metadata: {
        ...loaded.metadata,
        keepingChoices: next,
      } as Prisma.InputJsonValue,
    },
  });
}
