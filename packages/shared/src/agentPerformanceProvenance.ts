/**
 * Observable Agent performance provenance.
 * Names runtime systems that participated — not private model reasoning.
 */

import { isLeadAgentRole } from './agentRole.js';

export type ProvenanceRecordKind = 'recorded' | 'not_recorded';

export type ProvenanceLayerKey =
  | 'lead_judgment'
  | 'cast_honesty'
  | 'voice_prompt'
  | 'domain_lens'
  | 'domain_contract'
  | 'card_rendering'
  | 'orchestration'
  | 'board_cueing'
  | 'talking_in'
  | 'stage'
  | 'action_policy'
  | 'resolved_meaning_contract';

export interface ProvenanceLayer {
  key: ProvenanceLayerKey;
  label: string;
  status: ProvenanceRecordKind;
  detail?: string;
}

export interface PerformanceCastVoice {
  slug: string;
  attributedTo?: string;
  status?: string;
}

export interface AgentPerformanceProvenance {
  version: 'perf-v1';
  /** How this checklist was produced. */
  source: 'recorded_on_turn' | 'derived_from_legacy';
  recordedAt: string;
  agentId: string;
  agentSlug: string;
  agentName: string;
  configuredRole: string | null;
  actingRole: string | null;
  dialogId: string | null;
  dialogTitle: string | null;
  domainId: string | null;
  domainName: string | null;
  boardId: string | null;
  cueingMode: string | null;
  workspaceSurface: string | null;
  model: string | null;
  modelProvider: string | null;
  orchestrationMechanism: string | null;
  cast: PerformanceCastVoice[];
  cardType: string | null;
  resolvedMeaningPresent: boolean;
  messageId?: string;
  layers: ProvenanceLayer[];
}

export type OrchestrationMechanism =
  | 'plain_lead'
  | 'cast_consultation_a'
  | 'director_instrument'
  | 'director_instrument_fallback'
  | 'delegate_consult_b'
  | string;

const LAYER_LABELS: Record<ProvenanceLayerKey, string> = {
  lead_judgment: 'Lead Judgment',
  cast_honesty: 'Cast Honesty',
  voice_prompt: 'Voice prompt',
  domain_lens: 'Domain Lens',
  domain_contract: 'Domain Contract',
  card_rendering: 'Card rendering',
  orchestration: 'Orchestration',
  board_cueing: 'Board / cueing',
  talking_in: 'Talking in',
  stage: 'Stage',
  action_policy: 'Action policy',
  resolved_meaning_contract: 'Resolved Meaning contract',
};

function layer(
  key: ProvenanceLayerKey,
  active: boolean,
  detail?: string,
): ProvenanceLayer {
  return {
    key,
    label: LAYER_LABELS[key],
    status: active ? 'recorded' : 'not_recorded',
    ...(detail?.trim() ? { detail: detail.trim() } : {}),
  };
}

export function mechanismLabel(mechanism: string | null | undefined): string {
  switch (mechanism) {
    case 'cast_consultation_a':
      return 'multi-Cast';
    case 'director_instrument':
      return 'directed Cast';
    case 'director_instrument_fallback':
      return 'directed Cast (fallback)';
    case 'delegate_consult_b':
      return 'Lead consult';
    case 'plain_lead':
      return 'Lead only';
    default:
      return mechanism?.trim() || 'Not recorded for this performance';
  }
}

export type BuildProvenanceInput = {
  recordedAt?: string;
  source?: AgentPerformanceProvenance['source'];
  agentId: string;
  agentSlug: string;
  agentName: string;
  configuredRole?: string | null;
  dialogId?: string | null;
  dialogTitle?: string | null;
  domainId?: string | null;
  domainName?: string | null;
  boardId?: string | null;
  cueingMode?: string | null;
  workspaceSurface?: string | null;
  model?: string | null;
  modelProvider?: string | null;
  orchestrationMechanism?: string | null;
  cast?: PerformanceCastVoice[];
  cardType?: string | null;
  resolvedMeaningPresent?: boolean;
  messageId?: string;
  leadJudgmentActive?: boolean;
  castHonestyActive?: boolean;
  voicePromptActive?: boolean;
  domainLensActive?: boolean;
  domainContractActive?: boolean;
  cardRenderingActive?: boolean;
  actionPolicyActive?: boolean;
  resolvedMeaningContractActive?: boolean;
};

