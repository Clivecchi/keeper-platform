/**
 * Session action log — what actually ran this Dialog session.
 * Receipts live on kip_messages.metadata.actionResults. Narration is not evidence.
 * Ephemeral Cast consults may *read* this log; they must not write the session.
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

export type WebSearchReceiptResult = {
  title: string;
  url: string;
  snippet: string;
};

export type EphemeralSessionAccess = {
  /** Read transcript + action log from this session. */
  loadSessionId: string | null;
  /** Write messages only when this is set. */
  persistSessionId: string | null;
};

const MAX_LOG_ENTRIES = 24;
const MAX_LABEL_CHARS = 72;
const MAX_EVIDENCE_SNIPPET_CHARS = 220;

export function resolveEphemeralSessionAccess(params: {
  ephemeral?: boolean;
  sessionId?: string | null;
}): EphemeralSessionAccess {
  const sessionId =
    typeof params.sessionId === 'string' && params.sessionId.trim()
      ? params.sessionId.trim()
      : null;
  if (params.ephemeral === true) {
    return { loadSessionId: sessionId, persistSessionId: null };
  }
  return { loadSessionId: sessionId, persistSessionId: sessionId };
}

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

export function extractWebSearchReceiptResults(data: unknown): WebSearchReceiptResult[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const raw = (data as Record<string, unknown>).results;
  if (!Array.isArray(raw)) return [];
  const rows: WebSearchReceiptResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    const snippet = typeof row.snippet === 'string' ? row.snippet.trim() : '';
    if (!title && !url) continue;
    rows.push({ title: title || 'Result', url, snippet });
  }
  return rows;
}

function clipLabel(value: string, max = MAX_LABEL_CHARS): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trim()}…`;
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
  if (receipt.type === 'web.search') {
    const results = extractWebSearchReceiptResults(data);
    const titles = results.map((row) => row.title).filter(Boolean).slice(0, 3);
    const message = typeof receipt.message === 'string' ? receipt.message.trim() : '';
    if (titles.length) {
      return clipLabel(message ? `${message} — ${titles.join('; ')}` : titles.join('; '));
    }
    if (message) return clipLabel(message);
    return '';
  }
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

export function collectWebSearchEvidenceLines(
  messages: readonly SessionActionLogMessage[],
): string[] {
  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.sender === 'user') continue;
    for (const receipt of extractActionResultsFromMetadata(msg.metadata)) {
      if (receipt.type !== 'web.search' || receipt.status !== 'success') continue;
      const data =
        receipt.data && typeof receipt.data === 'object' && !Array.isArray(receipt.data)
          ? (receipt.data as Record<string, unknown>)
          : {};
      const results = extractWebSearchReceiptResults(data);
      if (!results.length) continue;
      const query = typeof data.query === 'string' ? data.query.trim() : '';
      lines.push(`Web search evidence${query ? ` (${query})` : ''}:`);
      results.forEach((row, index) => {
        lines.push(`${index + 1}. ${row.title}${row.url ? ` — ${row.url}` : ''}`);
        if (row.snippet) {
          lines.push(`   ${clipLabel(row.snippet, MAX_EVIDENCE_SNIPPET_CHARS)}`);
        }
      });
    }
  }
  return lines;
}

export function buildSessionActionLogPrompt(
  messages: readonly SessionActionLogMessage[],
): string {
  const lines = collectSessionActionLogLines(messages);
  const evidence = collectWebSearchEvidenceLines(messages);
  const header = [
    'SESSION ACTION LOG — receipts from this Dialog session (what actually ran). Narration is not evidence.',
    'Do not claim you added a Point, Gloss, or search unless it is listed here.',
    'If a receipt is listed here, that action ran. Never say a search or evaluation did not run when it is listed.',
    'If the human asks what a search returned, list the titles and URLs in the evidence block. Do not invent them.',
    'Do not deny a receipt the human can see in Dialog. If this log is empty, say you cannot name results from the log — not that their visible receipt did not happen.',
    'Proposed Points wait for the human to Accept in Dialog. Times are UTC.',
  ];
  if (!lines.length) {
    return [...header, 'No actions have receipts in this session yet.'].join('\n');
  }
  if (!evidence.length) {
    return [...header, ...lines].join('\n');
  }
  return [...header, ...lines, '', ...evidence].join('\n');
}
