/**
 * Kip action allowlist — the set executeAgentActions actually gates on.
 * Extracted from agents.ts so Lead, Cloud, MCP, and REST share one source.
 *
 * This is a read of existing authority, not a new enforcement plane.
 * mcp.call is intentionally absent: System/Cloud merge it later; Lead cannot.
 */

import {
  DEFAULT_POLICY_PACK_V1,
  buildPolicyPackFromEnvironment,
} from './policyPack.js';

/** Actions the executor always allows — domain policy cannot remove them. */
export const GOLDEN_PATH_ACTIONS = [
  'draft.setActive',
  'draft.create',
  'image.generate',
  'draft.update',
  'draft.update.propose',
  'treatment.propose',
  'document.reorganize.propose',
  'stage.story.layout',
  'draft.point.accept',
  'draft.point.rewrite',
  'gloss.append',
  'draft.delete',
  'moment.create',
  'sole.save',
  'sole.read',
  'library.read',
  'dialog.read',
  'glossary.read',
  'journey.read',
  'moment.read',
  'keeper.read',
  'web.search',
] as const;

export type GoldenPathAction = (typeof GOLDEN_PATH_ACTIONS)[number];

/**
 * Action types with handlers in executeAgentActions.
 * Keep in sync with the switch in api/kip/agents.ts.
 */
export const KIP_ACTION_HANDLERS = [
  'draft.create',
  'draft.update',
  'draft.update.propose',
  'draft.point.accept',
  'draft.point.promote',
  'draft.point.rewrite',
  'gloss.append',
  'draft.delete',
  'draft.list',
  'draft.get',
  'draft.read',
  'draft.setActive',
  'image.generate',
  'treatment.propose',
  'document.reorganize.propose',
  'stage.story.layout',
  'moment.create',
  'sole.save',
  'sole.read',
  'library.read',
  'dialog.read',
  'glossary.read',
  'journey.read',
  'moment.read',
  'keeper.read',
  'web.search',
  'mcp.call',
  'delegate.consult',
] as const;

export type KipActionHandler = (typeof KIP_ACTION_HANDLERS)[number];

/** Cloud/System-only. Never on the Lead golden path. */
export const SYSTEM_ONLY_ACTIONS = ['mcp.call'] as const;

export type KipAllowlistEnvironment = {
  policyPack?: { actions?: { allow?: string[] } };
  policy?: unknown;
  domainAgents?: unknown[];
} | null | undefined;

/**
 * Same union the executor uses: policy pack allow + golden path +
 * delegate.consult when a domain agent roster is present.
 */
export function buildAllowedActions(environment?: KipAllowlistEnvironment): Set<string> {
  const pack = buildPolicyPackFromEnvironment(environment);
  const allow = new Set(
    Array.isArray(pack?.actions?.allow) ? pack.actions.allow : DEFAULT_POLICY_PACK_V1.actions.allow,
  );
  for (const action of GOLDEN_PATH_ACTIONS) {
    allow.add(action);
  }
  const domainAgents = environment?.domainAgents;
  if (Array.isArray(domainAgents) && domainAgents.length > 0) {
    allow.add('delegate.consult');
  }
  return allow;
}

export type KipActionAllowlistStatus = {
  surface: 'kip_action_allowlist';
  /** Union the Lead executor will accept (no mcp.call). */
  allowed: string[];
  /** Always-on; domain policy cannot strip these. */
  goldenPath: string[];
  /** From the domain policy pack before golden-path merge. */
  policyAllow: string[];
  /** Handler exists in executeAgentActions. */
  handlers: string[];
  /** Allowed but no handler — executor returns unhandled error. */
  allowedWithoutHandler: string[];
  /** Handler exists but not on this allowlist (e.g. mcp.call for Lead). */
  handlersNotAllowed: string[];
  /** JWT domain write permission. Null when no session is bound. */
  canDraft: boolean | null;
  canDraftNote: string;
  delegateConsult: 'allowed' | 'not_applicable';
  note: string;
};

export type BuildKipActionAllowlistStatusParams = {
  environment?: KipAllowlistEnvironment;
  canDraft?: boolean | null;
};

export function buildKipActionAllowlistStatus(
  params: BuildKipActionAllowlistStatusParams = {},
): KipActionAllowlistStatus {
  const pack = buildPolicyPackFromEnvironment(params.environment);
  const policyAllow = [...(pack.actions.allow ?? [])];
  const allowedSet = buildAllowedActions(params.environment);
  const allowed = Array.from(allowedSet).sort();
  const handlerSet = new Set<string>(KIP_ACTION_HANDLERS);
  const allowedWithoutHandler = allowed.filter((action) => !handlerSet.has(action));
  const handlersNotAllowed = KIP_ACTION_HANDLERS.filter((action) => !allowedSet.has(action));
  const roster = params.environment?.domainAgents;
  const hasRoster = Array.isArray(roster) && roster.length > 0;
  const canDraft = params.canDraft === undefined ? null : params.canDraft;

  return {
    surface: 'kip_action_allowlist',
    allowed,
    goldenPath: [...GOLDEN_PATH_ACTIONS],
    policyAllow,
    handlers: [...KIP_ACTION_HANDLERS],
    allowedWithoutHandler,
    handlersNotAllowed,
    canDraft,
    canDraftNote:
      canDraft === null
        ? 'canDraft is JWT session + domain write permission, not an MCP scope. Unresolved without a bound user and domain. Prompt-injected today; the executor gates on allowed[], not canDraft.'
        : canDraft
          ? 'Session has domain write permission (canDraft). Executor still gates on allowed[], not this flag.'
          : 'Session lacks domain write permission (canDraft=false). Executor still gates on allowed[]; this flag is prompt context only.',
    delegateConsult: hasRoster ? 'allowed' : 'not_applicable',
    note: 'Lead executor allowlist. mcp.call is Cloud/System-only and is not on this list. This read does not change enforcement.',
  };
}
