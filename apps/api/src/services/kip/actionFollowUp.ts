/**
 * Follow-up synthesis after read-only Kip actions (draft.read, journey.read, etc.).
 * Lead agents emit response + actions in one JSON envelope; read results are not
 * available until after execution — a second model turn closes the loop.
 */

export type ActionResultLike = {
  type: string;
  status: string;
  message: string;
  data?: Record<string, unknown>;
};

const READ_ONLY_ACTION_TYPES = new Set([
  'draft.read',
  'draft.get',
  'draft.list',
  'journey.read',
  'moment.read',
  'keeper.read',
  'sole.read',
  'library.read',
  'dialog.read',
  'web.search',
  'delegate.consult',
]);

export function isReadOnlyActionType(type: string): boolean {
  return READ_ONLY_ACTION_TYPES.has(type);
}

export function shouldRunReadActionFollowUp(
  actions: Array<{ type: string }>,
  results: ActionResultLike[],
): boolean {
  if (!actions.length || !results.length) return false;
  if (!actions.every((action) => isReadOnlyActionType(action.type))) return false;
  // Consult may "fail" with empty reply — still follow up so Lead reports honestly.
  if (actions.some((action) => action.type === 'delegate.consult')) {
    return results.some((result) => result.type === 'delegate.consult');
  }
  return results.some(
    (result) => result.status === 'success' && isReadOnlyActionType(result.type),
  );
}

function summarizeDraftSpec(spec: unknown): string {
  if (!spec || typeof spec !== 'object') return 'spec: (empty)';
  const points = (spec as { points?: unknown[] }).points;
  if (!Array.isArray(points)) return 'spec: no points array';
  if (points.length === 0) {
    return 'spec.points: [] (empty — check session history for prior proposed content)';
  }
  const preview = points.slice(0, 8).map((raw, index) => {
    if (!raw || typeof raw !== 'object') return `${index + 1}. (invalid point)`;
    const point = raw as { status?: string; type?: string; content?: string; text?: string };
    const content = (point.content ?? point.text ?? '').trim().slice(0, 200);
    return `${index + 1}. [${point.status ?? 'unknown'}/${point.type ?? 'general'}] ${content || '(no content)'}`;
  });
  return [`spec.points: ${points.length} total`, ...preview].join('\n');
}

