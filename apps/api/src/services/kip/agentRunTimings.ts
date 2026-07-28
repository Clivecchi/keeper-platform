/**
 * Per-phase wall-time bag for authenticated Kip `action:run` turns.
 * Mutable collector — created in the HTTP handler, filled by runAgent / callAIModel.
 */

export type AgentModelCallTiming = {
  label: string;
  ms: number;
};

export type AgentRunPhaseTimings = {
  envResolveMs?: number;
  sessionMemoryMs?: number;
  promptEnvFullChars?: number;
  promptEnvCompactChars?: number;
  modelCalls: AgentModelCallTiming[];
  actionsMs?: number;
  totalMs?: number;
};

export function createAgentRunTimings(): AgentRunPhaseTimings {
  return { modelCalls: [] };
}

export function recordModelCall(
  timings: AgentRunPhaseTimings | undefined,
  label: string,
  ms: number,
): void {
  if (!timings) return;
  timings.modelCalls.push({ label, ms });
}

export function summarizeAgentRunTimings(
  timings: AgentRunPhaseTimings,
): Record<string, unknown> {
  const modelTotalMs = timings.modelCalls.reduce((sum, call) => sum + call.ms, 0);
  return {
    envResolveMs: timings.envResolveMs ?? null,
    sessionMemoryMs: timings.sessionMemoryMs ?? null,
    promptEnvFullChars: timings.promptEnvFullChars ?? null,
    promptEnvCompactChars: timings.promptEnvCompactChars ?? null,
    promptEnvCharsSaved:
      typeof timings.promptEnvFullChars === 'number'
      && typeof timings.promptEnvCompactChars === 'number'
        ? Math.max(0, timings.promptEnvFullChars - timings.promptEnvCompactChars)
        : null,
    modelCalls: timings.modelCalls,
    modelTotalMs,
    actionsMs: timings.actionsMs ?? null,
    totalMs: timings.totalMs ?? null,
  };
}
