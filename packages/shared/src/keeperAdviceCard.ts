/**
 * Existing keeper-card as the Cast/Lead advisory channel.
 * Not a new artifact — the envelope `card` already used by Story-builder.
 */

export type KeeperAdviceCard = {
  type: string;
  title: string;
  body?: string;
  meta?: string;
  items?: string[];
};

export function parseKeeperAdviceCard(raw: unknown): KeeperAdviceCard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const type = typeof rec.type === 'string' ? rec.type.trim() : '';
  const title = typeof rec.title === 'string' ? rec.title.trim() : '';
  if (!type || !title) return null;
  const body = typeof rec.body === 'string' ? rec.body.trim() : '';
  const meta = typeof rec.meta === 'string' ? rec.meta.trim() : '';
  const items = Array.isArray(rec.items)
    ? rec.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  return {
    type,
    title,
    ...(body ? { body } : {}),
    ...(meta ? { meta } : {}),
    ...(items.length ? { items } : {}),
  };
}

/** Walk Kip/System run envelopes the same way reply/actions are extracted. */
export function extractKeeperAdviceCardFromRunResult(result: unknown): KeeperAdviceCard | null {
  const visit = (node: unknown, depth = 0): KeeperAdviceCard | null => {
    if (!node || typeof node !== 'object' || depth > 5) return null;
    const obj = node as Record<string, unknown>;
    const fromHere = parseKeeperAdviceCard(obj.card);
    if (fromHere) return fromHere;
    if (obj.data !== undefined) return visit(obj.data, depth + 1);
    return null;
  };
  return visit(result);
}

export function formatKeeperAdviceCardForPrompt(card: KeeperAdviceCard): string {
  const lines = [`card "${card.title}" (${card.type})`];
  if (card.body?.trim()) lines.push(card.body.trim());
  for (const item of card.items ?? []) {
    lines.push(item.trim());
  }
  return lines.join('\n');
}

export function hasDeliveredKeeperAdvice(input: {
  reply?: string | null;
  card?: KeeperAdviceCard | null;
}): boolean {
  if (input.card && (input.card.title || input.card.body || (input.card.items?.length ?? 0) > 0)) {
    return true;
  }
  return Boolean(input.reply?.trim());
}

const ADVISE_ONLY_SKIP =
  /Cast advises only|Kip support does not write the Document or Stage story/i;

export function isAdviseOnlySkip(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const rec = result as { status?: unknown; message?: unknown };
  return rec.status === 'skipped' && typeof rec.message === 'string' && ADVISE_ONLY_SKIP.test(rec.message);
}

export function withoutAdviseOnlySkips<T>(results: readonly T[]): T[] {
  return results.filter((result) => !isAdviseOnlySkip(result));
}
