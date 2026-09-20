/**
 * Kip wrapper for Jev Probe. Agents emit jev.probe over supplied evidence.
 * They do not become a TypeSafe agent or switch their chat model.
 * Does not persist, schedule, or manage Probes.
 */

import { resolveTypeSafeToolKey } from '../TypeSafeEvaluateService.js';
import { parseJevProbePayload, runJevProbe, type JevProbeOutcome } from './runJevProbe.js';

export { JEV_PROBE_ACTION, JEV_PROBE_CAPABILITY } from './types.js';

export function jevProbePromptBlock(): string {
  return [
    'JEV PROBE — jev.probe action:',
    '- Jev Probe asks typed questions over supplied evidence. It is a tool, not an agent and not your chat model. Stay yourself.',
    '- Capability: jev.probe. Emit the Kip action jev.probe. Never mcp.call name "jev.probe".',
    '- Use when you have evidence in hand (code, a route, a situation) and need calibrated Choice / Noul / Score answers with confidence.',
    '- Payload: { evidence (required), questions, context? (optional wrapper), model? (default jev-latest) }.',
    '- Natural-language questions are valid (string, string[], or id → string). Keeper types a string as noul unless you set type.',
    '- state is accepted as an alias for evidence. typesafe.evaluate remains the lower-level TypeSafe call.',
    '- noul: { type: "noul", instructions: "Is this Domain-scoped?" } — returns 0–1.',
    '- choice: { type: "choice", instructions: "...", criteria: { yes: "Yes", no: "No", unclear: "Cannot tell" } }.',
    '- score: { type: "score", instructions: "...", criteria: ["weak", "ready", "strong"] }.',
    '- Use the returned evaluations (answer + confidence). Do not re-ask the same questions unless the evidence changed.',
    '- This does not persist a Probe, create an Evaluation object, or schedule a run.',
    '- Example: {"type":"agent_output","response":"Probing this list route for Domain scope.","actions":[{"type":"jev.probe","payload":{"evidence":{"path":"apps/api/src/api/journeys.ts","code":"GET / uses domainId and/or keeperId."},"questions":{"domainScoped":{"type":"choice","instructions":"Does this list require Domain scope?","criteria":{"yes":"Requires Domain","no":"Unscoped","unclear":"Cannot tell"}}}}}]}',
  ].join('\n');
}

export async function runJevProbeAction(params: {
  payload: unknown;
  domainId?: string | null;
  userId?: string | null;
}): Promise<JevProbeOutcome> {
  const parsed = parseJevProbePayload(params.payload);
  if (parsed.ok === false) return parsed;

  const apiKey = await resolveTypeSafeToolKey({
    domainId: params.domainId,
    userId: params.userId,
  });

  return runJevProbe({
    evidence: parsed.request.evidence,
    questions: parsed.request.questions,
    context: parsed.request.context,
    model: parsed.request.model,
    apiKey,
  });
}
