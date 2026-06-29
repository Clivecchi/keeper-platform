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
        if (data.spec === undefined && data.draft === undefined && !Array.isArray(data.drafts)) {
          lines.push(`Data: ${JSON.stringify(data, null, 2).slice(0, 4000)}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export function buildReadActionFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  actionResults: ActionResultLike[];
  priorResponseText?: string;
}): string {
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
    'If they asked to rebuild or restore draft points, use draft.update.propose or draft.update actions now with the content you recover from the session.',
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

/** When the user asked for draft work but the model deferred without draft actions. */
export function shouldRunMutationDeferralFollowUp(params: {
  userInput: string;
  responseText: string;
  actions: Array<{ type: string }>;
}): boolean {
  if (params.actions.some((action) => isDraftMutationActionType(action.type))) {
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
