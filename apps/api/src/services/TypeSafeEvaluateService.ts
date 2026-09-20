/**
 * Kip tool wrapper for TypeSafe / Jev. Agents emit typesafe.evaluate;
 * they do not become a TypeSafe agent or switch their chat model.
 */

import { resolveDomainProviderApiKeyWithSource } from '../lib/resolveDomainProviderApiKey.js';
import { resolveProviderApiKey } from '../lib/resolveProviderApiKey.js';
import {
  evaluateTypeSafe,
  parseTypeSafeEvaluatePayload,
  type TypeSafeEvaluateOutcome,
} from './TypeSafeProvider.js';

export const TYPESAFE_EVALUATE_ACTION = 'typesafe.evaluate';

export function typesafeEvaluatePromptBlock(): string {
  return [
    'TYPESAFE — typesafe.evaluate action:',
    '- TypeSafe (Jev) is a tool, not an agent and not your chat model. Stay yourself. Call this when you need a typed decision with calibrated confidence.',
    '- Do not set model_provider to typesafe. Do not invent a TypeSafe agent.',
    '- Use for yes/no (noul), classification (choice), or scored criteria (score). Do not use it to write prose or chat.',
    '- Required: a situation (state, or alias evidence / situation) plus at least one question. model? defaults to jev-latest.',
    '- Natural-language questions are valid. A question string is typed as noul unless you set type.',
    '- questions may be: a typed map id → { type, instructions, criteria? }; id → question string; an array of question strings; or a single questions / question / query string.',
    '- Prefer a typed map only when you need Choice or Score. Choice needs criteria (named options). Score is numeric. Noul is 0–1.',
    '- noul: { type: "noul", instructions: "Is this ready to keep?" } — returns 0–1.',
    '- choice: { type: "choice", instructions: "...", criteria: { keep: "Keep it", wait: "Wait" } }.',
    '- score: { type: "score", instructions: "...", criteria: ["weak", "ready", "strong"] }.',
    '- Shorthand: { state, question: "Is Domain authorization established before the query?" } — one noul question named q1.',
    '- Example NL: {"type":"agent_output","response":"Evaluating this list route.","actions":[{"type":"typesafe.evaluate","payload":{"state":"GET /api/journeys: domainId is optional.","questions":["Could an unauthenticated caller list journeys across domains?"]}}]}',
    '- Use the returned answers. Do not re-ask the same questions unless the state changed.',
    '- typesafe.evaluate is a golden-path action, available to every agent on this Dialog. Fire it when useful. Do not defer to Kip. Never mcp.call name "typesafe.evaluate".',
    '- Typed example: {"type":"agent_output","response":"Checking whether this Point is ready.","actions":[{"type":"typesafe.evaluate","payload":{"state":"Point: Stage is the room, not the story.","questions":{"should_keep":{"type":"noul","instructions":"Should this Point be kept on the Document?"}}}}]}',
  ].join('\n');
}

export async function resolveTypeSafeToolKey(params: {
  domainId?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  if (params.domainId) {
    const gated = await resolveDomainProviderApiKeyWithSource(
      params.domainId,
      'typesafe',
      params.userId,
    );
    if (gated?.key) return gated.key;
  }
  return resolveProviderApiKey('typesafe', params.userId);
}

export async function runTypeSafeEvaluateAction(params: {
  payload: unknown;
  domainId?: string | null;
  userId?: string | null;
}): Promise<TypeSafeEvaluateOutcome> {
  const parsed = parseTypeSafeEvaluatePayload(params.payload);
  if (parsed.ok === false) return parsed;

  const apiKey = await resolveTypeSafeToolKey({
    domainId: params.domainId,
    userId: params.userId,
  });

  return evaluateTypeSafe({
    state: parsed.request.state,
    questions: parsed.request.questions,
    model: parsed.request.model,
    apiKey,
  });
}