export function buildAgentPerformanceProvenance(
  input: BuildProvenanceInput,
): AgentPerformanceProvenance {
  const role = input.configuredRole?.trim() || null;
  const mechanism = input.orchestrationMechanism?.trim() || null;
  const cast = Array.isArray(input.cast) ? input.cast.filter((row) => row.slug?.trim()) : [];
  const talkingIn = Boolean(input.dialogId?.trim() || input.dialogTitle?.trim());
  const onStage = input.workspaceSurface?.trim().toLowerCase() === 'stage';
  const orchestrationActive = Boolean(mechanism && mechanism !== 'plain_lead');

  return {
    version: 'perf-v1',
    source: input.source ?? 'recorded_on_turn',
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    agentId: input.agentId,
    agentSlug: input.agentSlug,
    agentName: input.agentName,
    configuredRole: role,
    actingRole: isLeadAgentRole(role) ? 'Lead' : role,
    dialogId: input.dialogId?.trim() || null,
    dialogTitle: input.dialogTitle?.trim() || null,
    domainId: input.domainId?.trim() || null,
    domainName: input.domainName?.trim() || null,
    boardId: input.boardId?.trim() || null,
    cueingMode: input.cueingMode?.trim() || null,
    workspaceSurface: input.workspaceSurface?.trim() || null,
    model: input.model?.trim() || null,
    modelProvider: input.modelProvider?.trim() || null,
    orchestrationMechanism: mechanism,
    cast,
    cardType: input.cardType?.trim() || null,
    resolvedMeaningPresent: input.resolvedMeaningPresent === true,
    ...(input.messageId ? { messageId: input.messageId } : {}),
    layers: [
      layer(
        'lead_judgment',
        input.leadJudgmentActive === true,
        input.leadJudgmentActive ? 'Role contract' : undefined,
      ),
      layer('cast_honesty', input.castHonestyActive === true),
      layer('voice_prompt', input.voicePromptActive === true),
      layer('domain_lens', input.domainLensActive === true),
      layer('domain_contract', input.domainContractActive === true),
      layer('card_rendering', input.cardRenderingActive !== false),
      layer(
        'orchestration',
        orchestrationActive,
        orchestrationActive ? mechanismLabel(mechanism) : undefined,
      ),
      layer(
        'board_cueing',
        Boolean(input.boardId || input.cueingMode),
        [input.boardId, input.cueingMode].filter(Boolean).join(' · ') || undefined,
      ),
      layer('talking_in', talkingIn, input.dialogTitle ?? undefined),
      layer('stage', onStage),
      layer('action_policy', input.actionPolicyActive !== false),
      layer(
        'resolved_meaning_contract',
        input.resolvedMeaningContractActive === true,
      ),
    ],
  };
}

export function parseAgentPerformanceProvenance(
  value: unknown,
): AgentPerformanceProvenance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.version !== 'perf-v1') return null;
  if (typeof row.agentId !== 'string' || typeof row.agentName !== 'string') return null;
  if (!Array.isArray(row.layers)) return null;
  return row as unknown as AgentPerformanceProvenance;
}

export type LegacyPerformanceMetadata = {
  orchestration?: {
    mechanism?: string;
    agentSlug?: string;
    model?: string;
    modelProvider?: string;
    dialogId?: string | null;
    castConsultSlugs?: string[];
  } | null;
  castVoices?: Array<{ slug?: string; attributedTo?: string; status?: string }>;
  card?: { type?: string } | null;
  resolvedMeaning?: unknown;
};

/** Derive a checklist from older messages that predate perf-v1. */
export function deriveProvenanceFromLegacyMetadata(params: {
  agentId: string;
  agentSlug: string;
  agentName: string;
  configuredRole?: string | null;
  dialogId?: string | null;
  dialogTitle?: string | null;
  domainId?: string | null;
  domainName?: string | null;
  model?: string | null;
  modelProvider?: string | null;
  recordedAt?: string;
  messageId?: string;
  metadata: LegacyPerformanceMetadata;
}): AgentPerformanceProvenance {
  const orch = params.metadata.orchestration;
  const voices = Array.isArray(params.metadata.castVoices) ? params.metadata.castVoices : [];
  const castFromVoices = voices
    .map((voice) => ({
      slug: typeof voice.slug === 'string' ? voice.slug : '',
      attributedTo: typeof voice.attributedTo === 'string' ? voice.attributedTo : undefined,
      status: typeof voice.status === 'string' ? voice.status : undefined,
    }))
    .filter((voice) => voice.slug);
  const slugs = Array.isArray(orch?.castConsultSlugs) ? orch.castConsultSlugs : [];
  const cast =
    castFromVoices.length > 0
      ? castFromVoices
      : slugs.map((slug) => ({ slug }));

  const cardType =
    params.metadata.card && typeof params.metadata.card.type === 'string'
      ? params.metadata.card.type
      : null;
  const mechanism = typeof orch?.mechanism === 'string' ? orch.mechanism : null;

  return buildAgentPerformanceProvenance({
    source: 'derived_from_legacy',
    recordedAt: params.recordedAt,
    agentId: params.agentId,
    agentSlug: typeof orch?.agentSlug === 'string' ? orch.agentSlug : params.agentSlug,
    agentName: params.agentName,
    configuredRole: params.configuredRole,
    dialogId: params.dialogId ?? (typeof orch?.dialogId === 'string' ? orch.dialogId : null),
    dialogTitle: params.dialogTitle,
    domainId: params.domainId,
    domainName: params.domainName,
    model: params.model ?? (typeof orch?.model === 'string' ? orch.model : null),
    modelProvider:
      params.modelProvider
      ?? (typeof orch?.modelProvider === 'string' ? orch.modelProvider : null),
    orchestrationMechanism: mechanism,
    cast,
    cardType,
    resolvedMeaningPresent: params.metadata.resolvedMeaning != null,
    messageId: params.messageId,
    leadJudgmentActive: false,
    castHonestyActive: false,
    voicePromptActive: false,
    domainLensActive: false,
    domainContractActive: false,
    cardRenderingActive: false,
    actionPolicyActive: false,
    resolvedMeaningContractActive: false,
  });
}
