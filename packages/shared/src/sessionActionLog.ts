/**
 * Session action log — what actually ran this session.
 * Receipts live on kip_messages.metadata.actionResults; the Lead prompt
 * must see them. Narration is not evidence.
 */

export type SessionActionLogReceipt = {
  type?: unknown;
  status?: unknown;
  message?: unknown;
  data?: unknown;
};

export type SessionActionLogMessage = {
  sender?: string | null;
  created_at?: Date | string | null;
  metadata?: unknown;
};

const MAX_LOG_ENTRIES = 24;
const MAX_LABEL_CHARS = 72;

export function formatSessionActionLogTime(at: Date): string {
  if (Number.isNaN(at.getTime())) return 'unknown time';
  return at.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

export function extractActionResultsFromMetadata(metadata: unknown): SessionActionLogReceipt[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).actionResults;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object') as SessionActionLogReceipt[];
}

function clipLabel(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_LABEL_CHARS) return compact;
  return `${compact.slice(0, MAX_LABEL_CHARS - 1).trim()}…`;
}

export function sessionActionReceiptLabel(receipt: SessionActionLogReceipt): string {
  const data =
    receipt.data && typeof receipt.data === 'object' && !Array.isArray(receipt.data)
      ? (receipt.data as Record<string, unknown>)
      : {};
  if (data.duplicate === true) return 'already on Document — did not add twice';
  const point =
    data.point && typeof data.point === 'object' && !Array.isArray(data.point)
      ? (data.point as Record<string, unknown>)
      : null;
  const fromPoint =
    (typeof point?.prelude === 'string' && point.prelude.trim())
    || (typeof point?.content === 'string' && point.content.trim())
    || '';
  if (fromPoint) return clipLabel(fromPoint);
  if (typeof receipt.message === 'string' && receipt.message.trim()) {
    return clipLabel(receipt.message);
  }
  return '';
}

export function summarizeSessionActionReceipt(
  receipt: SessionActionLogReceipt,
  at: Date,
): string {
  const type = typeof receipt.type === 'string' ? receipt.type : 'action';
  const status = typeof receipt.status === 'string' ? receipt.status : 'unknown';
  const label = sessionActionReceiptLabel(receipt);
  const time = formatSessionActionLogTime(at);
  return `- ${time}  ${type}  ${status}${label ? `  ${label}` : ''}`;
}

function receiptTime(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(NaN);
}

export function collectSessionActionLogLines(messages: readonly SessionActionLogMessage[]): string[] {
  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.sender === 'user') continue;
    const receipts = extractActionResultsFromMetadata(msg.metadata);
    if (!receipts.length) continue;
    const at = receiptTime(msg.created_at);
    for (const receipt of receipts) {
      lines.push(summarizeSessionActionReceipt(receipt, at));
    }
  }
  return lines.slice(-MAX_LOG_ENTRIES);
}

export function buildSessionActionLogPrompt(
  messages: readonly SessionActionLogMessage[],
): string {
  const lines = collectSessionActionLogLines(messages);
  const header = [
    'SESSION ACTION LOG — receipts from this session (what actually ran). Narration is not evidence.',
    'Do not claim you added a Point, Gloss, or search unless it is listed here.',
    'Proposed Points wait for the human to Accept in Dialog. Times are UTC.',
  ];
  if (!lines.length) {
    return [...header, 'No actions have receipts in this session yet.'].join('\n');
  }
  return [...header, ...lines].join('\n');
}
