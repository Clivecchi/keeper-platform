/**
 * Agent Board Composer grounding — Training and Performance Inspection.
 * Observable facts only. No hidden reasoning. No autonomous Agency mutation.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function buildAgentTrainingPrompt(
  agentContext: Record<string, unknown> | undefined,
): string | null {
  const training = asRecord(agentContext?.agentTraining);
  if (!training) return null;
  const name = asString(training.agentName) ?? 'this Agent';
  const frameLabel = asString(training.frameLabel) ?? asString(training.frame) ?? 'Currently';
  const frameIntent = asString(training.frameIntent);
  const instruction = asString(training.instruction);

  return [
    'AGENT BOARD — TRAINING',
    `You are helping refine ${name}'s voice prompt.`,
    `Chronicle frame in focus: ${frameLabel}.`,
    frameIntent ? `Frame intent: ${frameIntent}` : '',
    instruction ?? `Help the human refine this section of the voice prompt. Suggest concrete copy. Ask clarifying questions.`,
    'Do not change identity, role, lens, voice prompt, contracts, capabilities, or model configuration yourself. Propose copy; the human Saves.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildAgentPerformanceInspectionPrompt(
  agentContext: Record<string, unknown> | undefined,
): string | null {
  const inspection = asRecord(agentContext?.agentPerformanceInspection);
  if (!inspection) return null;

  const facts = Array.isArray(inspection.facts) ? inspection.facts : [];
  const layers = Array.isArray(inspection.layers) ? inspection.layers : [];
  const factLines = facts
    .map((row) => {
      const fact = asRecord(row);
      if (!fact) return null;
      const label = asString(fact.label);
      const value = asString(fact.value);
      if (!label || !value) return null;
      const recorded = fact.recorded === true ? 'recorded' : 'not recorded / current config';
      return `- ${label}: ${value} (${recorded})`;
    })
    .filter((line): line is string => Boolean(line));

  const layerLines = layers
    .map((row) => {
      const layer = asRecord(row);
      if (!layer) return null;
      const label = asString(layer.label);
      const status = asString(layer.status);
      if (!label || !status) return null;
      const detail = asString(layer.detail);
      const statusLabel =
        status === 'recorded' ? 'Recorded on this turn' : 'Not recorded for this performance';
      return `- ${label}: ${statusLabel}${detail ? ` · ${detail}` : ''}`;
    })
    .filter((line): line is string => Boolean(line));

  const instruction =
    asString(inspection.instruction)
    ?? 'Use only the observable facts and recorded layers below. Do not invent hidden reasoning.';

  return [
    'AGENT BOARD — PERFORMANCE INSPECTION',
    'The human is inspecting a recorded performance of the selected Agent.',
    `Agent: ${asString(inspection.agentName) ?? 'unknown'}`,
    `Configured role: ${asString(inspection.configuredRole) ?? 'unknown'}`,
    `Acting role on this turn: ${asString(inspection.actingRole) ?? 'Not recorded for this performance'}`,
    `Talking in: ${asString(inspection.dialogTitle) ?? 'Not recorded for this performance'}`,
    `Provenance source: ${asString(inspection.source) ?? 'unknown'}`,
    factLines.length ? `Observable facts:\n${factLines.join('\n')}` : '',
    layerLines.length ? `Runtime layers:\n${layerLines.join('\n')}` : '',
    instruction,
    'Do not change identity, role, lens, voice prompt, contracts, capabilities, governance, or model configuration. Inspection and understanding first. Human authorization is required for any change.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function collectAgentBoardContextPrompts(
  agentContext: Record<string, unknown> | undefined,
): string[] {
  return [
    buildAgentPerformanceInspectionPrompt(agentContext),
    buildAgentTrainingPrompt(agentContext),
  ].filter((row): row is string => Boolean(row));
}