export function formatReadActionResultsForFollowUp(results: ActionResultLike[]): string {
  return results
    .filter((result) => result.status === 'success' && isReadOnlyActionType(result.type))
    .map((result) => {
      const lines = [`Action: ${result.type}`, `Status: ${result.status}`, `Message: ${result.message}`];
      const data = result.data;
      if (data) {
        if (typeof data.draft === 'object' && data.draft) {
          const draft = data.draft as { id?: string; title?: string; kind?: string; key?: string };
          lines.push(
            `Draft: ${draft.title ?? 'untitled'} (${draft.kind ?? 'draft'} / ${draft.key ?? 'no-key'}) id=${draft.id ?? '?'}`,
          );
        }
        if (data.summary !== undefined) {
          lines.push(`Summary: ${String(data.summary ?? '')}`);
        }
        if ('spec' in data) {
          lines.push(summarizeDraftSpec(data.spec));
        }
        if (Array.isArray(data.drafts)) {
          lines.push(`Drafts listed: ${data.drafts.length}`);
        }
        if (result.type === 'dialog.read' && data.document && typeof data.document === 'object') {
          const doc = data.document as {
            title?: string;
            status?: string;
            points?: Array<{ type?: string; preview?: string; status?: string }>;
          };
          const points = Array.isArray(doc.points) ? doc.points : [];
          lines.push(`Document: ${doc.title ?? 'untitled'}${doc.status ? ` [${doc.status}]` : ''}`);
          if (data.documentUnbuilt === true || points.length === 0) {
            lines.push(
              typeof data.honesty === 'string'
                ? data.honesty
                : 'Document is unbuilt — no Points. Do not claim you read a body.',
            );
          } else {
            lines.push(`Points: ${points.length}`);
            for (const point of points.slice(0, 24)) {
              const preview = typeof point.preview === 'string' ? point.preview.trim() : '';
              lines.push(
                preview
                  ? `- (${point.type ?? 'point'}): ${preview}`
                  : `- (${point.type ?? 'point'})`,
              );
            }
          }
        } else if (Array.isArray(data.results)) {
          if (result.type === 'web.search') {
            lines.push(`Web results: ${data.results.length}`);
            if (typeof data.query === 'string') {
              lines.push(`Query: ${data.query}`);
            }
            for (const row of data.results.slice(0, 10)) {
              if (row && typeof row === 'object') {
                const item = row as { title?: string; url?: string; snippet?: string };
                lines.push(
                  `- ${item.title ?? '?'} — ${item.url ?? '?'}${item.snippet ? `: ${String(item.snippet).slice(0, 200)}` : ''}`,
                );
              }
            }
          } else if (result.type === 'dialog.read') {
            lines.push(`Dialogs listed: ${data.results.length}`);
            for (const row of data.results.slice(0, 12)) {
              if (row && typeof row === 'object') {
                const item = row as { id?: string; title?: string; titleSource?: string; tier?: string };
                lines.push(
                  `- ${item.title ?? item.id ?? '?'} (${item.tier ?? item.titleSource ?? '?'})`,
                );
              }
            }
          } else {
            lines.push(`Library items: ${data.results.length}`);
            for (const row of data.results.slice(0, 12)) {
              if (row && typeof row === 'object') {
                const item = row as { id?: string; display_label?: string; description?: string };
                lines.push(
                  `- ${item.display_label ?? item.id ?? '?'} (${item.id ?? '?'})${item.description ? `: ${String(item.description).slice(0, 120)}` : ''}`,
                );
              }
            }
          }
        }
        if (
          data.spec === undefined
          && data.draft === undefined
          && !Array.isArray(data.drafts)
          && !(result.type === 'dialog.read' && (data.document || Array.isArray(data.results)))
        ) {
          lines.push(`Data: ${JSON.stringify(data, null, 2).slice(0, 4000)}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * When a second model call would risk the Vercel/proxy first-byte budget,
 * surface read results directly instead of timing out the whole turn.
 */
export function formatReadActionResultsForUserFallback(results: ActionResultLike[]): string {
  const lines: string[] = [
    'I retrieved the information, but skipped a second synthesis pass so this turn would not time out. Here is what came back:',
  ];

  for (const result of results) {
    if (result.status !== 'success' || !isReadOnlyActionType(result.type)) continue;
    const data = result.data ?? {};

    if (result.type === 'web.search' && Array.isArray(data.results)) {
      const query = typeof data.query === 'string' ? data.query : 'your search';
      lines.push(`Web search (${query}):`);
      for (const row of data.results.slice(0, 5)) {
        if (!row || typeof row !== 'object') continue;
        const item = row as { title?: string; url?: string; snippet?: string };
        lines.push(
          `- ${item.title ?? 'Result'}${item.url ? ` — ${item.url}` : ''}${item.snippet ? `: ${String(item.snippet).slice(0, 160)}` : ''}`,
        );
      }
      continue;
    }

    if (result.type === 'library.read' && Array.isArray(data.results)) {
      lines.push('Library:');
      for (const row of data.results.slice(0, 6)) {
        if (!row || typeof row !== 'object') continue;
        const item = row as { display_label?: string; id?: string; description?: string };
        lines.push(
          `- ${item.display_label ?? item.id ?? 'Item'}${item.description ? `: ${String(item.description).slice(0, 120)}` : ''}`,
        );
      }
      continue;
    }

    if (typeof data.draft === 'object' && data.draft) {
      const draft = data.draft as { title?: string; kind?: string };
      lines.push(`Draft: ${draft.title ?? 'untitled'}${draft.kind ? ` (${draft.kind})` : ''}`);
      if (data.summary !== undefined) {
        lines.push(String(data.summary ?? '').slice(0, 500));
      }
      continue;
    }

    if (result.message?.trim()) {
      lines.push(`${result.type}: ${result.message.trim()}`);
    }
  }

  if (lines.length === 1) {
    lines.push('(No readable result payload — ask me to try again.)');
  }
  lines.push('Ask me to continue if you want a fuller synthesis.');
  return lines.join('\n');
}

/** Skip a second model call when the turn is already near the proxy first-byte limit (~120s). */
export const READ_FOLLOW_UP_MAX_ELAPSED_MS = 75_000;

export function buildReadActionFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  actionResults: ActionResultLike[];
  priorResponseText?: string;
}): string {
  const consultResults = params.actionResults.filter((result) => result.type === 'delegate.consult');
  if (consultResults.length > 0) {
    const lines = consultResults.map((result) => {
      const data = result.data ?? {};
      const label =
        typeof data.label === 'string'
          ? data.label
          : typeof data.agentSlug === 'string'
            ? data.agentSlug
            : 'cast member';
      const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
      if (result.status === 'success' && reply) {
        return `- ${label}: "${reply}"`;
      }
      return `- ${label}: (nothing returned)`;
    });
    return [
      `[Cast consultation results — reply as ${params.agentName}.]`,
      ...lines,
      '',
      `Original user message: "${params.originalInput}"`,
      'Synthesize for the user using ONLY the real results above.',
      '- Attribute a quote only when a real reply is present.',
      '- If a cast member returned nothing, say plainly you got nothing back from them.',
      '- Never invent another agent\'s words.',
      '- Do NOT call delegate.consult again in this follow-up.',
    ].join('\n');
  }

  const findings = formatReadActionResultsForFollowUp(params.actionResults);
  return [
    `[Read action results — reply as ${params.agentName}. Do NOT call draft.read again in this turn unless the user asks for a different draft.]`,
    findings,
    '',
    params.priorResponseText?.trim()
      ? `Your prior message was only: "${params.priorResponseText.trim()}" — replace that with a substantive answer.`
      : 'Your prior message deferred without answering — fix that now.',
    '',
    `Original user message: "${params.originalInput}"`,
    'Answer the user directly using:',
    '- The read results above (current draft state)',
    '- This session conversation history (for points or context no longer in the draft)',
    'If library.read returned items and the user asked you to browse or pick from the library:',
    '- Choose one item and explain why in your response',
    '- Include envelope "card": {"type":"summary","title":"<item title>","body":"<rationale>","meta":"<item id>"} (nested ```keeper-card still accepted)',
    '- Also include a library.read action with { id } for your chosen item so a tappable Library receipt renders',
    'If web.search returned results:',
    '- Cite the most relevant sources by title and URL',
    '- Summarize what they say; do not invent links that were not returned',
    '- Do NOT call web.search again in this follow-up unless the user asked for a different query',
    'If they asked to rebuild or restore draft points, use draft.update.propose or draft.update actions now with the content you recover from the session.',
    'If dialog.read returned a Document:',
    '- Use Forward, Step, Paths, and Points from the result — same source Chronicle renders.',
    '- If the result says the Document is unbuilt (no Points), say that. Do not claim you read a body.',
    'Do not stop at "I read the draft" — complete the engagement.',
  ].join('\n');
}

const DRAFT_MUTATION_ACTION_TYPES = new Set([
  'draft.create',
  'draft.update',
  'draft.update.propose',
  'draft.point.rewrite',
  'draft.point.accept',
  'draft.delete',
  'draft.setActive',
]);

export function isDraftMutationActionType(type: string): boolean {
  return DRAFT_MUTATION_ACTION_TYPES.has(type);
}

const USER_DRAFT_WORK_PATTERNS: RegExp[] = [
  /\bmove .+ (into|to) (a )?(new )?draft\b/i,
  /\bseparate draft\b/i,
  /\bsplit .+ draft\b/i,
  /\bnew draft\b/i,
  /\bupdate (the )?draft\b/i,
  /\bclean (up )?(the )?draft\b/i,
  /\brewrite queue\b/i,
  /\bpull .+ (into|out of)\b/i,
  /\bcreate a draft\b/i,
  /\bsave (this|it) (as )?(a )?draft\b/i,
  /\bwork (on|in) (the )?draft\b/i,
];

const RESPONSE_DEFERRAL_PATTERNS: RegExp[] = [
  /\bgive me a moment\b/i,
  /\bone moment\b/i,
  /\bhold on\b/i,
  /\bstay with me\b/i,
  /\b(i'm|i am) (pulling|creating|updating|moving|splitting|working on|about to)\b/i,
  /\b(i'll|i will) (create|update|move|pull|split|separate)\b/i,
  /\blet me (create|update|move|pull|split|separate|work)\b/i,
];

const READ_ONLY_ESCAPE_PATTERNS = [
  'no draft',
  'read only',
  'read-only',
  'do not make changes',
  "don't make changes",
  'without making changes',
  'no changes',
  'only report',
  'only summarize',
];

export function userRequestedDraftWork(userInput: string): boolean {
  const normalized = userInput.trim();
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  if (READ_ONLY_ESCAPE_PATTERNS.some((phrase) => lower.includes(phrase))) {
    return false;
  }
  return USER_DRAFT_WORK_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function responseDefersDraftWork(responseText: string): boolean {
  const text = responseText.trim();
  if (!text) return false;
  return RESPONSE_DEFERRAL_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasSuccessfulDraftMutationResults(results: ActionResultLike[]): boolean {
  return results.some(
    (result) => isDraftMutationActionType(result.type) && result.status === 'success',
  );
}

/** When every action in the turn failed or was skipped — surface a summary in response text. */
export function buildAllActionsFailedSummary(results: ActionResultLike[]): string | null {
  if (!results.length) return null;
  if (results.some((result) => result.status === 'success')) return null;

  const lines = results.map((result) => {
    const label = result.status === 'skipped' ? 'skipped' : 'failed';
    return `- ${result.type} (${label}): ${result.message}`;
  });
  return `\n\nI could not complete the requested actions:\n${lines.join('\n')}`;
}

/** When draft mutation actions were attempted but none succeeded. */
export function buildDraftMutationFailureNotice(
  results: ActionResultLike[],
  priorResponseText?: string,
): string | null {
  const draftResults = results.filter((result) => isDraftMutationActionType(result.type));
  if (!draftResults.length) return null;
  if (draftResults.some((result) => result.status === 'success')) return null;

  const failures = draftResults.filter(
    (result) => result.status === 'error' || result.status === 'skipped',
  );
  if (!failures.length) return null;

  const detail = failures.map((result) => `${result.type}: ${result.message}`).join('; ');
  const notice = `I attempted draft work, but it did not complete: ${detail}`;
  return priorResponseText?.trim() ? `${priorResponseText.trim()} ${notice}` : notice;
}

/**
 * When the user asked for draft work and the model deferred without completing draft mutations.
 * Uses post-execution results when available so failed/skipped draft actions still trigger follow-up.
 */
export function shouldRunMutationDeferralFollowUp(params: {
  userInput: string;
  responseText: string;
  actions: Array<{ type: string }>;
  actionResults?: ActionResultLike[];
}): boolean {
  if (params.actionResults?.length && hasSuccessfulDraftMutationResults(params.actionResults)) {
    return false;
  }
  if (
    !params.actionResults?.length
    && params.actions.some((action) => isDraftMutationActionType(action.type))
  ) {
    return false;
  }
  if (!userRequestedDraftWork(params.userInput)) return false;
  return responseDefersDraftWork(params.responseText);
}

export function buildMutationDeferralFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  priorResponseText: string;
}): string {
  return [
    `[Draft work deferred — reply as ${params.agentName}. Complete the draft work now in this turn.]`,
    '',
    `Your prior message deferred without acting: "${params.priorResponseText.trim()}"`,
    '',
    `Original user message: "${params.originalInput}"`,
    'The user asked for draft work. Do NOT defer again.',
    '- Include draft.create, draft.update, draft.update.propose, or draft.point.rewrite actions now.',
    '- Use draftsDirectory and session history for existing draft ids and point content.',
    '- Replace deferral language ("give me a moment", "I\'m pulling…") with a short confirmation after actions run.',
    '- If the work truly cannot be done, explain why in one sentence and ask one clarifying question — no false promises.',
  ].join('\n');
}
