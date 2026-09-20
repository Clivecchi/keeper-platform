/**
 * Bounded semantic questions for the Keeper Codebase X-Ray.
 * All Choice — constrained answers + confidence + per-option probabilities.
 */

import type { TypeSafeQuestions } from '../../services/TypeSafeProvider.js';
import type { XrayQuestionDef } from './types.js';

const YES_NO_UNCLEAR = {
  yes: 'The unit materially does this. Keyword mention alone is not enough.',
  no: 'The unit does not materially do this.',
  unclear: 'Evidence is insufficient to decide.',
} as const;

const LIKELY_UNLIKELY_UNCLEAR = {
  likely: 'The evidence points this way, without proving it.',
  unlikely: 'The evidence does not point this way.',
  unclear: 'Evidence is insufficient to decide.',
} as const;

export const KEEPER_XRAY_QUESTIONS: XrayQuestionDef[] = [
  {
    id: 'domainAware',
    family: 'architecture',
    type: 'choice',
    instructions:
      'Is this code Domain-aware? Does it bind, scope, or enforce Domain identity — not merely mention the word Domain?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'publicExperience',
    family: 'architecture',
    type: 'choice',
    instructions:
      'Does this code participate materially in the public Keeper experience (Present, Cover, guest/companion), not only authenticated member boards?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'legacyUiDependent',
    family: 'architecture',
    type: 'choice',
    instructions:
      'Does this appear dependent on legacy Keeper UI/architecture (standalone ?frame=* routes, EngagementForm on board Chronicle, retired /library, dual unmounted Journey routes)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'frameStageArchitecture',
    family: 'architecture',
    type: 'choice',
    instructions:
      'Does this implement or reinforce current frame/Stage-oriented architecture (Universal Board, Stage as room, story as filmstrip, Chronicle Focus/Config/Act)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'domainTruthContradiction',
    family: 'architecture',
    type: 'choice',
    instructions:
      'Could this code contradict a domain-scoped truth requirement — e.g. leak across domains, treat platform truth as domain truth, or skip Domain scoping on a write?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'participatesDomain',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Domain behavior (identity, scoping, frame, or settings)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesStage',
    family: 'object',
    type: 'choice',
    instructions:
      'Does this unit materially participate in Stage behavior — the room/screen — not merely mention Stage or store a story filmstrip?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesDialog',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Dialog behavior (conversation object, session resume, Document host)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesPoint',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Point behavior (create, accept, rewrite, promote, or render a Point)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesMoment',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Moment behavior in the narrative hierarchy?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesPresence',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Presence behavior (Chronicle Focus / Config / Act render of a subject)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesChronicle',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Chronicle behavior (right-panel meaning, change, or state)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesAgent',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Agent behavior (Lead, Cast, consult, execution, or agent config)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesCapability',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Capability behavior (define, grant, resolve, invoke, or verify)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'participatesDocument',
    family: 'object',
    type: 'choice',
    instructions: 'Does this unit materially participate in Document behavior (Dialog workspace scaffolding, manuscript Points, reorganize)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'mutationKind',
    family: 'mutation',
    type: 'choice',
    instructions: 'What kind of state can this code write or mutate?',
    criteria: {
      none: 'Read-only or display-only. No durable write.',
      'local-ui': 'Mutates client/UI state only.',
      'keeper-data': 'Writes Keeper data (Prisma, Domain.settings, Document, Points, Stage story, sessions).',
      'external-system': 'Writes an external system (LLM vendor, email, blob, MCP).',
      unclear: 'Evidence is insufficient to decide.',
    },
  },
  {
    id: 'canModifyPoints',
    family: 'mutation',
    type: 'choice',
    instructions: 'Could this code create or modify Points?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'silentSuccess',
    family: 'mutation',
    type: 'choice',
    instructions:
      'Does this code appear capable of silently reporting or implying success without verifying resulting state?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'agentExecution',
    family: 'agency',
    type: 'choice',
    instructions: 'Does this code participate in Agent execution (running a model, executing actions, or consulting Cast)?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'capabilityRole',
    family: 'agency',
    type: 'choice',
    instructions: 'Does it define, grant, resolve, invoke, or verify a capability?',
    criteria: {
      define: 'Declares what a capability is.',
      grant: 'Assigns or ceilings a capability.',
      resolve: 'Computes the effective set.',
      invoke: 'Calls or executes a capability/action.',
      verify: 'Checks that a capability was actually available or succeeded.',
      multiple: 'More than one of define/grant/resolve/invoke/verify.',
      none: 'No capability role.',
      unclear: 'Evidence is insufficient to decide.',
    },
  },
  {
    id: 'capabilityKnowledge',
    family: 'agency',
    type: 'choice',
    instructions: 'Does this code provide capability knowledge or operational instructions to an Agent — not merely an allowlist?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'llmInfersCapability',
    family: 'agency',
    type: 'choice',
    instructions:
      'Does it rely on an LLM to infer capability behavior rather than providing explicit operational knowledge?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'possibleDuplication',
    family: 'drift',
    type: 'choice',
    instructions:
      'Does this appear to implement a concept that may exist elsewhere in Keeper? Exploratory — likely is not proof of duplication.',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'architectureAlignment',
    family: 'drift',
    type: 'choice',
    instructions: 'Does this unit appear aligned with current Keeper architecture, transitional, or legacy?',
    criteria: {
      current: 'Reinforces Stage/frame Universal Board, Domain-scoped Agency, verified action.',
      transitional: 'Bridges current and older systems on purpose.',
      legacy: 'Depends on retired or superseded architecture.',
      unclear: 'Evidence is insufficient to decide.',
    },
  },
  {
    id: 'reliabilityImpact',
    family: 'risk',
    type: 'choice',
    instructions: 'Would misunderstanding this code likely affect Keeper reliability?',
    criteria: {
      high: 'A wrong change here would likely break identity, mutation, Agency, or verification.',
      medium: 'A wrong change would likely cause a noticeable but contained defect.',
      low: 'Misunderstanding would be cheap.',
      unclear: 'Evidence is insufficient to decide.',
    },
  },
  {
    id: 'valuableForCloud',
    family: 'risk',
    type: 'choice',
    instructions: 'Would this unit be valuable for Cloud to understand before making related changes?',
    criteria: YES_NO_UNCLEAR,
  },
  {
    id: 'confusesStageStoryDocument',
    family: 'discovery',
    type: 'choice',
    instructions:
      'Does this confuse Stage (room), Story (filmstrip), and Document (Dialog workspace) — collapsing two of them into one object?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'secondImplementation',
    family: 'discovery',
    type: 'choice',
    instructions:
      'Does this appear to be a second implementation of an already-mounted Journey, Dialog, or board path (inactive twin, parallel route, or copy)?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'grantAsKnowledge',
    family: 'discovery',
    type: 'choice',
    instructions:
      'Does this treat capability grant or allowlist membership as sufficient operational knowledge for an Agent?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
  {
    id: 'synthesizesUnperformedWork',
    family: 'discovery',
    type: 'choice',
    instructions:
      'Does this appear able to synthesize or perform work that should have been executed by another agent or surface (e.g. Lead speaking for Cast, UI claiming a write that did not land)?',
    criteria: LIKELY_UNLIKELY_UNCLEAR,
  },
];

export function toTypeSafeQuestions(defs: XrayQuestionDef[] = KEEPER_XRAY_QUESTIONS): TypeSafeQuestions {
  const questions: TypeSafeQuestions = {};
  for (const def of defs) {
    questions[def.id] = {
      type: 'choice',
      instructions: def.instructions,
      criteria: def.criteria,
    };
  }
  return questions;
}

export function questionById(id: string): XrayQuestionDef | undefined {
  return KEEPER_XRAY_QUESTIONS.find((row) => row.id === id);
}
