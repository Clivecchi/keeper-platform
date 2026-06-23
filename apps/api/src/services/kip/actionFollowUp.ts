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
