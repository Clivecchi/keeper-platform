/**
 * KIP Agent Service API
 * ===================
 * 
 * Handles KIP (Keeper Interface Protocol) agent operations
 * Provides endpoints for managing and running agents
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { Prisma } from '@prisma/client';
import { logger } from '@keeper/shared';
import {
  appendDraftPointToSpec,
  buildDraftSummaryFromAcceptedPoints,
  createDraftPoint,
  findDraftPoint,
  mergeDraftSpecPatch,
  updateDraftPointInSpec,
  type DraftPointType,
} from '@keeper/shared';
import { isDbDisabled } from '../../lib/env.js';
import { MOCK_AGENTS } from '../../services/kip/mockAgents.js';
import { resolveAgentEnvironment, type AgentEnvironmentContext } from '../../services/kip/resolveAgentEnvironment.js';
import type { KipEnvironmentContext } from '../../services/kip/buildKipEnvironmentContext.js';
import type { 
  AgentInput, 
  AgentResponse, 
  KipCommandIntent, 
  KipSessionInput, 
  KipMessageInput,
  KipSessionWithRelations,
  KipMessageWithRelations,
  ModelProvider,
  ModelSettings
} from '@keeper/database';
import { ModelProviderService, ModelMessage, ModelContentPart, ModelProviderErrorCode } from '../../services/ModelProviderService.js';
import type { ImageGenerationBrief } from '../../services/ModelProviderService.js';
import { SoleMemoryService } from '../../services/SoleMemoryService.js';
import { findOrCreateKipDialog } from '../../services/kipDialogLifecycle.js';
import {
  preExecGovernanceCheck,
  postExecGovernanceCheck,
  checkRegenerateLimit,
  logComplianceEvent,
  getContractTextForDomain,
} from '../../governance/index.js';
import { loadModeState } from '../../services/kip/modeConfig.js';
import type { AgentModeKey, AgentModeState, ModeConfig, OutputStyle } from '../../services/kip/modeConfig.js';
import type { DomainResolvedRequest } from '../../middleware/domainResolutionMiddleware.js';
import {
  DEFAULT_POLICY_PACK_V1,
  DEFAULT_POLICY_VERSION,
  buildPolicyPackFromEnvironment,
  buildActionPack,
  type ActionPack,
} from '../../policy/policyPack.js';
import {
  parseActionsOrThrow,
  safeParseActions,
  isActionParseSuccess,
  CORE_ACTIONS,
  normalizeSummary,
  type ActionValidationError,
  type CoreActionType,
  type ImageGenerateAction,
} from './actions/schema.js';

type AgentErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_MODEL'
  | 'PROVIDER_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'AGENT_MISCONFIGURED'
  | 'UNKNOWN';

type DebugBundleEntry = {
  id?: string;
  requestId?: string;
  method?: string;
  url?: string;
  status?: number | null;
  action?: string | null;
  durationMs?: number | null;
  error?: {
    message?: string;
    code?: string;
    constraint?: string;
  };
};

type DebugBundleInput = {
  entries?: DebugBundleEntry[];
  failures?: DebugBundleEntry[];
  authContextKeysPresent?: {
    hasUser?: boolean;
    hasAuth?: boolean;
    hasKam?: boolean;
    userKeys?: string[];
    authKeys?: string[];
    kamKeys?: string[];
    authorizationHeaderPresent?: boolean;
  };
  symptom?: string | null;
};

type AgentAttachmentInput = { url: string; name: string; type: 'image' | 'file' };

type RunAgentOptions = {
  domainId?: string | null;
  domainSlug?: string | null;
  mode?: AgentModeKey;
  debugBundle?: DebugBundleInput | null;
  environment?: AgentEnvironmentContext | KipEnvironmentContext | null;
  forceSkipActions?: boolean;
  /** When set, only these action types are skipped (e.g. draft.create after draftIntent handled). */
  skipActionTypes?: Set<string>;
  actionPack?: ActionPack;
  draftIntentResult?: DraftIntentResult | null;
  activeJourneyId?: string | null;
  activeKeeperId?: string | null;
  attachments?: AgentAttachmentInput[];
};

function isOperationalDraftAgent(agent: { agent_class?: string | null; config?: unknown }): boolean {
  if (agent.agent_class === 'System') return true;
  const config = agent.config;
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return (config as Record<string, unknown>).suppress_kip_system_prompt === true;
  }
  return false;
}

function buildDraftUpdateInstruction(agent: { agent_class?: string | null; config?: unknown }): string {
  const proposePoints =
    '- When adding or changing draft CONTENT (points, sections, narrative), use draft.update.propose with payload.id (draft UUID), payload.content (the proposed text), and optional payload.type (moment | decision | context | general — default general). Each call appends one proposed point; the human must Accept in the UI before it is canonical.';
  if (isOperationalDraftAgent(agent)) {
    return `${proposePoints}\n- For draft METADATA only (title, summary, status, kind), you may use draft.update directly with payload.id and the changed fields. Never invent action types like add_point — only use actions from the allowlist.`;
  }
  return proposePoints;
}

class AgentExecutionError extends Error {
  code: AgentErrorCode;
  details?: Record<string, unknown>;

  constructor(code: AgentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgentExecutionError';
    this.code = code;
    this.details = details;
  }
}

type DraftSection = { id: string; title: string; bullets: string[] };
type DraftIntentPayload = {
  draftId?: string;
  title?: string;
  kind?: string;
  summary?: string;
  status?: string;
  spec?: Record<string, any>;
  setActive?: boolean;
  key?: string;
  raw?: string;
};
type DraftIntentResult = {
  triggered: boolean;
  created?: boolean;
  updated?: boolean;
  draft?: {
    id: string;
    title: string;
    kind: string;
    status: string;
    key: string | null;
    summary: string | null;
    spec: Prisma.JsonValue | null;
    updatedAt: Date;
  };
  setActive?: boolean;
  reason?: string;
  error?: string;
};

const extractFieldFromText = (label: string, input: string): string | null => {
  const regex = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, 'i');
  const match = input.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
};

const deriveTitleFromText = (input: string): string => {
  const firstLine = input.split(/\r?\n/).find((line) => line.trim().length > 0) || input;
  return firstLine.replace(/^draft(?:\s*this)?[:\-]?\s*/i, '').trim().slice(0, 120) || 'Draft';
};

const extractSummaryFromText = (input: string): string | null => {
  const summaryLine = extractFieldFromText('summary', input);
  if (summaryLine) return summaryLine;
  const paragraphs = input.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs[0].slice(0, 500) : null;
};

const extractSectionsFromText = (input: string): DraftSection[] => {
  const lines = input.split(/\r?\n/);
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;

  const pushCurrent = () => {
    if (current) {
      sections.push({ ...current, bullets: current.bullets.filter(Boolean) });
      current = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      pushCurrent();
      continue;
    }

    const headingMatch = trimmed.match(/^(?:[-*]\s*)?([A-Za-z0-9 ][^:]{2,}):\s*(.*)$/);
    if (headingMatch) {
      pushCurrent();
      const title = headingMatch[1].trim();
      const firstBullet = headingMatch[2]?.trim();
      current = { id: slugifyKey(title), title, bullets: [] };
      if (firstBullet) current.bullets.push(firstBullet);
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-*]\s+)(.+)$/);
    if (bulletMatch && current) {
      current.bullets.push(bulletMatch[1].trim());
      continue;
    }
  }

  pushCurrent();
  return sections.slice(0, 20);
};

const extractRulesFromText = (input: string): string[] => {
  const rules: string[] = [];
  const lines = input.split(/\r?\n/);
  let collecting = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      collecting = false;
      continue;
    }

    if (/^(rules|guardrails|constraints)\s*[:]/i.test(line)) {
      collecting = true;
      continue;
    }

    if (collecting && /^[-*]/.test(line)) {
      rules.push(line.replace(/^[-*]\s*/, '').trim());
      continue;
    }

    if (!collecting && /\bmust\b|\bshould\b|do not/i.test(line) && rules.length < 10) {
      rules.push(line);
    }
  }

  return Array.from(new Set(rules));
};

const parseDraftIntentFromText = (input: string): DraftIntentPayload => {
  const title = extractFieldFromText('title', input) ?? deriveTitleFromText(input);
  const kind = extractFieldFromText('kind', input) ?? 'draft';
  const summary = extractSummaryFromText(input) ?? '';
  const sections = extractSectionsFromText(input);
  const rules = extractRulesFromText(input);
  const setActive = /set active|make this active/i.test(input);

  return {
    title,
    kind,
    summary,
    status: 'draft',
    spec: {
      purpose: summary,
      sections,
      rules,
    },
    setActive,
    raw: input,
  };
};

const detectDraftIntent = (input: string, body: any): DraftIntentPayload | null => {
  if (body?.draftIntent && typeof body.draftIntent === 'object') {
    return { ...(body.draftIntent as DraftIntentPayload), raw: body?.input ?? input };
  }

  const normalized = input?.trim() || '';
  if (!normalized) return null;

  const hasDraftKeyword = /draft this/i.test(normalized) || /^draft\s*[:\-]/i.test(normalized);
  const hasKindAndTitle = /kind\s*[:\-]/i.test(normalized) && /title\s*[:\-]/i.test(normalized);

  if (!hasDraftKeyword && !hasKindAndTitle) {
    return null;
  }

  return parseDraftIntentFromText(normalized);
};

const normalizeSpecPayload = (
  spec: unknown,
  raw: string,
  ctx: { sessionId?: string | null; requestId?: string | null },
): Prisma.JsonValue => {
  const base = spec && typeof spec === 'object' ? { ...(spec as Record<string, any>) } : {};
  return {
    ...base,
    raw: base.raw ?? raw,
    source: base.source ?? {
      type: 'user_message',
      sessionId: ctx.sessionId ?? null,
      requestId: ctx.requestId ?? null,
      createdAt: new Date().toISOString(),
    },
  };
};

async function processDraftIntent(
  payload: DraftIntentPayload,
  ctx: { domainId?: string | null; userId?: string | null; agentId?: string | null; sessionId?: string | null; requestId?: string },
): Promise<DraftIntentResult> {
  const { draftId } = payload;
  let domainId = ctx.domainId ?? null;
  let userId = ctx.userId ?? null;

  try {
    let existingDraft: {
      id: string;
      domain_id: string;
      owner_id: string;
      kind: string;
      key: string | null;
      title: string;
      status: string;
      summary: string | null;
      spec_json: Prisma.JsonValue | null;
      updated_at: Date;
    } | null = null;

    if ((!domainId || !userId) && draftId) {
      existingDraft = await prisma.kip_drafts.findUnique({
        where: { id: draftId },
        select: {
          id: true,
          domain_id: true,
          owner_id: true,
          kind: true,
          key: true,
          title: true,
          status: true,
          summary: true,
          spec_json: true,
          updated_at: true,
        },
      });
      domainId = domainId ?? existingDraft?.domain_id ?? null;
      userId = userId ?? existingDraft?.owner_id ?? null;
    }

    if (!domainId || !userId) {
      return {
        triggered: true,
        reason: 'missing_context',
        error: 'Draft intent requires domain and user context',
      };
    }

    const now = new Date();
    const title = payload.title?.trim() || existingDraft?.title || 'Draft';
    const kind = payload.kind?.trim() || existingDraft?.kind || 'draft';
    const status = payload.status?.trim() || existingDraft?.status || 'draft';
    const key = slugifyKey(payload.key || title || existingDraft?.key || `draft-${Date.now()}`);
    const summary = payload.summary ?? existingDraft?.summary ?? null;
    const specToPersist = normalizeSpecPayload(payload.spec ?? existingDraft?.spec_json ?? {}, payload.raw ?? title, {
      sessionId: ctx.sessionId,
      requestId: ctx.requestId ?? null,
    });

    const result = await prisma.$transaction(async (tx) => {
      let draftRecord =
        existingDraft ||
        (draftId
          ? await tx.kip_drafts.findFirst({
              where: { id: draftId, domain_id: domainId, owner_id: userId },
            })
          : null);

      if (!draftRecord) {
        draftRecord = await tx.kip_drafts.findFirst({
          where: { domain_id: domainId, owner_id: userId, kind, key },
        });
      }

      let created = false;
      if (!draftRecord) {
        draftRecord = await tx.kip_drafts.create({
          data: {
            domain_id: domainId,
            owner_id: userId,
            agent_id: ctx.agentId ?? null,
            kind,
            key,
            title,
            summary,
            status,
            spec_json: specToPersist,
            updated_at: now,
          },
        });
        created = true;
      } else {
        draftRecord = await tx.kip_drafts.update({
          where: { id: draftRecord.id },
          data: {
            title,
            summary,
            status,
            spec_json: specToPersist,
            updated_at: now,
          },
        });
      }

      let setActiveApplied = false;
      const shouldSetActive = payload.setActive === true || (payload.setActive === undefined && created && !!ctx.sessionId);

      if (shouldSetActive && ctx.sessionId) {
        const sessionUpdate = await tx.kip_sessions.updateMany({
          where: {
            id: ctx.sessionId,
            ...(userId ? { user_id: userId } : {}),
          },
          data: {
            active_draft_id: draftRecord.id,
            updated_at: now,
          },
        });
        setActiveApplied = sessionUpdate.count > 0;
      }

      return { draftRecord, created, setActiveApplied };
    });

    return {
      triggered: true,
      created: result.created,
      updated: !result.created,
      setActive: result.setActiveApplied,
      draft: {
        id: result.draftRecord.id,
        title: result.draftRecord.title,
        kind: result.draftRecord.kind,
        status: result.draftRecord.status,
        key: result.draftRecord.key,
        summary: result.draftRecord.summary,
        spec: result.draftRecord.spec_json,
        updatedAt: result.draftRecord.updated_at,
      },
    };
  } catch (error) {
    return {
      triggered: true,
      reason: 'error',
      error: error instanceof Error ? error.message : 'Draft intent processing failed',
    };
  }
}

type StructuredAgentAction = { type: string; payload?: Record<string, any> | null };
type ActionExecutionResult = {
  type: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  errorCode?: string;
  data?: {
    entityIds?: string[];
    draft?: { id: string; title: string; kind: string; key: string };
    links?: { open?: string; edit?: string };
    // Optional: minimal payload for other future entity types
    [key: string]: unknown;
  };
};

const ACTION_DRAFT_LIMIT = 25;
const ACTION_ENVELOPE_TYPE = 'agent_output';

function buildAllowedActions(environment?: AgentEnvironmentContext | KipEnvironmentContext | null): Set<string> {
  const pack = buildPolicyPackFromEnvironment(environment);
  const allow = new Set(Array.isArray(pack?.actions?.allow) ? pack.actions.allow : DEFAULT_POLICY_PACK_V1.actions.allow);
  // Golden Path actions — always allowed (domain policy cannot block core capabilities)
  allow.add('draft.setActive');
  allow.add('draft.create');
  allow.add('image.generate');
  allow.add('draft.update');
  allow.add('draft.update.propose');
  allow.add('draft.point.accept');
  allow.add('draft.delete');
  allow.add('moment.create');
  allow.add('sole.save');
  allow.add('sole.read');
  allow.add('journey.read');
  allow.add('moment.read');
  allow.add('keeper.read');
  return allow;
}

function buildActionPackFromAllowlist(allowlist: Set<string>): ActionPack {
  return buildActionPack(Array.from(allowlist));
}

function buildActionPackFromEnvironment(environment?: AgentEnvironmentContext | KipEnvironmentContext | null): ActionPack {
  const allow = buildAllowedActions(environment);
  return buildActionPackFromAllowlist(allow);
}

function slugifyKey(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'draft'
  );
}

/**
 * Extract JSON object from mixed response (prose + JSON).
 * Tries: 1) direct parse, 2) find first { ... } containing "response" or "actions".
 */
function extractJsonFromResponse(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    /* not valid JSON, try extraction */
  }
  const jsonMatch = trimmed.match(/\{[\s\S]*"(?:response|actions)"[\s\S]*\}/);
  if (jsonMatch) {
    const candidate = jsonMatch[0];
    try {
      const obj = JSON.parse(candidate);
      if (typeof obj === 'object' && obj !== null && (typeof obj.response === 'string' || Array.isArray(obj.actions))) {
        return candidate;
      }
    } catch {
      /* try to find balanced braces */
    }
  }
  const fromNewline = trimmed.match(/\n\s*(\{[\s\S]*\})\s*$/);
  if (fromNewline) {
    try {
      JSON.parse(fromNewline[1]);
      return fromNewline[1];
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseStructuredAgentResponse(
  raw: string,
  requestId?: string,
): { responseText: string; actions: StructuredAgentAction[]; raw: string; ignoredReason?: string; validationError?: ActionValidationError } {
  const trimmed = raw.trim();

  if (trimmed.startsWith('```')) {
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(stripped);
      const responseText = typeof parsed?.response === 'string' ? parsed.response : stripped;
      const actionsResult = safeParseActions(parsed);
      if (isActionParseSuccess(actionsResult)) {
        return { responseText, actions: actionsResult.actions, raw };
      }
      const legacyActions = Array.isArray(parsed?.actions)
        ? parsed.actions
            .filter((action: any) => action && typeof action.type === 'string')
            .map((action: any) => ({ type: action.type, payload: action.payload ?? null }))
        : [];
      return { responseText, actions: legacyActions, raw };
    } catch {
      return { responseText: stripped, actions: [], raw, ignoredReason: 'fenced_response' };
    }
  }

  const jsonStr = extractJsonFromResponse(trimmed) ?? trimmed;
  try {
    const parsed = JSON.parse(jsonStr);
    const responseText = typeof parsed?.response === 'string' ? parsed.response : raw;

    // Try to parse actions using canonical schema
    const actionsResult = safeParseActions(parsed);
    
    if (!isActionParseSuccess(actionsResult)) {
      const validationError = actionsResult.error;
      logger.warn({
        requestId,
        reason: 'action_validation_failed',
        error: validationError.message,
        context: validationError.context,
      }, '[kip.actions] failed to parse actions from agent response');
      
      // Fallback to legacy parsing for backward compatibility
      if (parsed?.type !== ACTION_ENVELOPE_TYPE) {
        return { responseText, actions: [], raw, ignoredReason: 'missing_agent_output_envelope', validationError };
      }

      const legacyActions = Array.isArray(parsed?.actions)
        ? parsed.actions
            .filter((action: any) => action && typeof action.type === 'string')
            .map((action: any) => ({
              type: action.type,
              payload: action.payload ?? null,
            }))
        : [];

      return { responseText, actions: legacyActions, raw, validationError };
    }

    return { responseText, actions: actionsResult.actions, raw };
  } catch (error) {
    const fallbackJson = extractJsonFromResponse(raw);
    if (fallbackJson) {
      try {
        const parsed = JSON.parse(fallbackJson);
        const responseText = typeof parsed?.response === 'string' ? parsed.response : raw;
        const actionsResult = safeParseActions(parsed);
        if (isActionParseSuccess(actionsResult)) {
          return { responseText, actions: actionsResult.actions, raw };
        }
        const legacyActions = Array.isArray(parsed?.actions)
          ? parsed.actions
              .filter((action: any) => action && typeof action.type === 'string')
              .map((action: any) => ({ type: action.type, payload: action.payload ?? null }))
          : [];
        return { responseText, actions: legacyActions, raw };
      } catch {
        /* fall through */
      }
    }
    return {
      responseText:
        'I had trouble formatting that response. Please try again — use draft.update.propose for draft points, not custom action types.',
      actions: [],
      raw,
      ignoredReason: 'invalid_json',
    };
  }
}

/**
 * Build draft open URL
 */
function buildDraftOpenUrl(domainSlug: string, draftId: string): string {
  const webOrigin = process.env.WEB_ORIGIN || process.env.NEXT_PUBLIC_WEB_ORIGIN || 'https://www.ke3p.com';
  // Use relative URL if we can't determine origin reliably
  if (!webOrigin || webOrigin.includes('localhost') || webOrigin.includes('127.0.0.1')) {
    return `/d/${domainSlug}/agent?view=drafts&draftId=${draftId}`;
  }
  return `${webOrigin}/d/${domainSlug}/agent?view=drafts&draftId=${draftId}`;
}

/**
 * Redact sensitive headers from log data
 */
function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...headers };
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  for (const key of sensitiveKeys) {
    const lowerKey = key.toLowerCase();
    for (const headerKey in redacted) {
      if (headerKey.toLowerCase() === lowerKey && redacted[headerKey]) {
        redacted[headerKey] = '[REDACTED]';
      }
    }
  }
  return redacted;
}

/**
 * Get request ID from context or generate one
 */
function getRequestId(ctx: { requestId?: string }): string {
  return ctx.requestId || randomUUID();
}

export async function executeAgentActions(
  actions: StructuredAgentAction[],
  ctx: { domainId?: string | null; domainSlug?: string | null; userId?: string; agentId?: string | null; allowlist: Set<string>; sessionId?: string | null; keeperId?: string | null; requestId?: string; skipActionTypes?: Set<string> },
): Promise<{ results: ActionExecutionResult[]; failedMessage: string | null }> {
  const requestId = getRequestId(ctx);
  const results: ActionExecutionResult[] = [];
  
  if (!actions.length) {
    logger.info({
      requestId,
      domainId: ctx.domainId,
      userId: ctx.userId,
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      count: 0,
    }, '[kip.actions] received: no actions');
    return { results, failedMessage: null };
  }

  // Log received actions
  const actionTypes = actions.map(a => a.type);
  logger.info({
    requestId,
    domainId: ctx.domainId,
    userId: ctx.userId,
    agentId: ctx.agentId,
    sessionId: ctx.sessionId,
    count: actions.length,
    types: actionTypes,
  }, '[kip.actions] received');

  // Normalize draft.create payloads (map common model mistakes to schema)
  const VALID_KINDS = ['journey_spec', 'keeper_type_proposal', 'vehicle_template', 'checklist_spec', 'development_journey', 'conversation_review', 'domain_json'];
  const normalizedActions = actions.map((action) => {
    if (
      action.type === 'draft.update.propose'
      && action.payload
      && typeof action.payload === 'object'
    ) {
      const p = action.payload as Record<string, unknown>;
      const out: Record<string, unknown> = { ...p };
      if (!out.id && typeof out.draftId === 'string') out.id = out.draftId;
      if (!out.content && typeof p.summary === 'string') out.content = p.summary;
      if (!out.content && typeof p.text === 'string') out.content = p.text;
      return { type: action.type, payload: out };
    }
    if (
      action.type === 'draft.update'
      && action.payload
      && typeof action.payload === 'object'
    ) {
      const p = action.payload as Record<string, unknown>;
      const out: Record<string, unknown> = { ...p };
      if (!out.id && typeof out.draftId === 'string') out.id = out.draftId;
      return { type: action.type, payload: out };
    }
    if (action.type !== 'draft.create' || !action.payload || typeof action.payload !== 'object') return action;
    const p = action.payload as Record<string, unknown>;
    const out: Record<string, unknown> = { ...p };
    if (!out.kind && typeof p.type === 'string') {
      const t = (p.type as string).toLowerCase().replace(/\s+/g, '_');
      out.kind = VALID_KINDS.includes(t) ? t : 'journey_spec';
    }
    if (!out.kind && typeof p.kind !== 'string') out.kind = 'journey_spec';
    if (!out.title && typeof p.view === 'string') out.title = p.view;
    if (!out.title && typeof p.title !== 'string') out.title = 'Draft';
    if (!out.key || typeof out.key !== 'string') {
      const title = (out.title as string) || 'draft';
      out.key = slugifyKey(title) + '-' + Math.random().toString(36).slice(2, 8);
    }
    if (!out.spec || typeof out.spec !== 'object') out.spec = out.spec ? { ...(out.spec as object) } : {};
    if (out.type && !VALID_KINDS.includes(out.type as string)) delete out.type;
    if (typeof p.keeperId === 'string' && p.keeperId.trim()) out.keeperId = p.keeperId.trim();
    return { type: action.type, payload: out };
  });

  // Validate actions using canonical schema - FAIL FAST on validation errors
  let validatedActions: StructuredAgentAction[] = [];
  try {
    const validationResult = safeParseActions({ type: ACTION_ENVELOPE_TYPE, actions: normalizedActions });
    if (isActionParseSuccess(validationResult)) {
      validatedActions = validationResult.actions;
      logger.info({
        requestId,
        count: validatedActions.length,
        types: validatedActions.map(a => a.type),
      }, '[kip.actions] validated');
    } else {
      const validationError = validationResult.error;
      logger.error({
        requestId,
        error: validationError.message,
        context: validationError.context,
        actions: actions.map(a => ({ type: a.type, hasPayload: !!a.payload })),
      }, '[kip.actions] validation failed - failing fast');
      
      // Fail fast: return error results for all actions instead of continuing
      const errorResults: ActionExecutionResult[] = actions.map((action) => ({
        type: action.type,
        status: 'error',
        message: `Action validation failed: ${validationError.message}`,
        errorCode: 'VALIDATION_ERROR',
        data: undefined,
      }));
      
      return { results: errorResults, failedMessage: validationError.message };
    }
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown validation error',
      actions: actions.map(a => ({ type: a.type, hasPayload: !!a.payload })),
    }, '[kip.actions] validation error - failing fast');
    
    // Fail fast: return error results for all actions
    const errorResults: ActionExecutionResult[] = actions.map((action) => ({
      type: action.type,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'VALIDATION_ERROR',
      data: undefined,
    }));
    
    return { results: errorResults, failedMessage: error instanceof Error ? error.message : 'Unknown validation error' };
  }

  // Check for core action handlers
  const supportedActions = new Set([
    'draft.create',
    'draft.update',
    'draft.update.propose',
    'draft.point.accept',
    'draft.delete',
    'draft.list',
    'draft.get',
    'draft.read',
    'draft.setActive',
    'image.generate',
    'moment.create',
    'sole.save',
    'sole.read',
    'journey.read',
    'moment.read',
    'keeper.read',
  ]);

  for (const coreAction of CORE_ACTIONS) {
    if (!supportedActions.has(coreAction)) {
      const errorMsg = `[kip.actions] missing core handler ${coreAction}`;
      logger.error({ requestId, coreAction }, errorMsg);
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(errorMsg);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const action of validatedActions) {
      const baseResult: ActionExecutionResult = { 
        type: action.type, 
        status: 'skipped',
        message: 'Action skipped',
      };
      const actionStartTime = Date.now();

      try {
        // Log executing action
        const payloadIdentifiers: Record<string, unknown> = {};
        if (action.payload) {
          if (typeof action.payload === 'object' && action.payload !== null) {
            const p = action.payload as Record<string, unknown>;
            if (p.id) payloadIdentifiers.id = p.id;
            if (p.draftId) payloadIdentifiers.draftId = p.draftId;
            if (p.key) payloadIdentifiers.key = p.key;
            if (p.kind) payloadIdentifiers.kind = p.kind;
          }
        }

        logger.info({
          requestId,
          actionType: action.type,
          ...payloadIdentifiers,
        }, '[kip.actions] executing');

        if (ctx.skipActionTypes?.has(action.type)) {
          results.push({
            type: action.type,
            status: 'skipped',
            message: 'Action skipped (handled by draft intent pipeline)',
          });
          continue;
        }

        if (!ctx.allowlist.has(action.type)) {
          const reason = 'Action not allowed by policy';
          logger.warn({
            requestId,
            actionType: action.type,
            reason,
          }, '[kip.actions] rejected');
          results.push({ 
            type: action.type,
            status: 'error', 
            message: reason, 
            errorCode: 'NOT_ALLOWED',
          });
          continue;
        }

        if (!ctx.domainId || !ctx.userId) {
          const reason = 'Missing domain or user context';
          logger.warn({
            requestId,
            actionType: action.type,
            reason,
            hasDomainId: !!ctx.domainId,
            hasUserId: !!ctx.userId,
          }, '[kip.actions] rejected');
          results.push({ 
            type: action.type,
            status: 'error', 
            message: reason, 
            errorCode: 'MISSING_CONTEXT',
          });
          continue;
        }

        // Runtime check for core actions
        if (action.type === 'draft.create' && !supportedActions.has('draft.create')) {
          const reason = 'ACTION_HANDLER_MISSING';
          logger.error({
            requestId,
            actionType: action.type,
            reason,
          }, '[kip.actions] rejected: core handler missing');
          results.push({ 
            type: action.type,
            status: 'error', 
            message: reason, 
            errorCode: 'UNHANDLED_ACTION',
          });
          continue;
        }

        switch (action.type) {
          case 'draft.create': {
            const payload = action.payload ?? {};
            const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Draft';
            const kind = typeof payload.kind === 'string' && payload.kind.trim() ? payload.kind.trim() : 'draft';
            const status = typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : 'draft';
            const summary = normalizeSummary(payload.summary);
            const spec = payload.spec ?? {};
            const keeperId = typeof payload.keeperId === 'string' && payload.keeperId.trim() ? payload.keeperId.trim() : (ctx.keeperId ?? null);

            const key = slugifyKey(payload.key || title || `draft-${Date.now()}`);
            const now = new Date();

            try {
              const existing = await tx.kip_drafts.findFirst({
                where: {
                  domain_id: ctx.domainId,
                  owner_id: ctx.userId,
                  kind,
                  key,
                  keeper_id: keeperId,
                },
              });

              const baseData = {
                title,
                summary,
                status,
                spec_json: spec,
                updated_at: now,
                agent_id: ctx.agentId ?? null,
                keeper_id: keeperId,
              };

              const draft = existing
                ? await tx.kip_drafts.update({
                    where: { id: existing.id },
                    data: baseData,
                  })
                : await tx.kip_drafts.create({
                    data: {
                      domain_id: ctx.domainId,
                      owner_id: ctx.userId,
                      kind,
                      key,
                      created_at: now,
                      ...baseData,
                    },
                  });

              // Get domain slug for link generation if not provided
              let domainSlug = ctx.domainSlug;
              if (!domainSlug && ctx.domainId) {
                const domain = await tx.domain.findUnique({
                  where: { id: ctx.domainId },
                  select: { slug: true },
                });
                domainSlug = domain?.slug || ctx.domainId;
              }

              const durationMs = Date.now() - actionStartTime;
              logger.info({
                requestId,
                actionType: action.type,
                durationMs,
                draftId: draft.id,
                kind: draft.kind,
                key: draft.key,
              }, '[kip.actions] executed');

              results.push({
                type: action.type,
                status: 'success',
                message: 'Draft created successfully',
                data: {
                  entityIds: [draft.id],
                  draft: {
                    id: draft.id,
                    title: draft.title,
                    kind: draft.kind,
                    key: draft.key,
                  },
                  links: domainSlug ? {
                    open: buildDraftOpenUrl(domainSlug, draft.id),
                  } : undefined,
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to create/update draft';
              const durationMs = Date.now() - actionStartTime;
              logger.error({
                requestId,
                actionType: action.type,
                durationMs,
                error: errorMessage,
                actionSnippet: { type: action.type, hasPayload: !!action.payload },
              }, '[kip.actions] rejected');
              results.push({ 
                type: action.type,
                status: 'error', 
                message: errorMessage, 
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }
          case 'draft.update.propose': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const content = typeof payload.content === 'string' ? payload.content.trim() : '';
            if (!draftId) {
              results.push({ type: action.type, status: 'error', message: 'Draft id required for propose', errorCode: 'DRAFT_NOT_FOUND' });
              break;
            }
            if (!content) {
              results.push({ type: action.type, status: 'error', message: 'Point content is required', errorCode: 'VALIDATION_ERROR' });
              break;
            }
            const draft = await tx.kip_drafts.findFirst({
              where: { id: draftId, domain_id: ctx.domainId, owner_id: ctx.userId },
            });
            if (!draft) {
              results.push({ type: action.type, status: 'error', message: 'Draft not found', errorCode: 'DRAFT_NOT_FOUND' });
              break;
            }

            let proposedBy = 'agent';
            if (ctx.agentId) {
              const agent = await tx.kip_agents.findUnique({
                where: { id: ctx.agentId },
                select: { slug: true },
              });
              proposedBy = agent?.slug ?? ctx.agentId;
            }

            const pointType = typeof payload.type === 'string'
              ? payload.type as DraftPointType
              : 'general';

            const point = createDraftPoint({
              content,
              type: pointType,
              proposedBy,
              status: 'proposed',
            });

            const nextSpec = appendDraftPointToSpec(draft.spec_json, point);

            await tx.kip_draft_versions.create({
              data: {
                draft_id: draft.id,
                version: await tx.kip_draft_versions.count({ where: { draft_id: draft.id } }).then((n) => n + 1),
                spec_json: (draft.spec_json ?? {}) as Prisma.InputJsonValue,
                title: draft.title,
                summary: draft.summary ?? null,
                status: draft.status,
                created_by_session_id: ctx.sessionId ?? null,
              },
            });

            await tx.kip_drafts.update({
              where: { id: draft.id },
              data: {
                spec_json: nextSpec as object,
                updated_at: new Date(),
              },
            });

            const typeLabel = point.type === 'general' ? 'point' : point.type;
            results.push({
              type: action.type,
              status: 'success',
              message: `Proposed ${typeLabel} — tap Accept to keep it`,
              data: {
                draftId: draft.id,
                draftTitle: draft.title,
                point,
                draft: {
                  id: draft.id,
                  title: draft.title,
                  kind: draft.kind,
                  key: draft.key,
                },
                links: ctx.domainSlug ? { open: buildDraftOpenUrl(ctx.domainSlug, draft.id) } : undefined,
              },
            });
            break;
          }
          case 'draft.point.accept': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const pointId = typeof payload.pointId === 'string' ? payload.pointId : '';
            if (!draftId || !pointId) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'Draft id and point id required',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }
            const draft = await tx.kip_drafts.findFirst({
              where: { id: draftId, domain_id: ctx.domainId, owner_id: ctx.userId },
            });
            if (!draft) {
              results.push({ type: action.type, status: 'error', message: 'Draft not found', errorCode: 'DRAFT_NOT_FOUND' });
              break;
            }
            const existing = findDraftPoint(draft.spec_json, pointId);
            if (!existing) {
              results.push({ type: action.type, status: 'error', message: 'Point not found', errorCode: 'POINT_NOT_FOUND' });
              break;
            }
            if (existing.status === 'accepted') {
              results.push({
                type: action.type,
                status: 'success',
                message: 'Point already accepted',
                data: { draftId: draft.id, draftTitle: draft.title, point: existing },
              });
              break;
            }
            const { spec: nextSpec, point: updatedPoint } = updateDraftPointInSpec(
              draft.spec_json,
              pointId,
              { status: 'accepted' },
            );
            if (!updatedPoint) {
              results.push({ type: action.type, status: 'error', message: 'Failed to update point', errorCode: 'EXECUTION_ERROR' });
              break;
            }
            const summaryFromPoints = buildDraftSummaryFromAcceptedPoints(nextSpec);
            const nextSummary = summaryFromPoints || draft.summary || '';

            await tx.kip_draft_versions.create({
              data: {
                draft_id: draft.id,
                version: await tx.kip_draft_versions.count({ where: { draft_id: draft.id } }).then((n) => n + 1),
                spec_json: (draft.spec_json ?? {}) as Prisma.InputJsonValue,
                title: draft.title,
                summary: draft.summary ?? null,
                status: draft.status,
                created_by_session_id: ctx.sessionId ?? null,
              },
            });

            await tx.kip_drafts.update({
              where: { id: draft.id },
              data: {
                spec_json: nextSpec as object,
                summary: nextSummary,
                updated_at: new Date(),
              },
            });
            results.push({
              type: action.type,
              status: 'success',
              message: 'Point accepted',
              data: {
                draftId: draft.id,
                draftTitle: draft.title,
                point: updatedPoint,
                draft: { id: draft.id, title: draft.title, kind: draft.kind, key: draft.key },
                links: ctx.domainSlug ? { open: buildDraftOpenUrl(ctx.domainSlug, draft.id) } : undefined,
              },
            });
            break;
          }
          case 'draft.update': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const kind = payload.kind;
            const key = payload.key;

            const draft = await tx.kip_drafts.findFirst({
              where: {
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
                ...(draftId
                  ? { id: draftId }
                  : kind && key
                    ? { kind: String(kind), key: String(key) }
                    : {}),
              },
            });

            if (!draft) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'Draft not found for update', 
                errorCode: 'DRAFT_NOT_FOUND',
              });
              break;
            }

            const updateData = {
              title: typeof payload.title === 'string' ? payload.title : draft.title,
              summary: payload.summary !== undefined
                ? (typeof payload.summary === 'string' ? payload.summary : payload.summary ?? '')
                : draft.summary ?? '',
              status: typeof payload.status === 'string' ? payload.status : draft.status,
              spec_json: (payload.spec !== undefined
                ? mergeDraftSpecPatch(draft.spec_json, payload.spec ?? {})
                : (draft.spec_json ?? {})) as Prisma.InputJsonValue,
              updated_at: new Date(),
            };

            await tx.kip_draft_versions.create({
              data: {
                draft_id: draft.id,
                version: await tx.kip_draft_versions.count({ where: { draft_id: draft.id } }).then((n) => n + 1),
                spec_json: draft.spec_json ?? {},
                title: draft.title,
                summary: draft.summary ?? null,
                status: draft.status,
                created_by_session_id: ctx.sessionId ?? null,
              },
            });

            const updated = await tx.kip_drafts.update({
              where: { id: draft.id },
              data: updateData,
            });

            let domainSlug = ctx.domainSlug;
            if (!domainSlug && ctx.domainId) {
              const domain = await tx.domain.findUnique({
                where: { id: ctx.domainId },
                select: { slug: true },
              });
              domainSlug = domain?.slug || ctx.domainId;
            }

            results.push({
              type: action.type,
              status: 'success',
              message: 'Draft updated successfully',
              data: {
                entityIds: [updated.id],
                draft: {
                  id: updated.id,
                  title: updated.title,
                  kind: updated.kind,
                  key: updated.key,
                },
                links: domainSlug ? {
                  open: buildDraftOpenUrl(domainSlug, updated.id),
                } : undefined,
              },
            });
            break;
          }
          case 'draft.list': {
            const drafts = await tx.kip_drafts.findMany({
              where: { domain_id: ctx.domainId, owner_id: ctx.userId },
              select: { id: true, kind: true, key: true, title: true, status: true, summary: true, updated_at: true },
              orderBy: { updated_at: 'desc' },
              take: ACTION_DRAFT_LIMIT,
            });

            results.push({
              type: action.type,
              status: 'success',
              message: `Found ${drafts.length} draft(s)`,
              data: {
                entityIds: drafts.map(d => d.id),
                drafts: drafts.map((draft) => ({
                  id: draft.id,
                  title: draft.title,
                  kind: draft.kind,
                  status: draft.status,
                  key: draft.key,
                  summary: draft.summary,
                  updatedAt: draft.updated_at,
                })),
              },
            });
            break;
          }
          case 'draft.delete': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;

            if (!draftId) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'draftId is required for draft.delete',
                errorCode: 'MISSING_DRAFT_ID',
              });
              break;
            }

            const draft = await tx.kip_drafts.findFirst({
              where: {
                id: draftId,
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
              },
            });

            if (!draft) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'Draft not found for delete',
                errorCode: 'DRAFT_NOT_FOUND',
              });
              break;
            }

            await tx.kip_drafts.delete({
              where: { id: draft.id },
            });

            const durationMs = Date.now() - actionStartTime;
            logger.info({
              requestId,
              actionType: action.type,
              durationMs,
              draftId: draft.id,
              title: draft.title,
            }, '[kip.actions] executed');

            results.push({
              type: action.type,
              status: 'success',
              message: 'Draft deleted successfully',
              data: {
                entityIds: [draft.id],
                draft: {
                  id: draft.id,
                  title: draft.title,
                  kind: draft.kind,
                  key: draft.key,
                },
              },
            });
            break;
          }
          case 'draft.get':
          case 'draft.read': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const kind = payload.kind;
            const key = payload.key;

            const draft = await tx.kip_drafts.findFirst({
              where: {
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
                ...(draftId
                  ? { id: draftId }
                  : kind && key
                    ? { kind: String(kind), key: String(key) }
                    : {}),
              },
            });

            if (!draft) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'Draft not found', 
                errorCode: 'DRAFT_NOT_FOUND',
              });
              break;
            }

            results.push({
              type: action.type,
              status: 'success',
              message: 'Draft retrieved successfully',
              data: {
                entityIds: [draft.id],
                draft: {
                  id: draft.id,
                  title: draft.title,
                  kind: draft.kind,
                  key: draft.key,
                },
                spec: draft.spec_json,
                summary: draft.summary,
                status: draft.status,
                updatedAt: draft.updated_at,
              },
            });
            break;
          }
          case 'draft.setActive': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const sessionId = payload.sessionId || ctx.sessionId;

            if (!draftId || !sessionId) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'draftId and sessionId are required', 
                errorCode: 'MISSING_REQUIRED_FIELDS',
              });
              break;
            }

            const draft = await tx.kip_drafts.findFirst({
              where: {
                id: draftId,
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
              },
            });

            if (!draft) {
              results.push({ 
                type: action.type,
                status: 'error', 
                message: 'Draft not found for setActive', 
                errorCode: 'DRAFT_NOT_FOUND',
              });
              break;
            }

            const updated = await tx.kip_sessions.updateMany({
              where: {
                id: sessionId,
                ...(ctx.userId ? { user_id: ctx.userId } : {}),
              },
              data: {
                active_draft_id: draft.id,
                updated_at: new Date(),
              },
            });

            results.push({
              type: action.type,
              status: updated.count > 0 ? 'success' : 'error',
              message: updated.count > 0 ? 'Draft set as active' : 'Session not updated',
              errorCode: updated.count > 0 ? undefined : 'SESSION_UPDATE_FAILED',
              data: {
                entityIds: [draft.id],
                draft: {
                  id: draft.id,
                  title: draft.title,
                  kind: draft.kind,
                  key: draft.key,
                },
                sessionId,
                active: updated.count > 0,
              },
            });
            break;
          }
          case 'moment.create': {
            const payload = action.payload ?? {};
            const title = typeof payload.title === 'string' && payload.title.trim()
              ? payload.title.trim()
              : 'Untitled Moment';
            const narrative = typeof payload.narrative === 'string'
              ? payload.narrative.trim()
              : '';
            const journeyId = typeof payload.journeyId === 'string'
              ? payload.journeyId
              : undefined;

            try {
              const moment = await tx.moment.create({
                data: {
                  title,
                  narrative,
                  ownerId: ctx.userId ?? null,
                  domainId: ctx.domainId ?? null,
                  journeyId: journeyId ?? null,
                  keptAt: new Date(), // auto-keep
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              const durationMs = Date.now() - actionStartTime;
              logger.info({
                requestId,
                actionType: action.type,
                durationMs,
                momentId: moment.id,
                journeyId: journeyId ?? null,
              }, '[kip.actions] executed');

              results.push({
                type: action.type,
                status: 'success',
                message: `Moment "${title}" created and kept`,
                data: {
                  entityIds: [moment.id],
                  moment: {
                    id: moment.id,
                    title: moment.title,
                    journeyId: moment.journeyId,
                  },
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to create moment';
              logger.error({
                requestId,
                actionType: action.type,
                error: errorMessage,
              }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'sole.save': {
            const payload = action.payload ?? {};
            const content = typeof payload.content === 'string' ? payload.content.trim() : '';
            const topic = typeof payload.topic === 'string' ? payload.topic.trim() : null;
            const rawJourneyId = typeof payload.journeyId === 'string' ? payload.journeyId.trim() || null : null;
            const rawMomentId = typeof payload.momentId === 'string' ? payload.momentId.trim() || null : null;
            const rawEngagementTemplateId = typeof payload.engagementTemplateId === 'string' ? payload.engagementTemplateId.trim() || null : null;

            if (!content) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'Content is required for sole.save',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }

            try {
              // Option B: keeper-scoped when ctx.keeperId set; otherwise domain anchor (no keeper)
              const keeperId: string | null = ctx.keeperId ?? null;
              const domainId: string | null = ctx.domainId ?? null;

              if (!keeperId && !domainId) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: 'No Keeper or Domain context for SOLE memory save',
                  errorCode: 'MISSING_CONTEXT',
                });
                break;
              }

              // Validate optional links belong to domain/keeper context
              let journeyId: string | null = null;
              let momentId: string | null = null;
              let engagementTemplateId: string | null = null;

              if (rawJourneyId) {
                // Journeys are domain-level resources — validate by domain, not active keeper.
                // A keeper-scoped SOLE memory can reference any journey in the same domain.
                const journey = await tx.journey.findFirst({
                  where: { id: rawJourneyId, domainId: domainId ?? undefined },
                });
                if (!journey) {
                  results.push({
                    type: action.type,
                    status: 'error',
                    message: `Journey ${rawJourneyId} not found or not in context`,
                    errorCode: 'VALIDATION_ERROR',
                  });
                  break;
                }
                journeyId = rawJourneyId;
              }

              if (rawMomentId) {
                const moment = await tx.moment.findFirst({
                  where: journeyId
                    ? { id: rawMomentId, journeyId }
                    : domainId
                      ? { id: rawMomentId, domainId }
                      : { id: rawMomentId },
                });
                if (!moment) {
                  results.push({
                    type: action.type,
                    status: 'error',
                    message: `Moment ${rawMomentId} not found or not in context`,
                    errorCode: 'VALIDATION_ERROR',
                  });
                  break;
                }
                momentId = rawMomentId;
              }

              if (rawEngagementTemplateId) {
                const template = await tx.engagement_templates.findFirst({
                  where: keeperId
                    ? { id: rawEngagementTemplateId, keeperId }
                    : { id: rawEngagementTemplateId, keeperId: null },
                });
                if (!template) {
                  results.push({
                    type: action.type,
                    status: 'error',
                    message: `Engagement template ${rawEngagementTemplateId} not found or not in context`,
                    errorCode: 'VALIDATION_ERROR',
                  });
                  break;
                }
                engagementTemplateId = rawEngagementTemplateId;
              }

              // Keeper-specific: keeperId set. Domain anchor: keeperId null, domainId set.
              const reflectionData = {
                keeperId: keeperId,
                domainId: keeperId ? null : domainId,
                journeyId,
                momentId,
                engagementTemplateId,
                agentId: ctx.agentId ?? 'system',
                content,
                topic,
                promotedToMemoryCard: true,
                promotedAt: new Date(),
              };

              // Create a SoleReflection
              const reflection = await tx.soleReflection.create({
                data: reflectionData,
              });

              const memoryCardData = {
                keeperId: keeperId,
                domainId: keeperId ? null : domainId,
                journeyId,
                momentId,
                engagementTemplateId,
                reflectionId: reflection.id,
                content,
                topic,
              };

              // Auto-promote to SoleMemoryCard
              const memoryCard = await tx.soleMemoryCard.create({
                data: memoryCardData,
              });

              const durationMs = Date.now() - actionStartTime;
              logger.info({
                requestId,
                actionType: action.type,
                durationMs,
                reflectionId: reflection.id,
                memoryCardId: memoryCard.id,
              }, '[kip.actions] executed');

              results.push({
                type: action.type,
                status: 'success',
                message: `Memory saved: "${topic || 'reflection'}"`,
                data: {
                  entityIds: [reflection.id, memoryCard.id],
                  reflection: { id: reflection.id },
                  memoryCard: { id: memoryCard.id },
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to save SOLE memory';
              logger.error({
                requestId,
                actionType: action.type,
                error: errorMessage,
              }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'sole.read': {
            const payload = action.payload ?? {};
            const topic = typeof payload.topic === 'string' ? payload.topic.trim() || null : null;
            const keeperIdFilter = typeof payload.keeperId === 'string' ? payload.keeperId.trim() || null : null;
            const limit = typeof payload.limit === 'number' && payload.limit >= 1 && payload.limit <= 50 ? payload.limit : 20;

            if (!ctx.domainId) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'No domain context for sole.read',
                errorCode: 'MISSING_CONTEXT',
              });
              break;
            }

            try {
              const where: Record<string, unknown> = keeperIdFilter
                ? { keeperId: keeperIdFilter }
                : { domainId: ctx.domainId, keeperId: null };

              if (topic) {
                where.topic = { contains: topic, mode: 'insensitive' };
              }

              const cards = await tx.soleMemoryCard.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                  SoleReflection: {
                    select: { id: true, agentId: true, createdAt: true },
                  },
                },
              });

              results.push({
                type: action.type,
                status: 'success',
                message: `Retrieved ${cards.length} SOLE memory card${cards.length !== 1 ? 's' : ''}`,
                data: {
                  entityIds: cards.map((c) => c.id),
                  cards: cards.map((c) => ({
                    id: c.id,
                    content: c.content,
                    topic: c.topic,
                    createdAt: c.createdAt,
                    reflection: c.SoleReflection
                      ? { agentId: c.SoleReflection.agentId, createdAt: c.SoleReflection.createdAt }
                      : null,
                  })),
                  count: cards.length,
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to read SOLE memory cards';
              logger.error({ requestId, actionType: action.type, error: errorMessage }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'journey.read': {
            const payload = action.payload ?? {};
            const journeyId = typeof payload.journeyId === 'string' ? payload.journeyId.trim() : '';

            if (!journeyId) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'journeyId is required for journey.read',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }

            try {
              const journey = await tx.journey.findUnique({
                where: { id: journeyId },
                include: {
                  Path: {
                    include: {
                      Moment: {
                        orderBy: { createdAt: 'asc' },
                        select: { id: true, title: true, narrative: true, createdAt: true },
                      },
                    },
                  },
                },
              });

              if (!journey) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Journey ${journeyId} not found`,
                  errorCode: 'NOT_FOUND',
                });
                break;
              }

              if (journey.domainId !== ctx.domainId) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Journey ${journeyId} does not belong to this domain`,
                  errorCode: 'FORBIDDEN',
                });
                break;
              }

              results.push({
                type: action.type,
                status: 'success',
                message: `Journey "${journey.name}" retrieved successfully`,
                data: {
                  entityIds: [journey.id],
                  journey: {
                    id: journey.id,
                    title: journey.name,
                    forward: journey.forward,
                    createdAt: journey.createdAt,
                    paths: journey.Path.map((p) => ({
                      id: p.id,
                      title: p.name,
                      prelude: p.prelude,
                      moments: p.Moment.map((m) => ({
                        id: m.id,
                        title: m.title,
                        narrative: m.narrative,
                        createdAt: m.createdAt,
                      })),
                    })),
                  },
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to read journey';
              logger.error({ requestId, actionType: action.type, error: errorMessage }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'moment.read': {
            const payload = action.payload ?? {};
            const momentId = typeof payload.momentId === 'string' ? payload.momentId.trim() : '';

            if (!momentId) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'momentId is required for moment.read',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }

            try {
              const moment = await tx.moment.findUnique({
                where: { id: momentId },
                include: {
                  Path: { select: { id: true, name: true } },
                  Journey: { select: { id: true, name: true } },
                },
              });

              if (!moment) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Moment ${momentId} not found`,
                  errorCode: 'NOT_FOUND',
                });
                break;
              }

              if (moment.domainId !== ctx.domainId) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Moment ${momentId} does not belong to this domain`,
                  errorCode: 'FORBIDDEN',
                });
                break;
              }

              results.push({
                type: action.type,
                status: 'success',
                message: `Moment "${moment.title}" retrieved successfully`,
                data: {
                  entityIds: [moment.id],
                  moment: {
                    id: moment.id,
                    title: moment.title,
                    narrative: moment.narrative,
                    createdAt: moment.createdAt,
                    path: moment.Path ? { id: moment.Path.id, title: moment.Path.name } : null,
                    journey: moment.Journey ? { id: moment.Journey.id, title: moment.Journey.name } : null,
                  },
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to read moment';
              logger.error({ requestId, actionType: action.type, error: errorMessage }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'keeper.read': {
            const payload = action.payload ?? {};
            const keeperIdToRead = typeof payload.keeperId === 'string' ? payload.keeperId.trim() : '';

            if (!keeperIdToRead) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'keeperId is required for keeper.read',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }

            try {
              const keeper = await tx.keeper.findUnique({
                where: { id: keeperIdToRead },
                include: {
                  Journey: { select: { id: true, name: true } },
                  _count: { select: { kip_drafts: true } },
                },
              });

              if (!keeper) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Keeper ${keeperIdToRead} not found`,
                  errorCode: 'NOT_FOUND',
                });
                break;
              }

              if (keeper.domainId !== ctx.domainId) {
                results.push({
                  type: action.type,
                  status: 'error',
                  message: `Keeper ${keeperIdToRead} does not belong to this domain`,
                  errorCode: 'FORBIDDEN',
                });
                break;
              }

              const momentCount = await tx.moment.count({
                where: { Journey: { keeperId: keeperIdToRead } },
              });

              results.push({
                type: action.type,
                status: 'success',
                message: `Keeper "${keeper.title}" retrieved successfully`,
                data: {
                  entityIds: [keeper.id],
                  keeper: {
                    id: keeper.id,
                    title: keeper.title,
                    description: keeper.purpose,
                    createdAt: keeper.createdAt,
                    journeys: keeper.Journey.map((j) => ({ id: j.id, title: j.name })),
                    momentCount,
                    draftCount: keeper._count.kip_drafts,
                  },
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to read keeper';
              logger.error({ requestId, actionType: action.type, error: errorMessage }, '[kip.actions] rejected');
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          case 'image.generate': {
            console.log('[image.generate] Action received:', action);
            const payload = action.payload ?? {};
            const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';

            if (!subject) {
              results.push({
                type: action.type,
                status: 'error',
                message: 'subject is required for image.generate',
                errorCode: 'VALIDATION_ERROR',
              });
              break;
            }

            try {
              // Read domain image_style to use as domain_context — folded into the FLUX prompt
              let domainContext: string | undefined;
              if (ctx.domainId) {
                try {
                  const domainRecord = await tx.domain.findUnique({
                    where: { id: ctx.domainId },
                    select: { frame_json: true },
                  });
                  const frame = domainRecord?.frame_json as Record<string, any> | null;
                  const imageStyle = frame?.kip?.image_style;
                  if (typeof imageStyle === 'string' && imageStyle.trim()) {
                    domainContext = imageStyle.trim();
                  }
                } catch {
                  // Non-fatal — proceed without domain context
                }
              }
              console.log('[image.generate] domain_context:', domainContext);

              const parts: string[] = [subject];
              if (typeof payload.mood === 'string' && payload.mood.trim()) parts.push(payload.mood.trim());
              if (typeof payload.style === 'string' && payload.style.trim()) parts.push(payload.style.trim());
              if (domainContext) parts.push(domainContext);
              const prompt = parts.join(', ');

              const ASPECT_RATIO_DIMS: Record<string, { width: number; height: number }> = {
                '1:1':  { width: 1024, height: 1024 },
                '16:9': { width: 1344, height: 768  },
                '9:16': { width: 768,  height: 1344 },
                '4:3':  { width: 1024, height: 768  },
              };
              const aspectRatio = typeof payload.aspect_ratio === 'string' ? payload.aspect_ratio : '1:1';
              const dims = ASPECT_RATIO_DIMS[aspectRatio] ?? ASPECT_RATIO_DIMS['1:1'];

              const brief: ImageGenerationBrief = {
                prompt,
                model:          typeof payload.model === 'string' ? payload.model : undefined,
                width:          dims.width,
                height:         dims.height,
                domain_context: domainContext,
              };

              logger.info({
                requestId,
                subject,
                aspectRatio,
                model: brief.model ?? 'default',
                userId: ctx.userId,
              }, '[kip.actions] image.generate dispatching');
              console.log('[image.generate] Calling ModelProviderService.generateImage');

              const imageResult = await ModelProviderService.generateImage(brief, ctx.userId);

              results.push({
                type: action.type,
                status: 'success',
                message: 'Image generated',
                data: {
                  imageUrl:    imageResult.url,
                  imagePrompt: imageResult.prompt,
                  imageModel:  imageResult.model,
                  subject,
                  aspectRatio,
                },
              });
            } catch (error) {
              const err = error instanceof Error ? error : undefined;
              console.error('[image.generate] FAILED:', err?.message, err?.stack);
              const errorMessage = err?.message ?? 'Image generation failed';
              logger.warn({
                requestId,
                actionType: action.type,
                error: errorMessage,
              }, '[kip.actions] image.generate failed — failing gracefully');
              // Fail gracefully: Kip's text response still completes
              results.push({
                type: action.type,
                status: 'error',
                message: errorMessage,
                errorCode: 'EXECUTION_ERROR',
              });
            }
            break;
          }

          default:
            // Fail loud: if action is in allowlist/CORE_ACTIONS but no handler exists, return error
            // If action is not allowed, return skipped (policy rejection)
            const isAllowlisted = ctx.allowlist.has(action.type);
            const isCoreAction = CORE_ACTIONS.includes(action.type as CoreActionType);
            
            if (isAllowlisted || isCoreAction) {
              const errorReason = `Action type '${action.type}' is allowlisted but has no handler implementation`;
              logger.error({
                requestId,
                actionType: action.type,
                reason: errorReason,
                isAllowlisted,
                isCoreAction,
              }, '[kip.actions] rejected: unhandled allowlisted action');
              results.push({ 
                type: action.type,
                status: 'error', 
                message: errorReason,
                errorCode: 'UNHANDLED_ACTION',
              });
            } else {
              const skipReason = 'Action not allowed by policy';
              logger.warn({
                requestId,
                actionType: action.type,
                reason: skipReason,
              }, '[kip.actions] rejected: not allowed');
              results.push({ 
                type: action.type,
                status: 'skipped', 
                message: skipReason,
                errorCode: 'NOT_ALLOWED',
              });
            }
            break;
        }
      } catch (error) {
        const durationMs = Date.now() - actionStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Action failed';
        logger.error({
          requestId,
          actionType: action.type,
          durationMs,
          error: errorMessage,
          actionSnippet: { type: action.type, hasPayload: !!action.payload },
        }, '[kip.actions] rejected');
        results.push({
          type: action.type,
          status: 'error',
          message: errorMessage,
          errorCode: 'EXECUTION_ERROR',
        });
      }
    }
  });

  const failed = results.find((result) => result.status === 'error');
  const summary = {
    requestId,
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    error: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  };
  
  if (failed) {
    logger.warn(summary, '[kip.actions] execution completed with errors');
  } else {
    logger.info(summary, '[kip.actions] execution completed');
  }

  return { results, failedMessage: failed?.message || null };
}

// Database helper functions
const getAllKipAgents = async () => {
  return prisma.kip_agents.findMany({
    orderBy: [
      { status: 'asc' },
      { name: 'asc' }
    ]
  });
};

const getKipAgentById = async (id: string) => {
  return prisma.kip_agents.findUnique({
    where: { id }
  });
};

const getKipAgentBySlug = async (slug: string) => {
  return prisma.kip_agents.findUnique({
    where: { slug }
  });
};

const createKipAgent = async (data: AgentInput) => {
  return prisma.kip_agents.create({
    data: {
      ...data,
      updated_at: new Date()
    }
  });
};

const updateKipAgent = async (id: string, data: Partial<AgentInput>) => {
  return prisma.kip_agents.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date()
    }
  });
};

const deleteKipAgent = async (id: string) => {
  return prisma.kip_agents.delete({
    where: { id }
  });
};

const createKipAgentLog = async (data: {
  agent_id: string;
  user_id?: string;
  input: string;
  output?: string;
  error?: string;
  model?: string;
  execution_time_ms: number;
}) => {
  return prisma.kip_agent_logs.create({
    data
  });
};

/** Includes optional DB fields not yet in published `KipSessionInput` typings from dist. */
type KipSessionCreatePayload = KipSessionInput & {
  beat_metadata?: Prisma.InputJsonValue | null;
  dialog_id?: string | null;
};

const createKipSession = async (data: KipSessionInput) => {
  const d = data as KipSessionCreatePayload;
  const { beat_metadata: beatMeta, ...rest } = d;
  const payload: Prisma.kip_sessionsUncheckedCreateInput = {
    ...rest,
    tags: rest.tags ?? [],
    updated_at: new Date(),
    ...(beatMeta !== undefined && beatMeta !== null ? { beat_metadata: beatMeta } : {}),
  };
  return prisma.kip_sessions.create({ data: payload });
};

const getKipSessionById = async (sessionId: string) => {
  return prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    include: {
      kip_messages: {
        orderBy: { created_at: 'asc' }
      }
    }
  });
};

const getSessionsByAgentId = async (agentId: string, options: { page?: number; pageSize?: number } = {}) => {
  const { page = 1, pageSize = 50 } = options;
  const skip = (page - 1) * pageSize;

  const [sessions, total] = await Promise.all([
    prisma.kip_sessions.findMany({
      where: { agent_id: agentId },
      include: {
        _count: {
          select: { kip_messages: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_sessions.count({ where: { agent_id: agentId } })
  ]);

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  };
};

const createKipMessage = async (data: KipMessageInput) => {
  return prisma.kip_messages.create({
    data
  });
};

const getSessionMessages = async (sessionId: string) => {
  return prisma.kip_messages.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' }
  });
};

const getKipAgentLogs = async (options: {
  page?: number;
  pageSize?: number;
  agentId?: string;
  userId?: string;
} = {}) => {
  const { page = 1, pageSize = 50, agentId, userId } = options;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(agentId && { agent_id: agentId }),
    ...(userId && { user_id: userId })
  };

  const [rawLogs, total] = await Promise.all([
    prisma.kip_agent_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
      include: {
        kip_agents: {
          select: { id: true, name: true, slug: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.kip_agent_logs.count({ where })
  ]);

  const logs = rawLogs.map(({ kip_agents, users, ...log }) => ({
    ...log,
    agent: kip_agents
      ? {
          id: kip_agents.id,
          name: kip_agents.name,
          slug: kip_agents.slug
        }
      : null,
    user: users
      ? {
          id: users.id,
          name: users.name,
          email: users.email
        }
      : null
  }));

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  };
};

const getLogsByAgentId = async (agentId: string, options: { page?: number; pageSize?: number } = {}) => {
  return getKipAgentLogs({ ...options, agentId });
};

const getAgentStats = async (agentId?: string) => {
  const where = agentId ? { agent_id: agentId } : {};
  
  const [totalExecutions, totalErrors, avgExecutionTime] = await Promise.all([
    prisma.kip_agent_logs.count({ where }),
    prisma.kip_agent_logs.count({ where: { ...where, error: { not: null } } }),
    prisma.kip_agent_logs.aggregate({
      where,
      _avg: { execution_time_ms: true }
    })
  ]);

  return {
    totalExecutions,
    totalErrors,
    successRate: totalExecutions > 0 ? ((totalExecutions - totalErrors) / totalExecutions) * 100 : 0,
    avgExecutionTime: avgExecutionTime._avg.execution_time_ms || 0
  };
};

// Define proper types for agents
interface AgentConfig {
  avatar?: string;
  tagline?: string;
  personality?: string;
  capabilities?: string[];
  theme_color?: string;
  bundle?: string[];
}

interface TypedAgent {
  id: string;
  slug: string;
  name: string;
  agent_class: string;
  model: string;
  memory_enabled?: boolean;
  model_provider?: ModelProvider;
  model_settings?: ModelSettings;
  purpose?: string;
  tools?: string[];
  context_scope?: string;
  config?: AgentConfig;
}

// Input validation schemas
const DebugBundleEntrySchema = z.object({
  id: z.string().optional(),
  requestId: z.string().optional(),
  method: z.string().optional(),
  url: z.string().optional(),
  status: z.number().nullable().optional(),
  action: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  error: z
    .object({
      message: z.string().optional(),
      code: z.string().optional(),
      constraint: z.string().optional(),
    })
    .optional(),
});

const DebugBundleSchema = z.object({
  entries: z.array(DebugBundleEntrySchema).optional(),
  failures: z.array(DebugBundleEntrySchema).optional(),
  authContextKeysPresent: z
    .object({
      hasUser: z.boolean().optional(),
      hasAuth: z.boolean().optional(),
      hasKam: z.boolean().optional(),
      userKeys: z.array(z.string()).optional(),
      authKeys: z.array(z.string()).optional(),
      kamKeys: z.array(z.string()).optional(),
      authorizationHeaderPresent: z.boolean().optional(),
    })
    .optional(),
  symptom: z.string().nullable().optional(),
}).optional();

const AgentAttachmentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  type: z.enum(['image', 'file']),
});

const AgentRunSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  input: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  domainId: z.string().optional(),
  domainSlug: z.string().optional(),
  mode: z.enum(['domain', 'debug']).optional(),
  debugBundle: DebugBundleSchema,
  attachments: z.array(AgentAttachmentSchema).optional(),
  activeJourneyId: z.string().nullable().optional(),
  activeKeeperId: z.string().nullable().optional(),
  agentContext: z.record(z.unknown()).optional(),
}).refine(
  (data) => (typeof data.input === 'string' && data.input.trim().length > 0) || (Array.isArray(data.attachments) && data.attachments.length > 0),
  { message: 'Either input text or at least one attachment is required', path: ['input'] }
);

const CreateSessionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  sessionName: z.string().optional(),
});

const TagsInputSchema = z.union([z.array(z.any()), z.string(), z.record(z.any())]).optional();

const SessionMetadataUpdatesSchema = z.object({
  session_name: z.string().optional(),
  summary: z.string().optional().nullable(),
  tags: TagsInputSchema,
});

const UpdateSessionMetadataSchema = z.object({
  action: z.literal('updateSessionMetadata').optional(),
  agentId: z.string().optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  updates: SessionMetadataUpdatesSchema.optional(),
  // Back-compat top-level fields
  session_name: z.string().optional(),
  summary: z.string().optional().nullable(),
  tags: TagsInputSchema,
});

type NormalizedSessionMetadataUpdates = {
  session_name?: string;
  summary?: string | null;
  tags?: string[];
};

type UpdateSessionMetadataParams = {
  sessionId: string;
  agentId: string;
  userId: string;
  updates: NormalizedSessionMetadataUpdates;
};

const cleanTagValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const bracketMatch = text.match(/^\[(.*)\]$/);
  const stripped = bracketMatch ? bracketMatch[1]?.trim() : text;
  return stripped || null;
};

const normalizeTagsInput = (raw: unknown): { tags?: string[]; error?: string } => {
  if (raw === undefined) return { tags: undefined };
  if (raw === null) return { tags: [] };

  const finalize = (values: unknown[]) => {
    const normalized = values
      .map(cleanTagValue)
      .filter((item): item is string => Boolean(item));
    return Array.from(new Set(normalized));
  };

  if (Array.isArray(raw)) {
    return { tags: finalize(raw) };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { tags: [] };

    if (/^[\[{].*[\]}]$/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return { tags: finalize(parsed) };
        }
      } catch {
        // Fall through to comma/segment parsing
      }
    }

    const segments = trimmed.includes(',') ? trimmed.split(',') : [trimmed];
    return { tags: finalize(segments) };
  }

  if (typeof raw === 'object') {
    const values = Object.values(raw as Record<string, unknown>);
    return { tags: finalize(values) };
  }

  return { error: 'Invalid tags format' };
};

const normalizeSessionMetadataUpdates = (
  input: z.infer<typeof UpdateSessionMetadataSchema>
): { updates: NormalizedSessionMetadataUpdates; error?: string } => {
  const source = input.updates || {};
  const sessionName = input.session_name ?? (source as any).session_name;
  const summary = input.summary ?? (source as any).summary;
  const tagsRaw = input.tags !== undefined ? input.tags : (source as any).tags;

  const updates: NormalizedSessionMetadataUpdates = {};

  if (sessionName !== undefined) {
    updates.session_name = sessionName;
  }

  if (summary !== undefined) {
    updates.summary = summary ?? null;
  }

  if (tagsRaw !== undefined) {
    const normalizedTags = normalizeTagsInput(tagsRaw);
    if (normalizedTags.error) {
      return { updates: {}, error: normalizedTags.error };
    }
    if (normalizedTags.tags !== undefined) {
      updates.tags = normalizedTags.tags;
    }
  }

  return { updates };
};

/**
 * KipAgentService - Core agent management functions
 */
export class KipAgentService {
  /**
   * Generate response for Lead agents with conversational intelligence
   */
  static generateLeadAgentResponse(agent: TypedAgent, input: string): string {
    const config = agent.config || {};
    const personality = config.personality || 'helpful';
    
    // Generate contextual responses based on agent personality and capabilities
    switch (agent.slug) {
      case 'kip':
        return `Hello! I'm Kip, ${config.tagline || 'your AI companion'}. I understand you said: "${input}". As your thought processing assistant, I can help you organize ideas, analyze patterns, and coordinate tasks. How would you like me to assist you with this today?`;
      
      case 'ceox':
        return `Greetings. I'm CeoX, ${config.tagline || 'your strategic AI partner'}. You've shared: "${input}". From an executive perspective, I can provide strategic analysis, business intelligence, and decision support. What strategic insights or recommendations would be most valuable for you regarding this matter?`;
      
      default:
        return `Hello! I'm ${agent.name}. I see you've mentioned: "${input}". Based on my capabilities in ${config.capabilities?.join(', ') || 'general assistance'}, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Validate agent data before processing
   */
  static validateAgent(agent: unknown): TypedAgent {
    if (!agent || typeof agent !== 'object') {
      throw new Error('Invalid agent data');
    }

    const typedAgent = agent as Partial<TypedAgent>;

    if (!typedAgent.id || !typedAgent.slug || !typedAgent.name) {
      throw new Error('Agent missing required fields: id, slug, name');
    }

    return {
      id: typedAgent.id,
      slug: typedAgent.slug,
      name: typedAgent.name,
      agent_class: typedAgent.agent_class || 'Lead',
      model: typedAgent.model || 'gpt-3.5-turbo',
      memory_enabled: typedAgent.memory_enabled || false,
      model_provider: typedAgent.model_provider || 'openai',
      model_settings: typedAgent.model_settings || ModelProviderService.getDefaultSettings('openai'),
      purpose: typedAgent.purpose || 'General assistance',
      tools: typedAgent.tools || [],
      context_scope: typedAgent.context_scope || 'general',
      config: typedAgent.config || {}
    };
  }

  /**
   * Create a new agent with validation
   */
  static async createAgent(input: AgentInput): Promise<TypedAgent> {
    try {
      // Validate input
      if (!input.name || !input.slug) {
        throw new Error('Agent name and slug are required');
      }

      // Check if agent with slug already exists
      const existingAgent = await getKipAgentBySlug(input.slug);
      if (existingAgent) {
        throw new Error(`Agent with slug '${input.slug}' already exists`);
      }

      const agent = await createKipAgent(input);
      return this.validateAgent(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all available agents
   */
  static async getAllAgents(): Promise<TypedAgent[]> {
    try {
      const agents = await getAllKipAgents();
      return agents.map((agent: any) => this.validateAgent(agent));
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Get agent by ID or slug safely
   */
  static async getAgentSafely(identifier: string): Promise<TypedAgent> {
    try {
      let agent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUUID) {
        agent = await getKipAgentById(identifier);
      } else {
        agent = await getKipAgentBySlug(identifier);
      }

      if (!agent) {
        throw new Error(`Agent with ${isUUID ? 'ID' : 'slug'} '${identifier}' not found`);
      }

      return this.validateAgent(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw new Error(`Failed to fetch agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing agent
   */
  static async updateAgent(id: string, input: Partial<AgentInput>): Promise<TypedAgent> {
    try {
      const existingAgent = await this.getAgentSafely(id);
      const updatedAgent = await updateKipAgent(existingAgent.id, input);
      return this.validateAgent(updatedAgent);
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const existingAgent = await this.getAgentSafely(id);
      await deleteKipAgent(existingAgent.id);
      return { success: true, message: `Agent '${existingAgent.name}' deleted successfully` };
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new session with validation
   */
  static async createSession(
    agentId: string,
    userId?: string,
    sessionName?: string,
    context?: { primaryJourneyId?: string | null; primaryKeeperId?: string | null },
    dialogLink?: {
      domainId: string;
      board: string;
      frame: string;
      subject?: string;
      scope: 'admin' | 'keeper';
    },
  ): Promise<KipSessionWithRelations> {
    try {
      if (!userId) {
        throw new Error('User ID is required to create a session');
      }
      // Validate agent exists
      const agent = await this.getAgentSafely(agentId);

      let dialogId: string | undefined;
      if (dialogLink) {
        const dialog = await findOrCreateKipDialog(prisma, {
          domainId: dialogLink.domainId,
          board: dialogLink.board,
          frame: dialogLink.frame,
          subject: dialogLink.subject,
          scope: dialogLink.scope,
          userId: dialogLink.scope === 'keeper' ? userId : null,
        });
        dialogId = dialog.id;
      }
      
      const sessionData: KipSessionInput = {
        agent_id: agent.id,
        user_id: userId,
        session_name: sessionName || `Session with ${agent.name}`,
        ...(context?.primaryJourneyId ? { primary_journey_id: context.primaryJourneyId } : {}),
        ...(context?.primaryKeeperId ? { primary_keeper_id: context.primaryKeeperId } : {}),
        ...(dialogId ? { dialog_id: dialogId } : {}),
      };

      return await createKipSession(sessionData);
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update session metadata (name, summary, tags)
   */
  static async updateSessionMetadata(input: UpdateSessionMetadataParams): Promise<KipSessionWithRelations> {
    try {
      const payload = {
        ...(input.updates.session_name !== undefined ? { session_name: input.updates.session_name } : {}),
        ...(input.updates.summary !== undefined ? { summary: input.updates.summary } : {}),
        ...(input.updates.tags !== undefined ? { tags: input.updates.tags } : {}),
      };

      if (Object.keys(payload).length === 0) {
        throw new Error('No session metadata provided to update');
      }

      const updated = await prisma.kip_sessions.updateMany({
        where: {
          id: input.sessionId,
          agent_id: input.agentId,
          user_id: input.userId,
        },
        data: {
          ...payload,
          updated_at: new Date(),
        },
      });

      if (!updated.count) {
        throw new Error('Session not found for user/agent');
      }

      const session = await prisma.kip_sessions.findUnique({
        where: { id: input.sessionId },
        include: {
          kip_messages: {
            orderBy: { created_at: 'asc' },
          },
        },
      });

      if (!session) {
        throw new Error('Session not found after update');
      }

      return session as unknown as KipSessionWithRelations;
    } catch (error) {
      console.error('Error updating session metadata:', error);
      throw new Error(`Failed to update session metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get session memory safely
   */
  static async getSessionMemory(sessionId: string): Promise<KipMessageWithRelations[]> {
    try {
      const session = await getKipSessionById(sessionId);
      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }
      
      return await getSessionMessages(sessionId);
    } catch (error) {
      console.error('Error fetching session memory:', error);
      throw new Error(`Failed to fetch session memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save message to session with validation
   */
  static async saveMessage(
    sessionId: string, 
    sender: 'user' | 'agent', 
    content: string, 
    role: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (!sessionId || !sender || !content || !role) {
        throw new Error('Session ID, sender, content, and role are required');
      }

      const messageData: KipMessageInput = {
        session_id: sessionId,
        sender,
        content,
        role,
        metadata: metadata || {}
      };
      
      await createKipMessage(messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Lead agent response with memory context (Legacy - for fallback)
   */
  static generateLeadAgentResponseWithMemory(agent: TypedAgent, input: string, previousMessages: KipMessageWithRelations[]): string {
    const config = agent.config || {};
    const personality = config.personality || 'helpful';
    
    // Build context from previous messages
    const recentContext = previousMessages.slice(-6).map(msg => 
      `${msg.sender}: ${msg.content}`
    ).join('\n');
    
    const hasContext = previousMessages.length > 0;
    const contextPrompt = hasContext ? 
      `\n\nBased on our previous conversation:\n${recentContext}\n\nNow responding to: "${input}"` :
      `\n\nResponding to: "${input}"`;
    
    switch (agent.slug) {
      case 'kip':
        const greeting = hasContext ? 'I remember our conversation.' : 'Hello! I\'m Kip, your AI companion.';
        return `${greeting} ${contextPrompt}\n\nAs your thought processing assistant with memory of our discussion, I can help you build on our previous insights, analyze patterns, and coordinate tasks. How would you like me to assist you with this continuation of our conversation?`;
      
      case 'ceox':
        const greeting2 = hasContext ? 'Continuing our strategic discussion.' : 'Greetings. I\'m CeoX, your strategic AI partner.';
        return `${greeting2} ${contextPrompt}\n\nWith the context of our previous exchanges, I can provide strategic analysis that builds on our earlier insights, business intelligence that connects to previous decisions, and decision support that considers our conversation history. What strategic insights would be most valuable for you regarding this matter?`;
      
      default:
        const greeting3 = hasContext ? `Continuing our conversation, I'm ${agent.name}.` : `Hello! I'm ${agent.name}.`;
        return `${greeting3} ${contextPrompt}\n\nBased on my capabilities in ${config.capabilities?.join(', ') || 'general assistance'} and our conversation history, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Build the composed system prompt for a given context (without running the model).
   * Used to expose the full prompt in the Cockpit (load-time preview only).
   *
   * @deprecated This function diverges from callAIModel and does not reflect what
   * the LLM actually receives. The authoritative composed prompt is built inside
   * callAIModel and returned as composedSystemPrompt on each runAgent response.
   * The Cockpit updates from that source after every message. This function exists
   * only to populate the Cockpit before the first message is sent. It should be
   * removed once the Cockpit is wired to show a placeholder until the first real
   * prompt arrives. Do not add behavioral rules here — add them to callAIModel.
   */
  static async buildComposedSystemPrompt(
    agentId: string,
    options: {
      domainId?: string | null;
      keeperId?: string | null;
      journeyId?: string | null;
      userId?: string | null;
    },
  ): Promise<string> {
    const agent = await this.getAgentSafely(agentId);
    let environment: AgentEnvironmentContext | null = null;
    try {
      environment = await resolveAgentEnvironment({
        agentId,
        userId: options.userId ?? undefined,
        domainId: options.domainId ?? undefined,
        intent: 'interactive',
      });
    } catch {
      /* continue without env */
    }

    const modeState = isDbDisabled() ? null : await loadModeState(agent.id, options.domainId ?? undefined);
    const activeMode: AgentModeKey = modeState?.state.activeMode || 'domain';
    const fallbackModeConfig: ModeConfig = {
      outputStyle: 'normal',
      limits: { maxChars: activeMode === 'debug' ? 2000 : 0 },
      captureN: 20,
      autoBrief: true,
      includeFixPlan: true,
    };
    const activeModeConfig = (modeState?.state.modeConfigs[activeMode] as ModeConfig) || fallbackModeConfig;
    const lensId =
      activeModeConfig.lensId ||
      (activeMode === 'debug' ? modeState?.lenses?.debugLensId : modeState?.lenses?.domainLensId) ||
      null;
    const lens =
      !isDbDisabled() && lensId ? await prisma.kip_lenses.findUnique({ where: { id: lensId } }) : null;
    const maxChars = typeof activeModeConfig.limits?.maxChars === 'number' ? activeModeConfig.limits.maxChars : null;

    const config = agent.config || {};
    const styleHelper: Record<OutputStyle, string> = {
      concise: 'Keep replies compact and bullet-first where possible.',
      normal: 'Balance clarity with brevity; surface key evidence first.',
      expanded: 'Provide fuller reasoning and details while staying structured.',
    };
    const outputStyle = (activeModeConfig.outputStyle as OutputStyle) || 'normal';
    const systemParts: string[] = [];

    systemParts.push(
      [
        lens?.systemPrompt || '',
        `You are ${agent.name}, ${agent.purpose}. ${config.tagline || ''}`.trim(),
        `Mode: ${activeMode.toUpperCase()}. Output style: ${styleHelper[outputStyle]}`,
        maxChars && maxChars > 0
          ? `Hard limit: keep the Debug Brief under ${maxChars} characters; prefer concise evidence.`
          : 'No hard character limit configured for this mode.',
        activeMode === 'debug'
          ? `When in Debug mode, start with a "Debug Brief" that fits within the limit, including sections: Summary (bullets), Evidence (requestId/action/id/auth context), Error (code/constraint/message), Probable cause, Next actions (3-6 bullets). Cite evidence and ask for at most one missing fact. Avoid dumping raw bundles unless explicitly requested.`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    );

    if (environment) {
      systemParts.push(`Environment context (resolved via KAM):\n${JSON.stringify(environment, null, 2)}`);

      // Domain contract (matches callAIModel injection)
      if (options.domainId) {
        try {
          const contractText = await getContractTextForDomain(options.domainId);
          if (contractText) {
            systemParts.push(`DOMAIN CONTRACT (non-negotiable behavioral rules):\n\n${contractText}`);
          }
        } catch {
          /* ignore */
        }
      }

      const allowList = Array.from(buildAllowedActions(environment as any));
      const draftRules = (environment as any)?.policy?.policy?.drafts ?? {};
      const draftKinds =
        (draftRules?.autoDraft?.kinds as string[] | undefined) ?? ['vehicle_template', 'journey_spec', 'keeper_type_proposal', 'checklist_spec'];

      // Read domain image generation defaults to surface in Kip's context
      let domainImageStyle: string | null = null;
      let domainImageModel: string | null = null;
      if (options.domainId) {
        try {
          const domainRec = await prisma.domain.findUnique({
            where: { id: options.domainId },
            select: { frame_json: true },
          });
          const frame = domainRec?.frame_json as Record<string, any> | null;
          if (frame?.kip?.image_style) domainImageStyle = String(frame.kip.image_style);
          if (frame?.kip?.image_model)  domainImageModel  = String(frame.kip.image_model);
        } catch { /* non-fatal */ }
      }

      systemParts.push(
        [
          'Structured response required: reply with raw JSON only (no markdown or code fences). Your entire response MUST be a single JSON object with "type": "agent_output", "response" (string), and optional "actions" (array). Example envelope: {"type":"agent_output","response":"Your message here.","actions":[...]}',
          `Allowed actions: ${allowList.join(', ')}.`,
          'Each action must include a "type" and optional "payload".',
          'Do not state that drafts were saved unless you return a draft.create or draft.update action.',
          'Avoid repeating the same confirmation or summary multiple times. Each response should add new information or complete a distinct action.',
          '',
          'SOLE vs DRAFTS — use the right tool:',
          '- sole.save: for insights, learnings, corrections, capability clarifications. High bar: "Will this matter in 30 days?"',
          '- draft.create/update: for documents, specs, proposals. Use when user explicitly asks OR uses planning phrases (plan, outline, spec, design, architecture, "let\'s think this through").',
          '',
          'DRAFT BEHAVIOR — when to act vs respond (per Domain Contract):',
          '- MUST call draft.create when user requests planning, outlining, designing, spec creation, architecture, or says: plan, outline, spec, design, architecture, "let\'s think this through". Work iteratively inside the draft; finalize only when user signals completion.',
          '- When the user asks "what can you do?", "tell me your capabilities", or "how can you help" — give a substantive narrative. If they ask to "show" or "demonstrate" (e.g. "show me with action cards"), use sole.save to record key capabilities and present action cards. Never give a minimal response when the user wants a full explanation.',
          '- When the user wants to work on an EXISTING draft, use draft.update or draft.setActive. Never create a duplicate.',
          '- Check draftsDirectory in the environment. If a draft with the same or similar title already exists, use draft.update (with id) or draft.setActive — do NOT create another.',
          buildDraftUpdateInstruction(agent),
          '- Drafts are scoped by keeper (primary) or domain (secondary). When the user has a keeper selected, prefer keeper-scoped drafts. Include keeperId in draft.create when the draft is relevant to the active keeper.',
          '- Never create multiple drafts for the same purpose. One draft per distinct topic. If unsure, respond with text and ask the user to clarify.',
          '- When listing or discussing drafts, ALWAYS include each draft\'s title and updated date. A response that only gives a count (e.g. "You have 3 drafts") is not useful. Use draftsDirectory from the environment — format each as: [title] (updated [date]).',
          '',
          'SESSION NAMING (closing ritual): When the user signals the conversation is complete (e.g. "thanks that\'s all", "we\'re done", "goodbye", "that\'s it for now"), suggest naming the session: "Would you like to give this session a name? You can do that in the Sessions sidebar." This helps users find conversations later.',
          '',
          'IMAGE GENERATION — image.generate action:',
          '- Use image.generate when the human explicitly requests an image, when a visual would meaningfully enhance a Moment or Journey, or when creative context calls for it.',
          '- image.generate — Dispatch to the image generation subagent. Fields: subject (REQUIRED — always populate this with a concrete description of what to generate, e.g. "a midnight blue field with warm amber light"), mood (optional), style (optional), aspect_ratio (optional: "1:1", "16:9", "9:16", "4:3"). You MUST include subject or the action will fail. Do not emit image.generate without subject populated.',
          '- Do not specify model or domain_context — these are handled server-side from domain configuration.',
          domainImageStyle ? `- This domain\'s visual character: "${domainImageStyle}". You may draw on this when composing subject, mood, and style — or depart from it if the request calls for something different.` : null,
          domainImageModel ? `- Default image model for this domain: ${domainImageModel}.` : null,
          '- Generate images purposefully, not reflexively. A well-timed image is memorable. An image on every response is noise.',
          '- Example: {"type":"agent_output","response":"Here\'s your image.","actions":[{"type":"image.generate","payload":{"subject":"a keeper\'s desk at dusk, scattered notes and warm light","mood":"quiet, reflective","style":"cinematic photography","aspect_ratio":"16:9"}}]}',
          '',
          `draft.create payload schema: kind (required, e.g. ${draftKinds.slice(0, 4).join(', ')}), key (required, URL-safe slug), title (required), summary (optional), spec (optional object).`,
          'draft.update payload schema: id (required, draft UUID), title (optional), summary (optional), status (optional), spec (optional object — replaces draft spec when provided).',
          'draft.create payload MUST include spec.sections: an array of {title, content} with at least 2–3 substantive sections. Use specific details from the conversation, not generic summaries.',
          'Example: {"response":"I\'ve created the draft.","actions":[{"type":"draft.create","payload":{"kind":"journey_spec","key":"my-draft-abc","title":"My Draft","summary":"Brief summary","spec":{"sections":[{"title":"Section 1","content":"Specific content here"},{"title":"Section 2","content":"More details"}]}}}]}',
          draftRules?.autoDraft?.enabled
            ? `If autoDraft thresholds are met (sections >= ${draftRules?.autoDraft?.thresholds?.minSections ?? 0}, chars >= ${draftRules?.autoDraft?.thresholds?.minChars ?? 0}) or the user explicitly asks for a new draft, include draft.create (or draft.update) with a short confirmation message.`
            : 'If the user explicitly asks for a new draft, include draft.create (or draft.update) with a short confirmation message.',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    // ── Response rendering governance — keeper-card versus prose ──────────────
    // Unconditional: applies regardless of lens resolution or environment state.
    // Governs how Kip formats the "response" string inside the agent_output envelope.
    systemParts.push(
      [
        'RESPONSE RENDERING — keeper-card versus prose:',
        '',
        'Relational responses — conversations, questions, reflections, and explanations — render as prose inside the "response" field. Clean, warm, direct. No card wrapper.',
        '',
        'Operational responses — platform objects, status summaries, action results, structured plans, and lists the user must act on — render using a keeper-card fenced block inside the "response" field. Not prose. Not markdown headers. A keeper-card.',
        '',
        'The governance rule: if the response requires the user to do something with it — act on it, choose from it, navigate to it — it renders as a keeper-card. If Kip is speaking, it renders as prose.',
        '',
        'keeper-card format (inside the "response" string value):',
        '```keeper-card',
        '{"type":"status","title":"Brief title of what happened","body":"One sentence description","meta":"Secondary detail if relevant"}',
        '```',
        '',
        'Example — a status card Kip produces in its response field:',
        '```keeper-card',
        '{"type":"status","title":"Phase 2 Sprint 1","body":"Governance rules confirmed live in runtime prompt. keeper-card pipeline verified end to end."}',
        '```',
        '',
        'Permitted type values: "status" | "summary" | "error" | "info".',
        '- "status" — confirmation of a completed action (most common)',
        '- "summary" — summary of multiple items or states the user needs to scan',
        '- "error" — something failed or could not be completed',
        '- "info" — informational context, no action taken',
        '',
        'keeper-card rules:',
        '- One keeper-card per response maximum',
        '- Prose may appear before or after the keeper-card block',
        '- The keeper-card JSON must be on a single line inside the fenced block',
        '- Do not wrap conversational content in a keeper-card',
        '- Do not produce a keeper-card for every response — only when the content is operational',
      ].join('\n'),
    );

    // ── Domain content tools — on-demand retrieval ────────────────────────────
    // Unconditional: Kip always knows these tools exist regardless of environment.
    systemParts.push(
      [
        'TOOLS — HOW TO USE THEM:',
        '',
        'When a tool answers the question, call it immediately.',
        'Do not say "I\'ll run sole.read now" or "Let me check that for you."',
        'Act. Then report what you found.',
        'The human does not need to know you are about to call a tool.',
        'They need to know what the tool returned.',
        '',
        'REPORTING TOOL RESULTS:',
        '',
        'After a tool call completes, always report the substance of what was returned',
        'in your response — not just that the action completed.',
        '',
        'For sole.read: summarize the cards retrieved. How many. What topics.',
        'Quote the most relevant content directly if it answers the question.',
        '',
        'For journey.read: report the Journey title, Path count, and key Moments found.',
        '',
        'For moment.read: report the Moment title and narrative content.',
        '',
        'For keeper.read: report the Keeper title, purpose, and associated Journey count.',
        '',
        'The Completed receipt confirms the action ran.',
        'Your response must confirm what it found.',
        '',
        'DOMAIN CONTENT TOOLS — use these to read live domain content on demand:',
        '',
        'sole.read — retrieves your saved SOLE memory cards. Use when you need to recall',
        'what you know about this domain, a keeper, or a topic. Payload: { topic?, keeperId?, limit? }',
        '',
        'journey.read — retrieves a full Journey with all Paths and nested Moments.',
        'Use when a user asks about a specific Journey in depth. Payload: { journeyId }',
        '',
        'moment.read — retrieves the full content of a specific Moment including narrative.',
        'Use when a user asks about a specific Moment. Payload: { momentId }',
        '',
        'keeper.read — retrieves full Keeper content including associated journeys and counts.',
        'Use when a user asks about a specific Keeper. Payload: { keeperId }',
        '',
        'You have an index at session start. Use these tools to go deeper when needed.',
        'Do not guess at content you can retrieve. Call the tool and read the territory.',
      ].join('\n'),
    );

    if (environment) {
      systemParts.push(SoleMemoryService.getSoleMemoryLoopInstruction());
      systemParts.push(SoleMemoryService.getSoleArchitecturePrompt());
      const envWithIndex = environment as { domainIndex?: { keepers: Array<{ id: string; title: string; purpose?: string | null }>; journeys: Array<{ id: string; name: string; forward: string; keeperId: string }> } } | undefined;
      if (envWithIndex?.domainIndex) {
        const { keepers, journeys } = envWithIndex.domainIndex;
        const keeperList = keepers.map((k) => `${k.title} (${k.id})`).join('; ');
        const journeyList = journeys.map((j) => `${j.name} (${j.id}, keeper ${j.keeperId})`).join('; ');
        systemParts.push(`Domain context: Keepers: ${keeperList || 'none'}. Journeys: ${journeyList || 'none'}. Use these to understand scope and reference correctly.`);
      }
      if (options.keeperId) {
        try {
          const keeperUsesSole = await SoleMemoryService.isKeeperUsingSOLE(options.keeperId);
          if (keeperUsesSole) {
            const memoryCards = await prisma.soleMemoryCard.findMany({
              where: { keeperId: options.keeperId },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, content: true, topic: true },
            });
            if (memoryCards.length > 0) {
              const memorySummary = memoryCards
                .map((c) => `- ${c.topic ? `[${c.topic}] ` : ''}${c.content.slice(0, 100)}`)
                .join('\n');
              systemParts.push(
                `Relevant SOLE memories (keeper-sharpened):\n${memorySummary}\n\nUse these memories to inform your responses. When the user asks you to "remember" something, use the sole.save action.`,
              );
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (options.journeyId) {
      try {
        const journey = await prisma.journey.findUnique({
          where: { id: options.journeyId },
          select: {
            id: true,
            name: true,
            forward: true,
            Moment: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, title: true, narrative: true },
            },
          },
        });
        if (journey) {
          const momentSummaries = journey.Moment.map(
            (m) => `- "${m.title}": ${(m.narrative || '').slice(0, 80)}`,
          ).join('\n');
          systemParts.push(
            [
              `Active Journey: "${journey.name}" — ${journey.forward}`,
              journey.Moment.length > 0
                ? `Recent moments in this journey:\n${momentSummaries}`
                : 'No moments in this journey yet.',
              'When the user asks you to create a moment, use the moment.create action with the active journey context.',
            ].join('\n'),
          );
        }
      } catch {
        /* ignore */
      }
    }

    return systemParts.join('\n\n');
  }

  /**
   * Call real AI model with conversation context
   */
  static async callAIModel(
    agent: TypedAgent,
    input: string,
    previousMessages: KipMessageWithRelations[],
    userId?: string,
      promptOptions?: {
      mode: AgentModeKey;
      modeConfig: ModeConfig;
      lens?: { systemPrompt?: string | null };
      debugSummary?: string | null;
      maxChars?: number | null;
      outputStyle?: OutputStyle;
      includeFixPlan?: boolean;
      autoBrief?: boolean;
      environment?: AgentEnvironmentContext | KipEnvironmentContext | null;
      activeJourneyId?: string | null;
      activeKeeperId?: string | null;
      domainId?: string | null;
      attachments?: { url: string; name: string; type: 'image' | 'file' }[];
    },
  ): Promise<{ content: string; composedSystemPrompt: string }> {
    try {
      const modelProvider = (agent.model_provider || 'openai') as ModelProvider;
      const defaults = ModelProviderService.getDefaultSettings(modelProvider);
      const storedSettings =
        agent.model_settings &&
        typeof agent.model_settings === 'object' &&
        !Array.isArray(agent.model_settings)
          ? (agent.model_settings as Partial<ModelSettings>)
          : {};
      const resolvedModel =
        (typeof agent.model === 'string' && agent.model.trim()) ||
        (typeof storedSettings.model === 'string' && storedSettings.model.trim()) ||
        defaults.model;
      const modelSettings: ModelSettings = {
        ...defaults,
        ...storedSettings,
        model: resolvedModel,
      };
      
      // Build conversation messages for the AI model
      const messages: ModelMessage[] = [];
      
      // Add system message with agent context
      const config = agent.config || {};
      const styleHelper: Record<OutputStyle, string> = {
        concise: 'Keep replies compact and bullet-first where possible.',
        normal: 'Balance clarity with brevity; surface key evidence first.',
        expanded: 'Provide fuller reasoning and details while staying structured.',
      };
      const outputStyle = (promptOptions?.outputStyle as OutputStyle) || 'normal';
      const maxChars = typeof promptOptions?.maxChars === 'number' ? promptOptions.maxChars : null;
      const mode = promptOptions?.mode || 'domain';
      const systemPrompt = [
        promptOptions?.lens?.systemPrompt || '',
        `You are ${agent.name}, ${agent.purpose}. ${config.tagline || ''}`.trim(),
        `Mode: ${mode.toUpperCase()}. Output style: ${styleHelper[outputStyle]}`,
        maxChars && maxChars > 0
          ? `Hard limit: keep the Debug Brief under ${maxChars} characters; prefer concise evidence.`
          : 'No hard character limit configured for this mode.',
        mode === 'debug' && promptOptions?.autoBrief !== false
          ? `When in Debug mode, start with a "Debug Brief" that fits within the limit, including sections: Summary (bullets), Evidence (requestId/action/id/auth context), Error (code/constraint/message), Probable cause, Next actions (3-6 bullets)${promptOptions?.includeFixPlan ? ', and Fix Plan' : ''}. Cite evidence and ask for at most one missing fact. Avoid dumping raw bundles unless explicitly requested.`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });

      if (mode === 'debug' && promptOptions?.debugSummary) {
        messages.push({
          role: 'system',
          content: `Bounded debug bundle:\n${promptOptions.debugSummary}`,
        });
      }

      const environmentContext = promptOptions?.environment ?? null;
      const modelInput = {
        input,
        environment: environmentContext,
        agent: { id: agent.id },
      };

      if (environmentContext) {
        messages.push({
          role: 'system',
          content: `Environment context (resolved via KAM):\n${JSON.stringify(environmentContext, null, 2)}`,
        });

        // --- Domain contract injection (wires contract rules to Kip) ---
        const suppressKipPrompt =
          (config as Record<string, unknown>)?.suppress_kip_system_prompt === true;
        if (promptOptions?.domainId && !suppressKipPrompt) {
          try {
            const contractText = await getContractTextForDomain(promptOptions.domainId);
            if (contractText) {
              messages.push({
                role: 'system',
                content: `DOMAIN CONTRACT (non-negotiable behavioral rules):\n\n${contractText}`,
              });
            }
          } catch (err) {
            console.warn('[kip/agents] Failed to load contract for prompt:', err);
          }
        }

        // --- User Voice Preferences (tone, conciseness, preamble) ---
        if (userId) {
          try {
            const prefs = await prisma.userVoicePreferences.findUnique({
              where: { userId },
            });
            if (prefs && (prefs.directness || prefs.conciseness || prefs.preamble)) {
              const directnessMap: Record<string, string> = {
                direct: 'direct and straightforward',
                diplomatic: 'diplomatic and considerate',
                default: 'balanced in tone',
              };
              const concisenessMap: Record<string, string> = {
                concise: 'concise',
                normal: 'moderately detailed',
                expanded: 'expansive',
              };
              const preambleMap: Record<string, string> = {
                minimal: 'minimal preamble',
                normal: 'standard preamble',
                contextual: 'contextual preamble',
              };
              const parts: string[] = [];
              if (prefs.directness && prefs.directness !== 'default') {
                parts.push(`Be ${directnessMap[prefs.directness] ?? prefs.directness}`);
              }
              if (prefs.conciseness && prefs.conciseness !== 'normal') {
                parts.push(`Be ${concisenessMap[prefs.conciseness] ?? prefs.conciseness}`);
              }
              if (prefs.preamble && prefs.preamble !== 'normal') {
                parts.push(`Use ${preambleMap[prefs.preamble] ?? prefs.preamble}`);
              }
              if (parts.length > 0) {
                messages.push({
                  role: 'system',
                  content: `User Voice Preferences: ${parts.join('. ')}.`,
                });
              }
            }
          } catch (err) {
            console.warn('[kip/agents] Failed to load voice preferences for prompt:', err);
          }
        }

        const allowList = Array.from(buildAllowedActions(environmentContext));

        const draftRules = (environmentContext as any)?.policy?.policy?.drafts ?? {};
        const draftKinds = (draftRules?.autoDraft?.kinds as string[] | undefined) ?? ['vehicle_template', 'journey_spec', 'keeper_type_proposal', 'checklist_spec'];
        messages.push({
          role: 'system',
          content: [
            'Structured response required: reply with raw JSON only (no markdown or code fences). Your entire response MUST be a single JSON object with "type": "agent_output", "response" (string), and optional "actions" (array). Example envelope: {"type":"agent_output","response":"Your message here.","actions":[...]}',
            `Allowed actions: ${allowList.join(', ')}.`,
            'Each action must include a "type" and optional "payload".',
            'Do not state that drafts were saved unless you return a draft.create or draft.update action.',
            'Avoid repeating the same confirmation or summary multiple times. Each response should add new information or complete a distinct action.',
            '',
            'SOLE vs DRAFTS — use the right tool:',
            '- sole.save: for insights, learnings, corrections, capability clarifications, anything you want to remember. Use it when the user corrects you or you learn something important. High bar: "Will this matter in 30 days?"',
            '- draft.create/update: for documents, specs, proposals (journey specs, keeper proposals, checklists). Use when the user explicitly asks OR when they use planning phrases (plan, outline, spec, design, architecture, "let\'s think this through").',
            '',
            'DRAFT BEHAVIOR — when to act vs respond (per Domain Contract):',
            '- MUST call draft.create when the user requests planning, outlining, designing, spec creation, architecture, or says: plan, outline, spec, design, architecture, "let\'s think this through". Work iteratively inside the draft; finalize only when user signals completion.',
            '- When the user asks "what can you do?", "tell me your capabilities", or "how can you help" — give a substantive narrative. If they ask to "show" or "demonstrate" (e.g. "show me with action cards"), use sole.save to record key capabilities and present action cards. Never give a minimal response when the user wants a full explanation.',
            '- When the user wants to work on an EXISTING draft, use draft.update or draft.setActive. Never create a duplicate.',
            '- Check draftsDirectory in the environment. If a draft with the same or similar title already exists, use draft.update (with id) or draft.setActive — do NOT create another.',
            buildDraftUpdateInstruction(agent),
            '- Drafts are scoped by keeper (primary) or domain (secondary). When the user has a keeper selected, prefer keeper-scoped drafts. Include keeperId in draft.create when the draft is relevant to the active keeper.',
            '- Never create multiple drafts for the same purpose. One draft per distinct topic. If unsure, respond with text and ask the user to clarify.',
            '- When listing or discussing drafts, ALWAYS include each draft\'s title and updated date. A response that only gives a count (e.g. "You have 3 drafts") is not useful. Use draftsDirectory from the environment — format each as: [title] (updated [date]).',
            '',
            'SESSION NAMING (closing ritual): When the user signals the conversation is complete (e.g. "thanks that\'s all", "we\'re done", "goodbye", "that\'s it for now"), suggest naming the session: "Would you like to give this session a name? You can do that in the Sessions sidebar." This helps users find conversations later.',
            '',
            'IMAGE GENERATION — image.generate action:',
            '- Use image.generate when the human explicitly requests an image, when a visual would meaningfully enhance a Moment or Journey, or when creative context calls for it.',
            '- image.generate — Dispatch to the image generation subagent. Fields: subject (REQUIRED — always populate this with a concrete description of what to generate, e.g. "a midnight blue field with warm amber light"), mood (optional), style (optional), aspect_ratio (optional: "1:1", "16:9", "9:16", "4:3"). You MUST include subject or the action will fail. Do not emit image.generate without subject populated.',
            '- Do not specify model or domain_context — these are handled server-side from domain configuration.',
            '- Generate images purposefully, not reflexively. A well-timed image is memorable. An image on every response is noise.',
            '- Example: {"type":"agent_output","response":"Here\'s your image.","actions":[{"type":"image.generate","payload":{"subject":"a keeper\'s desk at dusk, scattered notes and warm light","mood":"quiet, reflective","style":"cinematic photography","aspect_ratio":"16:9"}}]}',
            '',
            `draft.create payload schema: kind (required, e.g. ${draftKinds.slice(0, 4).join(', ')}), key (required, URL-safe slug), title (required), summary (optional), spec (optional object).`,
            'draft.update payload schema: id (required, draft UUID), title (optional), summary (optional), status (optional), spec (optional object — replaces draft spec when provided).',
            'draft.create payload MUST include spec.sections: an array of {title, content} with at least 2–3 substantive sections. Use specific details from the conversation, not generic summaries.',
            'Example: {"response":"I\'ve created the draft.","actions":[{"type":"draft.create","payload":{"kind":"journey_spec","key":"my-draft-abc","title":"My Draft","summary":"Brief summary","spec":{"sections":[{"title":"Section 1","content":"Specific content here"},{"title":"Section 2","content":"More details"}]}}}]}',
            draftRules?.autoDraft?.enabled
              ? `If autoDraft thresholds are met (sections >= ${draftRules?.autoDraft?.thresholds?.minSections ?? 0}, chars >= ${draftRules?.autoDraft?.thresholds?.minChars ?? 0}) or the user explicitly asks for a new draft, include draft.create (or draft.update) with a short confirmation message.`
              : 'If the user explicitly asks for a new draft, include draft.create (or draft.update) with a short confirmation message.',
          ]
            .filter(Boolean)
            .join('\n'),
        });

        // ── Response rendering governance — keeper-card versus prose ──────────────
        // Unconditional within domain context: governs how Kip formats the "response"
        // string inside the agent_output envelope. Must stay in sync with
        // buildComposedSystemPrompt (Cockpit preview). Source of truth is here.
        messages.push({
          role: 'system',
          content: [
            'RESPONSE RENDERING — keeper-card versus prose:',
            '',
            'Relational responses — conversations, questions, reflections, and explanations — render as prose inside the "response" field. Clean, warm, direct. No card wrapper.',
            '',
            'Operational responses — platform objects, status summaries, action results, structured plans, and lists the user must act on — render using a keeper-card fenced block inside the "response" field. Not prose. Not markdown headers. A keeper-card.',
            '',
            'The governance rule: if the response requires the user to do something with it — act on it, choose from it, navigate to it — it renders as a keeper-card. If Kip is speaking, it renders as prose.',
            '',
            'keeper-card format (inside the "response" string value):',
            '```keeper-card',
            '{"type":"status","title":"Brief title of what happened","body":"One sentence description","meta":"Secondary detail if relevant"}',
            '```',
            '',
            'Example — a status card Kip produces in its response field:',
            '```keeper-card',
            '{"type":"status","title":"Phase 2 Sprint 1","body":"Governance rules confirmed live in runtime prompt. keeper-card pipeline verified end to end."}',
            '```',
            '',
            'Permitted type values: "status" | "summary" | "error" | "info".',
            '- "status" — confirmation of a completed action (most common)',
            '- "summary" — summary of multiple items or states the user needs to scan',
            '- "error" — something failed or could not be completed',
            '- "info" — informational context, no action taken',
            '',
            'keeper-card rules:',
            '- One keeper-card per response maximum',
            '- Prose may appear before or after the keeper-card block',
            '- The keeper-card JSON must be on a single line inside the fenced block',
            '- Do not wrap conversational content in a keeper-card',
            '- Do not produce a keeper-card for every response — only when the content is operational',
          ].join('\n'),
        });
      }
      
      // --- Journey + Moments context injection ---
      if (promptOptions?.activeJourneyId) {
        try {
          const journey = await prisma.journey.findUnique({
            where: { id: promptOptions.activeJourneyId },
            select: {
              id: true,
              name: true,
              forward: true,
              Moment: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, title: true, narrative: true },
              },
            },
          });
          if (journey) {
            const momentSummaries = journey.Moment.map(
              (m) => `- "${m.title}": ${(m.narrative || '').slice(0, 80)}`,
            ).join('\n');
            messages.push({
              role: 'system',
              content: [
                `Active Journey: "${journey.name}" — ${journey.forward}`,
                journey.Moment.length > 0
                  ? `Recent moments in this journey:\n${momentSummaries}`
                  : 'No moments in this journey yet.',
                'When the user asks you to create a moment, use the moment.create action with the active journey context.',
              ].join('\n'),
            });
          }
        } catch (err) {
          console.warn('[kip/agents] Failed to inject journey context:', err);
        }
      }

      // --- SOLE memory context injection ---
      // SOLE exists at domain level and is always accessible. Keeper association sharpens for that keeper.
      if (environmentContext) {
        try {
          // Base SOLE instruction: always injected when in domain context
          messages.push({
            role: 'system',
            content: SoleMemoryService.getSoleMemoryLoopInstruction(),
          });
          messages.push({
            role: 'system',
            content: SoleMemoryService.getSoleArchitecturePrompt(),
          });

          const envWithIndex = environmentContext as { domainIndex?: { keepers: Array<{ id: string; title: string; purpose?: string | null }>; journeys: Array<{ id: string; name: string; forward: string; keeperId: string }> } } | undefined;
          if (envWithIndex?.domainIndex) {
            const { keepers, journeys } = envWithIndex.domainIndex;
            const keeperList = keepers.map((k) => `${k.title} (${k.id})`).join('; ');
            const journeyList = journeys.map((j) => `${j.name} (${j.id}, keeper ${j.keeperId})`).join('; ');
            messages.push({
              role: 'system',
              content: `Domain context: Keepers: ${keeperList || 'none'}. Journeys: ${journeyList || 'none'}. Use these to understand scope and reference correctly.`,
            });
          }

          // Keeper sharpening: when a keeper is selected and uses SOLE, add memory cards
          if (promptOptions?.activeKeeperId) {
            const keeperUsesSole = await SoleMemoryService.isKeeperUsingSOLE(promptOptions.activeKeeperId);
            if (keeperUsesSole) {
              const memoryCards = await prisma.soleMemoryCard.findMany({
                where: { keeperId: promptOptions.activeKeeperId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, content: true, topic: true },
              });
              if (memoryCards.length > 0) {
                const memorySummary = memoryCards
                  .map((c) => `- ${c.topic ? `[${c.topic}] ` : ''}${c.content.slice(0, 100)}`)
                  .join('\n');
                messages.push({
                  role: 'system',
                  content: `Relevant SOLE memories (keeper-sharpened):\n${memorySummary}\n\nUse these memories to inform your responses. When the user asks you to "remember" something, use the sole.save action.`,
                });
              }
            }
          } else if (promptOptions?.domainId) {
            // Domain anchor: when no keeper selected, inject domain-scoped SOLE (Option B)
            const domainCards = await prisma.soleMemoryCard.findMany({
              where: { domainId: promptOptions.domainId, keeperId: null },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, content: true, topic: true },
            });
            if (domainCards.length > 0) {
              const memorySummary = domainCards
                .map((c) => `- ${c.topic ? `[${c.topic}] ` : ''}${c.content.slice(0, 100)}`)
                .join('\n');
              messages.push({
                role: 'system',
                content: `Relevant SOLE memories (domain anchor):\n${memorySummary}\n\nUse these memories to inform your responses. When the user asks you to "remember" something or you learn something important, use the sole.save action.`,
              });
            }
          }
        } catch (err) {
          console.warn('[kip/agents] Failed to inject SOLE context:', err);
        }
      }

      // Add conversation history (last 10 messages to avoid token limits)
      const recentMessages = previousMessages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Add current user message (multimodal when images are attached)
      const attachments = promptOptions?.attachments ?? [];
      const imageAttachments = attachments.filter((a) => a.type === 'image');
      const textContent = typeof modelInput.input === 'string' ? modelInput.input : JSON.stringify(modelInput.input);

      if (imageAttachments.length > 0) {
        const parts: ModelContentPart[] = [];
        if (textContent.trim()) {
          parts.push({ type: 'text', text: textContent });
        }
        for (const img of imageAttachments) {
          parts.push({ type: 'image_url', image_url: { url: img.url } });
        }
        if (parts.length === 0) {
          parts.push({ type: 'text', text: '[Image(s) attached for analysis]' });
        }
        messages.push({ role: 'user', content: parts });
      } else {
        const userContent = textContent || '[No text provided]';
        messages.push({ role: 'user', content: userContent });
      }
      
      // Build composed system prompt (all system messages concatenated)
      const composedSystemPrompt = messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n');

      // Call the model provider (jsonMode when structured response required)
      const response = await ModelProviderService.callModel({
        messages,
        settings: modelSettings,
        provider: modelProvider,
        userId,
        environment: promptOptions?.environment ?? undefined,
        jsonMode: !!promptOptions?.environment,
      });
      
      if (response.success) {
        return { content: response.content, composedSystemPrompt };
      }

      const mappedCode = mapProviderCodeToAgentCode(response.errorCode);
      throw new AgentExecutionError(
        mappedCode,
        response.error || 'AI model call failed',
        {
          provider: modelProvider,
          model: modelSettings.model,
          retries: response.retries_used
        }
      );
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw error;
    }
  }

  /**
   * Run an agent with provided input, comprehensive logging, and memory persistence
   */
  static async runAgent(
    agentId: string,
    input: string,
    userId?: string,
    sessionId?: string,
    options?: RunAgentOptions,
  ): Promise<AgentResponse | KipCommandIntent> {
    const startTime = Date.now();
    const logData = {
      agent_id: agentId,
      user_id: userId,
      input: input,
      model: undefined as string | undefined,
      output: undefined as string | undefined,
      error: undefined as string | undefined,
      execution_time_ms: 0
    };
    
    try {
      // Validate input: need agentId and either input text or attachments
      const hasInput = typeof input === 'string' && input.trim().length > 0;
      const hasAttachments = Array.isArray(options?.attachments) && options.attachments.length > 0;
      if (!agentId || (!hasInput && !hasAttachments)) {
        throw new Error('Agent ID and either input text or attachments are required');
      }

      // Get agent safely using our helper method
      const agent = await this.getAgentSafely(agentId);

      // Update log to use the actual agent UUID for consistency
      logData.agent_id = agent.id;
      logData.model = agent.model;

      // Resolve mode configuration (per agent + domain)
      const modeState = isDbDisabled() ? null : await loadModeState(agent.id, options?.domainId);
      const activeMode: AgentModeKey =
        options?.mode === 'debug'
          ? 'debug'
          : options?.mode === 'domain'
            ? 'domain'
            : modeState?.state.activeMode || 'domain';
      const fallbackModeConfig: ModeConfig = {
        outputStyle: 'normal',
        limits: { maxChars: activeMode === 'debug' ? 2000 : 0 },
        captureN: 20,
        autoBrief: true,
        includeFixPlan: true,
      };
      const activeModeConfig = (modeState?.state.modeConfigs[activeMode] as ModeConfig) || fallbackModeConfig;
      const lensId =
        activeModeConfig.lensId ||
        (activeMode === 'debug' ? modeState?.lenses?.debugLensId : modeState?.lenses?.domainLensId) ||
        null;
      const lens =
        !isDbDisabled() && lensId ? await prisma.kip_lenses.findUnique({ where: { id: lensId } }) : null;
      const debugSummary =
        activeMode === 'debug' ? formatDebugBundleSummary(options?.debugBundle, activeModeConfig) : null;
      const maxChars = typeof activeModeConfig.limits?.maxChars === 'number' ? activeModeConfig.limits.maxChars : null;

      // Handle different agent classes
      let result: unknown;

      // Handle Lead agents - interactive chat experience with memory
      if (agent.agent_class === 'Lead') {
        let currentSessionId = sessionId;
        let previousMessages: KipMessageWithRelations[] = [];
        
        // Handle memory for memory-enabled agents
        if (agent.memory_enabled) {
          if (sessionId) {
            // Load existing session memory
            try {
              previousMessages = await this.getSessionMemory(sessionId);
            } catch (error) {
              console.warn('Failed to load session memory:', error);
              // Continue without memory if loading fails
            }
            // Update session's journey/keeper context if provided
            const newJourneyId = options?.activeJourneyId ?? null;
            const newKeeperId = options?.activeKeeperId ?? null;
            if (newJourneyId || newKeeperId) {
              try {
                await prisma.kip_sessions.update({
                  where: { id: sessionId },
                  data: {
                    ...(newJourneyId ? { primary_journey_id: newJourneyId } : {}),
                    ...(newKeeperId ? { primary_keeper_id: newKeeperId } : {}),
                    updated_at: new Date(),
                  },
                });
              } catch (error) {
                console.warn('Failed to update session context:', error);
              }
            }
          } else {
            // Create new session for memory-enabled agents
            try {
              const newSession = await this.createSession(agentId, userId, undefined, {
                primaryJourneyId: options?.activeJourneyId ?? null,
                primaryKeeperId: options?.activeKeeperId ?? null,
              });
              currentSessionId = newSession.id;
            } catch (error) {
              console.warn('Failed to create session:', error);
              // Continue without memory if session creation fails
            }
          }
          
          // Save user message to memory if we have a session
          if (currentSessionId) {
            try {
              const textToSave = input?.trim() || (options?.attachments?.length ? `[${options.attachments.length} attachment(s)]` : '');
              await this.saveMessage(currentSessionId, 'user', textToSave, 'user', {
                timestamp: new Date().toISOString(),
                agent_id: agentId
              });
            } catch (error) {
              console.warn('Failed to save user message:', error);
            }
          }
        }
        
        // Generate response using real AI model with memory context
        const aiResult = await this.callAIModel(agent, input || '', previousMessages, userId, {
          mode: activeMode,
          modeConfig: activeModeConfig,
          lens: { systemPrompt: lens?.systemPrompt || null },
          debugSummary,
          maxChars,
          outputStyle: (activeModeConfig.outputStyle as OutputStyle) || 'normal',
          includeFixPlan: activeModeConfig.includeFixPlan,
          autoBrief: activeModeConfig.autoBrief,
          environment: options?.environment ?? null,
          activeJourneyId: options?.activeJourneyId ?? null,
          activeKeeperId: options?.activeKeeperId ?? null,
          domainId: options?.domainId ?? null,
          attachments: options?.attachments ?? undefined,
        });

        const response = aiResult.content;
        const composedSystemPrompt = aiResult.composedSystemPrompt;

        const requestId = randomUUID();
        let structured = parseStructuredAgentResponse(response, requestId);
        console.log('[kip/agents] Raw AI response (first 1000):', response.slice(0, 1000));
        console.log('[actions] Parsed actions:', JSON.stringify(structured.actions));
        console.log('[kip/agents] ignoredReason:', structured.ignoredReason ?? null);
        console.log('[kip/agents] validationError:', structured.validationError?.message ?? null);
        const allowActions = buildAllowedActions(options?.environment ?? null);
        const actionPack = options?.actionPack ?? buildActionPackFromAllowlist(allowActions);

        let finalResponseText = structured.responseText;
        let actionResults: ActionExecutionResult[] = [];

        // Pre-exec governance check (Draft Trigger + Tool-First)
        let governanceRetryCount = 0;
        const governanceMaxRetries = 2;
        let lastResponse = response;
        let lastStructured = structured;

        while (governanceRetryCount <= governanceMaxRetries) {
          const governanceResult = await preExecGovernanceCheck({
            userInput: input,
            parsedResponse: lastStructured,
            agentPolicyView: options?.environment?.governance ?? null,
            domainId: options?.domainId ?? null,
            agentId: agent.id,
            sessionId: currentSessionId,
            runId: requestId,
          });

          if (governanceResult.pass || governanceResult.enforcementMode !== 'strict') {
            structured = lastStructured;
            finalResponseText = structured.responseText;
            break;
          }

          if (governanceRetryCount >= governanceMaxRetries) {
            finalResponseText = `${lastStructured.responseText}\n\n[Policy enforcement degraded (tool compliance).]`;
            structured = lastStructured;
            break;
          }

          const regenLimit = await checkRegenerateLimit(currentSessionId);
          if (!regenLimit.withinLimit) {
            finalResponseText = `${lastStructured.responseText}\n\n[Policy enforcement degraded (tool compliance).]`;
            structured = lastStructured;
            break;
          }

          // Log regenerate attempt for circuit breaker
          if (options?.domainId) {
            await logComplianceEvent({
              domainId: options.domainId,
              agentId: agent.id,
              sessionId: currentSessionId,
              runId: requestId,
              ruleKey: 'regenerate_attempt',
              required: true,
              present: false,
              passed: false,
              enforcementMode: 'strict',
              metadata: { attempt: governanceRetryCount + 1 },
            });
          }

          // Retry: call model with violation message as follow-up
          const retryPrevMessages: KipMessageWithRelations[] = [
            ...previousMessages,
            {
              id: `retry-user-${requestId}`,
              session_id: currentSessionId || '',
              sender: 'user',
              content: input,
              role: 'user',
              metadata: {},
              created_at: new Date(),
            },
            {
              id: `retry-agent-${requestId}`,
              session_id: currentSessionId || '',
              sender: 'agent',
              content: lastResponse,
              role: 'assistant',
              metadata: {},
              created_at: new Date(),
            },
          ];
          const retryResult = await this.callAIModel(agent, governanceResult.regeneratePayload!, retryPrevMessages, userId, {
            mode: activeMode,
            modeConfig: activeModeConfig,
            lens: { systemPrompt: lens?.systemPrompt || null },
            debugSummary,
            maxChars,
            outputStyle: (activeModeConfig.outputStyle as OutputStyle) || 'normal',
            includeFixPlan: activeModeConfig.includeFixPlan,
            autoBrief: activeModeConfig.autoBrief,
            environment: options?.environment ?? null,
            activeJourneyId: options?.activeJourneyId ?? null,
            activeKeeperId: options?.activeKeeperId ?? null,
            domainId: options?.domainId ?? null,
          });
          lastResponse = retryResult.content;
          lastStructured = parseStructuredAgentResponse(lastResponse, requestId);
          governanceRetryCount++;
        }

        if (structured.ignoredReason) {
          logger.info({
            requestId,
            reason: structured.ignoredReason,
            agentId: agent.id,
            userId,
          }, '[kip/agents] structured response ignored');
        }

        if (structured.validationError) {
          logger.warn({
            requestId,
            agentId: agent.id,
            userId,
            validationError: structured.validationError.message,
          }, '[kip/agents] action validation warning');
        }

        if (structured.actions.length) {
          if (options?.forceSkipActions) {
            actionResults = structured.actions.map((action) => ({
              type: action.type,
              status: 'skipped',
              message: 'Action execution disabled by server (draft pipeline owns persistence)',
            }));
          } else {
            const execution = await executeAgentActions(structured.actions, {
              domainId: options?.domainId ?? null,
              domainSlug: options?.domainSlug ?? null,
              userId,
              agentId: agent.id,
              allowlist: allowActions,
              sessionId: currentSessionId,
              keeperId: options?.activeKeeperId ?? null,
              requestId,
              skipActionTypes: options?.skipActionTypes,
            });
            actionResults = execution.results;

            if (execution.failedMessage) {
              finalResponseText = structured.responseText
                ? `${structured.responseText} I attempted to create a draft but saving failed: ${execution.failedMessage}`
                : `I attempted to create a draft but saving failed: ${execution.failedMessage}`;
            }

            // Post-exec governance: append failure template if required action failed
            const postResult = await postExecGovernanceCheck({
              userInput: input,
              parsedResponse: structured,
              actionResults: execution.results,
              agentPolicyView: options?.environment?.governance ?? null,
              domainId: options?.domainId ?? null,
              agentId: agent.id,
              sessionId: currentSessionId,
              runId: requestId,
            });
            if (postResult.appendText) {
              finalResponseText = (finalResponseText || '') + postResult.appendText;
            }
          }
        }
        
        // SOLE exists at domain level (anchor) and keeper level (specific). Option B.
        let soleStatus: { soleActive: boolean; keeperSharpening?: boolean; memoryCount?: number } | undefined;
        if (options?.domainId) {
          soleStatus = { soleActive: true };
          if (options?.activeKeeperId) {
            try {
              const keeperSharpening = await SoleMemoryService.isKeeperUsingSOLE(options.activeKeeperId);
              soleStatus.keeperSharpening = keeperSharpening;
              if (keeperSharpening) {
                soleStatus.memoryCount = await prisma.soleMemoryCard.count({ where: { keeperId: options.activeKeeperId } });
              }
            } catch {
              /* ignore */
            }
          } else {
            try {
              soleStatus.memoryCount = await prisma.soleMemoryCard.count({ where: { domainId: options.domainId, keeperId: null } });
            } catch {
              /* ignore */
            }
          }
        }

        // Save agent response to memory if we have a session (include actionResults in metadata for persistence)
        if (agent.memory_enabled && currentSessionId) {
          try {
            await this.saveMessage(currentSessionId, 'agent', finalResponseText, 'assistant', {
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              model: agent.model,
              actionResults: actionResults.length ? actionResults : undefined,
            });
          } catch (error) {
            console.warn('Failed to save agent response:', error);
          }
        }
        
        const config = agent.config || {};
        result = {
          action: 'lead_interaction',
          keeper_id: userId || 'lead_user',
          type: 'conversation',
          data: {
            response: finalResponseText,
            agent_name: agent.name,
            agent_avatar: config.avatar || '🤖',
            agent_tagline: config.tagline || 'Your AI assistant',
            personality: config.personality || 'helpful',
            capabilities: config.capabilities || [],
            theme_color: config.theme_color || '#3b82f6',
            session_id: currentSessionId || `lead_${agent.slug}_${Date.now()}`,
            memory_enabled: agent.memory_enabled,
            message_count: previousMessages.length + (agent.memory_enabled ? 2 : 0), // +2 for current user/agent messages
            model: agent.model,
            actions: actionResults,
            actionPack,
            composedSystemPrompt,
            soleStatus,
            model_response_raw: response,
            draftIntent: options?.draftIntentResult ?? null,
            timestamp: new Date().toISOString()
          }
        };
      }
      // Handle Coordinator agents
      else if (agent.agent_class === 'Coordinator') {
        const config = agent.config || {};
        const subAgentSlugs = config.bundle || [];
        console.log(`[Coordinator] Running ${subAgentSlugs.length} sub-agents:`, subAgentSlugs);
        
        if (subAgentSlugs.length === 0) {
          result = {
            action: 'coordinator_execution',
            keeper_id: userId || 'coordinator',
            type: 'coordination',
            data: {
              message: 'No sub-agents configured in bundle',
              agent_used: agent.name,
              model: agent.model,
              sub_agents: []
            }
          };
        } else {
          // Execute sub-agents in sequence
          const subResults = [];
          for (const slug of subAgentSlugs) {
            try {
              const subAgent = await getKipAgentBySlug(slug);
              if (subAgent) {
                const subResult = await this.runAgent(subAgent.id, input, userId, sessionId, options);
                const agentResponse = subResult as AgentResponse;
                subResults.push({
                  agent_slug: slug,
                  agent_name: subAgent.name,
                  success: agentResponse.success,
                  data: agentResponse.data,
                  execution_time_ms: agentResponse.processing_time_ms
                });
              } else {
                subResults.push({
                  agent_slug: slug,
                  agent_name: 'Unknown',
                  success: false,
                  error: `Agent with slug '${slug}' not found`,
                  execution_time_ms: 0
                });
              }
            } catch (error) {
              subResults.push({
                agent_slug: slug,
                agent_name: 'Unknown',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                execution_time_ms: 0
              });
            }
          }

          result = {
            action: 'coordinator_execution',
            keeper_id: userId || 'coordinator',
            type: 'coordination',
            data: {
              input: input,
              coordinator_agent: agent.name,
              model: agent.model,
              sub_agents_executed: subResults.length,
              successful_executions: subResults.filter(r => r.success).length,
              failed_executions: subResults.filter(r => !r.success).length,
              results: subResults
            }
          };
        }
      } else if (agent.agent_class === 'System') {
        // System agents (e.g. Cloud) — real AI dialog with session persistence, action execution, no Kip persona overlay.
        let currentSessionId = sessionId ?? undefined;
        let previousMessages: KipMessageWithRelations[] = [];

        if (!currentSessionId && userId) {
          try {
            const newSession = await this.createSession(agentId, userId, undefined, {
              primaryJourneyId: options?.activeJourneyId ?? null,
              primaryKeeperId: options?.activeKeeperId ?? null,
            });
            currentSessionId = newSession.id;
          } catch (error) {
            console.warn('[System agent] Failed to create session:', error);
          }
        }

        if (currentSessionId) {
          try {
            previousMessages = await this.getSessionMemory(currentSessionId);
          } catch (error) {
            console.warn('[System agent] Failed to load session memory:', error);
          }
          try {
            const textToSave =
              input?.trim() ||
              (options?.attachments?.length ? `[${options.attachments.length} attachment(s)]` : '');
            if (textToSave) {
              await this.saveMessage(currentSessionId, 'user', textToSave, 'user', {
                timestamp: new Date().toISOString(),
                agent_id: agentId,
              });
            }
          } catch (error) {
            console.warn('[System agent] Failed to save user message:', error);
          }
        }

        const systemModeConfig: ModeConfig = {
          outputStyle: 'normal',
          limits: { maxChars: 0 },
          captureN: 20,
          autoBrief: true,
          includeFixPlan: true,
        };

        const systemAgentConfig = (agent.config || {}) as Record<string, unknown>;
        const agentVoicePrompt =
          typeof systemAgentConfig.voice_prompt === 'string'
            ? systemAgentConfig.voice_prompt.trim()
            : '';
        const aiResult = await this.callAIModel(agent, input || '', previousMessages, userId, {
          mode: 'domain',
          modeConfig: systemModeConfig,
          lens: { systemPrompt: agentVoicePrompt || null },
          environment: options?.environment ?? null,
          activeJourneyId: options?.activeJourneyId ?? null,
          activeKeeperId: options?.activeKeeperId ?? null,
          domainId: options?.domainId ?? null,
          attachments: options?.attachments ?? undefined,
        });

        const systemRequestId = randomUUID();
        const structured = parseStructuredAgentResponse(aiResult.content, systemRequestId);
        const allowActions = buildAllowedActions(options?.environment ?? null);
        let actionResults: ActionExecutionResult[] = [];
        let finalResponseText = structured.responseText || aiResult.content;

        if (structured.actions.length) {
          if (options?.forceSkipActions) {
            actionResults = structured.actions.map((action) => ({
              type: action.type,
              status: 'skipped',
              message: 'Action execution disabled by server (draft pipeline owns persistence)',
            }));
          } else {
            const execution = await executeAgentActions(structured.actions, {
              domainId: options?.domainId ?? null,
              domainSlug: options?.domainSlug ?? null,
              userId,
              agentId: agent.id,
              allowlist: allowActions,
              sessionId: currentSessionId,
              keeperId: options?.activeKeeperId ?? null,
              requestId: systemRequestId,
              skipActionTypes: options?.skipActionTypes,
            });
            actionResults = execution.results;

            if (execution.failedMessage) {
              finalResponseText = structured.responseText
                ? `${structured.responseText} I attempted to save but it failed: ${execution.failedMessage}`
                : `I attempted to save but it failed: ${execution.failedMessage}`;
            }
          }
        }

        if (currentSessionId) {
          try {
            await this.saveMessage(currentSessionId, 'agent', finalResponseText, 'assistant', {
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              model: agent.model,
              actionResults: actionResults.length ? actionResults : undefined,
            });
          } catch (error) {
            console.warn('[System agent] Failed to save agent response:', error);
          }
        }

        const config = agent.config || {};
        result = {
          action: 'system_interaction',
          keeper_id: userId || 'system_user',
          type: 'conversation',
          data: {
            response: finalResponseText,
            agent_name: agent.name,
            agent_tagline: (config as Record<string, unknown>).tagline || '',
            session_id: currentSessionId || `system_${agent.slug}_${Date.now()}`,
            model: agent.model,
            actions: actionResults,
            composedSystemPrompt: aiResult.composedSystemPrompt,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        // Standard agent execution based on agent slug
        result = this.getStandardAgentResult(agent, input, userId);
      }

      const processingTime = Date.now() - startTime;
      logData.execution_time_ms = processingTime;
      logData.output = JSON.stringify(result);

      // Log successful execution
      try {
        await createKipAgentLog(logData);
      } catch (logError) {
        console.warn('Failed to log agent execution:', logError);
      }

      // Return AgentResponse format for consistency
      return {
        id: agent.id,
        success: true,
        data: result,
        processing_time_ms: processingTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = resolveAgentErrorCode(error);
      const errorDetails = error instanceof AgentExecutionError ? error.details : undefined;
      console.error('Error running agent:', {
        message: errorMessage,
        code: errorCode,
      });
      
      logData.execution_time_ms = Date.now() - startTime;
      logData.error = errorMessage;

      // Log failed execution
      try {
        await createKipAgentLog(logData);
      } catch (logError) {
        console.warn('Failed to log agent execution error:', logError);
      }

      return {
        id: agentId,
        success: false,
        data: { error: errorMessage, errorCode, details: errorDetails },
        processing_time_ms: logData.execution_time_ms
      };
    }
  }

  /**
   * Get standard agent result based on agent slug
   */
  private static getStandardAgentResult(agent: TypedAgent, input: string, userId?: string): KipCommandIntent {
    switch (agent.slug) {
      case 'type-agent':
        return {
          action: 'capture_thought',
          keeper_id: userId || 'user_anonymous',
          type: 'reflection',
          data: {
            content: input,
            extracted_entities: ['thought', 'reflection'],
            sentiment: 'neutral',
            category: 'personal',
            confidence: 0.85,
            agent_used: agent.name,
            model: agent.model
          }
        };

      case 'platform-agent':
        return {
          action: 'system_analysis',
          keeper_id: 'system',
          type: 'platform_insight',
          data: {
            analysis: `Platform analysis of: ${input}`,
            recommendations: ['optimize_database_queries', 'enhance_user_experience'],
            priority: 'medium',
            agent_used: agent.name,
            model: agent.model
          }
        };

      case 'code-agent':
        return {
          action: 'code_analysis',
          keeper_id: 'codebase',
          type: 'technical_review',
          data: {
            analysis: `Code analysis for: ${input}`,
            suggestions: ['add_type_safety', 'improve_error_handling'],
            complexity_score: 6,
            agent_used: agent.name,
            model: agent.model
          }
        };

      default:
        return {
          action: 'generic_processing',
          keeper_id: userId || 'unknown',
          type: 'general',
          data: {
            processed_input: input,
            agent_used: agent.name,
            model: agent.model
          }
        };
    }
  }
}

function mapProviderCodeToAgentCode(code?: ModelProviderErrorCode): AgentErrorCode {
  switch (code) {
    case 'MISSING_API_KEY':
      return 'MISSING_API_KEY';
    case 'INVALID_MODEL':
      return 'INVALID_MODEL';
    case 'QUOTA_EXCEEDED':
      return 'QUOTA_EXCEEDED';
    case 'PROVIDER_UNAVAILABLE':
    default:
      return 'PROVIDER_UNAVAILABLE';
  }
}

function resolveAgentErrorCode(error: unknown): AgentErrorCode {
  if (error instanceof AgentExecutionError) {
    return error.code;
  }

  if (error instanceof Error && /not found/i.test(error.message)) {
    return 'AGENT_MISCONFIGURED';
  }

  return 'UNKNOWN';
}

type UserIdSource = 'req.user.id' | 'req.kam.userId' | 'req.auth.user.id' | 'res.locals.user.id';

function resolveUserId(req: Request, res?: Response): { userId?: string; source?: UserIdSource } {
  const fromResLocals = (res as any)?.locals?.user?.id;
  if (fromResLocals) return { userId: String(fromResLocals), source: 'res.locals.user.id' };

  const fromReqUser = (req as any).user?.id;
  if (fromReqUser) return { userId: String(fromReqUser), source: 'req.user.id' };

  const fromReqAuth = (req as any).auth?.kind === 'user' ? (req as any).auth.userId : undefined;
  if (fromReqAuth) return { userId: String(fromReqAuth), source: 'req.auth.user.id' };

  const fromKam = (req as any).kam?.userId;
  if (fromKam) return { userId: String(fromKam), source: 'req.kam.userId' };

  return { userId: undefined, source: undefined };
}

const resolveDomain = (req: DomainResolvedRequest): { domainId: string | null; domainSlug: string | null } => {
  const fromContext: any = req.domainContext?.domain;
  const ctxId = (fromContext && (fromContext.id || (fromContext as any).domainId)) ?? null;
  const ctxSlug = (fromContext && (fromContext.slug || (fromContext as any).domainSlug)) ?? req.domainContext?.resolvedSlug ?? null;

  const headerId = (req.headers['x-domain-id'] as string | undefined) || null;
  const headerSlug = (req.headers['x-domain-slug'] as string | undefined) || (req.headers['x-domain'] as string | undefined) || null;

  const bodyId = (req.body as any)?.domainId || null;
  const bodySlug = (req.body as any)?.domainSlug || null;

  return {
    domainId: ctxId || headerId || bodyId || null,
    domainSlug: ctxSlug || headerSlug || bodySlug || null,
  };
};

const buildContextFlags = (req: Request, userId?: string | null, domain?: { domainId: string | null; domainSlug: string | null }) => ({
  authCookiePresent: Boolean((req as any).cookies?.keeper_session),
  authHeaderPresent: Boolean(req.headers.authorization),
  resolvedUserIdPresent: Boolean(userId),
  domainContextPresent: Boolean((req as any).domainContext),
  xDomainHeadersPresent: Boolean(req.headers['x-domain-id'] || req.headers['x-domain-slug'] || req.headers['x-domain']),
  resolvedDomainIdPresent: Boolean(domain?.domainId),
});

const truncateValue = (value: string | undefined | null, limit = 160) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const summarizeDebugEntry = (entry: DebugBundleEntry): string => {
  const method = entry.method || '';
  const url = entry.url ? truncateValue(entry.url, 140) : '';
  const status = typeof entry.status === 'number' ? entry.status : '—';
  const duration = typeof entry.durationMs === 'number' ? `${entry.durationMs}ms` : '';
  const requestId = entry.requestId ? `requestId=${entry.requestId}` : '';
  const action = entry.action ? `action=${entry.action}` : '';
  return [method, url, `→ ${status}`, duration, requestId, action].filter(Boolean).join(' ').trim();
};

const formatDebugBundleSummary = (bundle: DebugBundleInput | null | undefined, modeConfig?: ModeConfig): string | null => {
  if (!bundle) return null;
  const captureN = modeConfig?.captureN ?? 20;
  const entries = (bundle.entries || []).slice(-captureN);
  const failureCandidates = bundle.failures && bundle.failures.length > 0
    ? bundle.failures
    : entries.filter((entry) => (typeof entry.status === 'number' && entry.status >= 400) || entry.error);
  const failures = failureCandidates.slice(-5);
  const auth = bundle.authContextKeysPresent;
  const authLine = auth
    ? `Auth context: user=${auth.hasUser ? 'yes' : 'no'}, auth=${auth.hasAuth ? 'yes' : 'no'}, kam=${auth.hasKam ? 'yes' : 'no'}, authzHeader=${auth.authorizationHeaderPresent ? 'yes' : 'no'}, userKeys=${(auth.userKeys || []).join(',') || '—'}, authKeys=${(auth.authKeys || []).join(',') || '—'}, kamKeys=${(auth.kamKeys || []).join(',') || '—'}`
    : 'Auth context: unknown';

  const lines: string[] = [];
  if (bundle.symptom) {
    lines.push(`Symptom: ${truncateValue(bundle.symptom, 200)}`);
  }
  lines.push(authLine);
  lines.push(failures.length ? `Recent failures:\n${failures.map(summarizeDebugEntry).join('\n')}` : 'Recent failures: none captured');
  lines.push(entries.length ? `Recent requests (last ${entries.length}):\n${entries.map(summarizeDebugEntry).join('\n')}` : 'Recent requests: none captured');

  return lines.join('\n');
};

/**
 * Express route handler for /api/kip/agents
 */
export default async function handler(req: DomainResolvedRequest, res: Response) {
  const requestId = (req.headers['x-request-id'] as string) || `kip-agents-${Date.now()}`;
  const baseContext = {
    requestId,
    path: req.path,
    method: req.method,
    domainResolution: req.headers['x-domain-resolution'],
    domainSlug: req.headers['x-domain-slug'] || req.headers['x-domain'],
    origin: req.headers.origin,
  };
  let ctxFlags: ReturnType<typeof buildContextFlags> | undefined;
  try {
    const resolvedUser = resolveUserId(req, res);
    const resolvedDomain = resolveDomain(req);
    ctxFlags = buildContextFlags(req, resolvedUser.userId, resolvedDomain);
    const respond = (status: number, body: Record<string, unknown>) =>
      res.status(status).json({ ...body, ctx: ctxFlags });

    switch (req.method) {
      case 'GET':
        // Mock fallback when DB is disabled
        if (isDbDisabled()) {
          return respond(200, { success: true, agents: MOCK_AGENTS });
        }
        // Handle different GET routes
        const { id, slug, logs, agentId: queryAgentId, userId: queryUserId, page, pageSize, stats, sessions, sessionId: querySessionId, messages, actionPack: actionPackQuery } = req.query;
        
        // Get action pack for agent/domain (tools the agent can use)
        if (actionPackQuery === 'true') {
          const apAgentId = typeof queryAgentId === 'string' ? queryAgentId : (req.query as any)?.agentId;
          const domainId = typeof (req.query as any)?.domainId === 'string' ? (req.query as any).domainId : resolvedDomain.domainId ?? undefined;
          if (!apAgentId) {
            return respond(400, { success: false, error: 'agentId required for actionPack' });
          }
          try {
            let environment: AgentEnvironmentContext | null = null;
            try {
              environment = await resolveAgentEnvironment({
                agentId: apAgentId,
                userId: resolvedUser.userId ?? undefined,
                domainId,
                intent: 'interactive',
              });
            } catch (err) {
              console.warn('[kip/agents] actionPack env resolution failed', { agentId: apAgentId, domainId, error: err });
            }
            const actionPack = buildActionPackFromEnvironment(environment);
            const allowedActions = Array.from(buildAllowedActions(environment));
            const keeperId = typeof (req.query as any)?.keeperId === 'string' ? (req.query as any).keeperId : undefined;
            const journeyId = typeof (req.query as any)?.journeyId === 'string' ? (req.query as any).journeyId : undefined;
            const composePrompt = (req.query as any)?.composePrompt === 'true';

            // SOLE exists at domain level and is always accessible. Keeper sharpens.
            let soleStatus: { soleActive: boolean; keeperSharpening?: boolean; memoryCount?: number } | undefined;
            if (domainId) {
              soleStatus = { soleActive: true };
              if (keeperId) {
                try {
                  const keeperSharpening = await SoleMemoryService.isKeeperUsingSOLE(keeperId);
                  soleStatus.keeperSharpening = keeperSharpening;
                  if (keeperSharpening) {
                    soleStatus.memoryCount = await prisma.soleMemoryCard.count({ where: { keeperId } });
                  }
                } catch (err) {
                  console.warn('[kip/agents] soleStatus lookup failed', { keeperId, err });
                }
              }
            }

            let composedSystemPrompt: string | undefined;
            if (composePrompt && apAgentId) {
              try {
                composedSystemPrompt = await KipAgentService.buildComposedSystemPrompt(apAgentId, {
                  domainId,
                  keeperId: keeperId ?? undefined,
                  journeyId: journeyId ?? undefined,
                  userId: resolvedUser.userId ?? undefined,
                });
              } catch (err) {
                console.warn('[kip/agents] composePrompt failed', { agentId: apAgentId, err });
              }
            }

            return respond(200, { success: true, data: { actionPack, allowedActions, soleStatus, composedSystemPrompt } });
          } catch (error) {
            console.error('[kip/agents] actionPack error', { agentId: apAgentId, error });
            return respond(500, { success: false, error: 'Failed to load action pack' });
          }
        }
        
        // Get session messages
        if (messages === 'true') {
          console.info('[kip/agents] messages request', {
            ...baseContext,
            sessionId: querySessionId,
            query: req.query,
          });

          if (!querySessionId || typeof querySessionId !== 'string') {
            return respond(400, {
              success: false,
              message: 'Invalid session ID',
              error: { code: 'BAD_REQUEST', message: 'Invalid session ID' },
            });
          }

          try {
            const sessionMessages = await KipAgentService.getSessionMemory(querySessionId);
            console.info('[kip/agents] messages success', {
              ...baseContext,
              sessionId: querySessionId,
              count: Array.isArray(sessionMessages) ? sessionMessages.length : null,
            });
            return respond(200, { success: true, data: sessionMessages });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load session messages';
            const isNotFound = /not found/i.test(message);
            console.error('[kip/agents] messages error', {
              ...baseContext,
              sessionId: querySessionId,
              message,
              stack: error instanceof Error ? error.stack : undefined,
            });
            return respond(isNotFound ? 404 : 500, {
              success: false,
              message,
              error: {
                code: isNotFound ? 'SESSION_NOT_FOUND' : 'FAILED_TO_LOAD_MESSAGES',
                message,
              },
            });
          }
        }
        
        // Get sessions for an agent
        if (sessions === 'true') {
          // Basic logging for debugging session failures
          console.info('[kip/agents] sessions request', {
            ...baseContext,
            queryAgentId,
            page,
            pageSize,
            domainId: (req.query as any)?.domainId,
          });

          if (!queryAgentId || typeof queryAgentId !== 'string') {
            return respond(400, { success: false, error: 'agentId required' });
          }
          
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined
          };
          
          // Validate pagination parameters
          if (options.page && (isNaN(options.page) || options.page < 1)) {
            return respond(400, { success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return respond(400, { success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          try {
            const sessionsResult = await getSessionsByAgentId(queryAgentId, options);
            console.info('[kip/agents] sessions success', {
              agentId: queryAgentId,
              count: Array.isArray((sessionsResult as any)?.sessions)
                ? (sessionsResult as any).sessions.length
                : Array.isArray(sessionsResult)
                  ? (sessionsResult as any).length
                  : null,
            });
            return respond(200, { success: true, data: sessionsResult });
          } catch (error) {
            console.error('[kip/agents] sessions error', {
              agentId: queryAgentId,
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
            });
            return respond(500, { success: false, error: 'Failed to load sessions' });
          }
        }
        
        // Get specific session by ID
        if (querySessionId && !messages) {
          if (typeof querySessionId !== 'string') {
            return respond(400, { success: false, error: 'Invalid session ID' });
          }
          const session = await getKipSessionById(querySessionId);
          if (!session) {
            return respond(404, { success: false, error: 'Session not found' });
          }
          return respond(200, { success: true, data: session });
        }
        
        // Get agent logs
        if (logs === 'true') {
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined,
            agentId: queryAgentId as string,
            userId: queryUserId as string
          };
          
          // Validate pagination parameters
          if (options.page && (isNaN(options.page) || options.page < 1)) {
            return respond(400, { success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return respond(400, { success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          const logsResult = await getKipAgentLogs(options);
          return respond(200, { success: true, data: logsResult });
        }
        
        // Get agent statistics
        if (stats === 'true') {
          const statsResult = await getAgentStats(queryAgentId as string);
          return respond(200, { success: true, data: statsResult });
        }
        
        // Get specific agent by ID
        if (id) {
          if (typeof id !== 'string') {
            return respond(400, { success: false, error: 'Invalid agent ID' });
          }
          const agent = await getKipAgentById(id);
          if (!agent) {
            return respond(404, { success: false, error: 'Agent not found' });
          }
          return respond(200, { success: true, data: agent });
        }
        
        // Get specific agent by slug
        if (slug) {
          if (typeof slug !== 'string') {
            return respond(400, { success: false, error: 'Invalid agent slug' });
          }
          const agent = await getKipAgentBySlug(slug);
          if (!agent) {
            return respond(404, { success: false, error: 'Agent not found' });
          }
          return respond(200, { success: true, data: agent });
        }
        
        // Get all agents
        const agents = await KipAgentService.getAllAgents();
        return respond(200, { success: true, data: agents });

      case 'POST':
        // Handle agent execution or creation
        const { action, agentId, input, sessionId, sessionName, ...createData } = req.body;
        const requestUserId = resolvedUser.userId;
        const requestUserIdSource: UserIdSource | 'body' | undefined = resolvedUser.source;
        console.info('[kip/agents] post request', {
          ...baseContext,
          action,
          body: req.body,
          query: req.query,
          requestUserId,
          requestUserIdSource,
          domain: resolvedDomain,
        });
        
        if (action === 'run') {
          // Validate using Zod schema
          const validation = AgentRunSchema.safeParse({
            agentId,
            input: input ?? '',
            userId: requestUserId,
            sessionId,
            domainId: resolvedDomain.domainId ?? undefined,
            domainSlug: resolvedDomain.domainSlug ?? undefined,
            mode: (req.body as any)?.mode,
            debugBundle: (req.body as any)?.debugBundle,
            attachments: (req.body as any)?.attachments,
            activeJourneyId: (req.body as any)?.activeJourneyId ?? null,
            activeKeeperId: (req.body as any)?.activeKeeperId ?? null,
            agentContext: (req.body as any)?.agentContext ?? undefined,
          });
          if (!validation.success) {
            return respond(400, { 
              success: false, 
              error: 'Invalid request data',
              details: validation.error.errors
            });
          }
          
          let environment: AgentEnvironmentContext | null = null;
          try {
            environment = await resolveAgentEnvironment({
              agentId,
              userId: requestUserId,
              domainId: validation.data.domainId ?? resolvedDomain.domainId ?? undefined,
              sessionId,
              intent: 'interactive',
            });
          } catch (error) {
            console.warn('[kip/agents] environment resolution failed', {
              requestId,
              agentId,
              userId: requestUserId,
              domainId: validation.data.domainId ?? resolvedDomain.domainId ?? null,
              error: error instanceof Error ? error.message : error,
            });
          }

          const environmentDebug = {
            resolvedBy: 'KAM' as const,
            resolvedAt: environment?.debug?.resolvedAt ?? new Date().toISOString(),
            injectedAt: new Date().toISOString(),
            canary: randomUUID(),
          };

          if (environment) {
            environment.debug = environmentDebug;
            environment.actionPack = environment.actionPack ?? buildActionPackFromEnvironment(environment);
            // Inject agentContext from the domain frame JSON (sent by the frontend)
            if (validation.data.agentContext) {
              (environment as any).agentContext = validation.data.agentContext;
            }
          } else {
            environment = {
              version: 'env-v1',
              domains: [],
              capabilities: { canDraft: false, canPromote: false },
              actionPack: buildActionPackFromEnvironment(null),
              policyPack: buildPolicyPackFromEnvironment(null),
              policy: {
                version: DEFAULT_POLICY_VERSION,
                policy: DEFAULT_POLICY_PACK_V1,
                updatedAt: null,
                source: 'default',
              },
              draftsDirectory: [],
              debug: environmentDebug,
            };
          }

          const actionPack = environment?.actionPack ?? buildActionPackFromEnvironment(environment);
          const draftIntentPayload = detectDraftIntent(input, req.body);
          let draftIntentResult: DraftIntentResult | null = null;

          if (draftIntentPayload) {
            draftIntentResult = await processDraftIntent(draftIntentPayload, {
              domainId: validation.data.domainId ?? resolvedDomain.domainId,
              userId: requestUserId ?? null,
              agentId,
              sessionId,
              requestId,
            });

            if (draftIntentResult?.draft && environment) {
              const draft = draftIntentResult.draft;
              const directoryEntry = {
                id: draft.id,
                kind: draft.kind,
                key: draft.key,
                title: draft.title,
                status: draft.status,
                updatedAt: draft.updatedAt,
              };

              environment.activeDraft = directoryEntry;
              const existing = Array.isArray(environment.draftsDirectory) ? environment.draftsDirectory : [];
              environment.draftsDirectory = [directoryEntry, ...existing.filter((item) => item.id !== draft.id)].slice(0, ACTION_DRAFT_LIMIT);
            }
          }

          const result = await KipAgentService.runAgent(
            agentId,
            validation.data.input ?? '',
            requestUserId,
            sessionId,
            {
              domainId: validation.data.domainId ?? resolvedDomain.domainId,
              domainSlug: validation.data.domainSlug ?? resolvedDomain.domainSlug,
              mode: validation.data.mode as AgentModeKey | undefined,
              debugBundle: validation.data.debugBundle || null,
              environment,
              skipActionTypes: draftIntentResult?.draft ? new Set(['draft.create']) : undefined,
              actionPack,
              draftIntentResult,
              activeJourneyId: validation.data.activeJourneyId ?? null,
              activeKeeperId: validation.data.activeKeeperId ?? null,
              attachments: validation.data.attachments?.map((a) => ({
                url: a.url,
                name: a.name,
                type: a.type,
              })) ?? undefined,
            }
          );

          if (draftIntentResult && (result as AgentResponse)?.data && typeof (result as AgentResponse).data === 'object') {
            (result as AgentResponse).data = {
              ...(result as AgentResponse).data as Record<string, unknown>,
              draftIntent: draftIntentResult,
              actionPack,
            };
          } else if (actionPack && (result as AgentResponse)?.data && typeof (result as AgentResponse).data === 'object') {
            (result as AgentResponse).data = {
              ...(result as AgentResponse).data as Record<string, unknown>,
              actionPack,
            };
          }

          return respond(200, { success: true, data: result });
        }
        
        if (action === 'repairDraft') {
          if (!requestUserId) {
            return respond(401, {
              success: false,
              error: 'Unauthorized: user required for repairDraft',
            });
          }

          const { draftId: repairDraftId, sourceMessage, sessionId: repairSessionId } = req.body ?? {};
          if (!repairDraftId || typeof sourceMessage !== 'string' || !sourceMessage.trim()) {
            return respond(400, {
              success: false,
              error: 'draftId and sourceMessage are required',
            });
          }

          const draftIntentPayload = parseDraftIntentFromText(sourceMessage.trim());
          draftIntentPayload.draftId = repairDraftId;
          draftIntentPayload.setActive = false;
          draftIntentPayload.raw = sourceMessage.trim();

          const repairResult = await processDraftIntent(draftIntentPayload, {
            domainId: resolvedDomain.domainId,
            userId: requestUserId,
            agentId,
            sessionId: repairSessionId || sessionId || null,
            requestId,
          });

          const success = !repairResult.error;
          return respond(success ? 200 : 400, {
            success,
            data: repairResult,
            error: repairResult.error,
          });
        }
        
        if (action === 'createSession') {
          const { userId: resolvedUserId, source: userIdSource } = resolvedUser;
          if (!resolvedUserId) {
            console.warn('[kip/agents] createSession missing userId', {
              ...baseContext,
              agentId,
              userIdSource: userIdSource || 'none',
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
              ctx: ctxFlags,
            });
            return respond(401, {
              success: false,
              message: 'Unauthorized: user required',
              error: { code: 'UNAUTHORIZED', message: 'Missing user context' },
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
            });
          }

          console.info('[kip/agents] createSession request', {
            ...baseContext,
            agentId,
            userId: resolvedUserId,
            sessionName,
            domainId: resolvedDomain.domainId,
            domainSlug: resolvedDomain.domainSlug,
            userIdSource: userIdSource || 'unknown',
            ctx: ctxFlags,
          });

          // Validate using Zod schema
          const validation = CreateSessionSchema.safeParse({ agentId, sessionName });
          if (!validation.success) {
            console.warn('[kip/agents] createSession validation failed', {
              ...baseContext,
              agentId,
              userId: resolvedUserId,
              sessionName,
              issues: validation.error.errors,
              ctx: ctxFlags,
            });
            return respond(400, { 
              success: false,
              message: 'Invalid request data',
              error: {
                code: 'BAD_REQUEST',
                message: 'Invalid request data',
                details: validation.error.errors
              }
            });
          }
          
          try {
            const body = req.body as Record<string, unknown>;
            const domainIdForDialog = resolvedDomain.domainId;
            const dialogBoard = typeof body.dialogBoard === 'string' ? body.dialogBoard : null;
            const dialogFrame = typeof body.dialogFrame === 'string' ? body.dialogFrame : null;
            const dialogSubject = typeof body.dialogSubject === 'string' ? body.dialogSubject : undefined;
            const ds = body.dialogScope;
            const dialogScope = ds === 'admin' || ds === 'keeper' ? ds : null;

            let dialogLink:
              | {
                  domainId: string;
                  board: string;
                  frame: string;
                  subject?: string;
                  scope: 'admin' | 'keeper';
                }
              | undefined;
            if (domainIdForDialog && dialogBoard && dialogFrame && dialogScope) {
              dialogLink = {
                domainId: domainIdForDialog,
                board: dialogBoard,
                frame: dialogFrame,
                subject: dialogSubject,
                scope: dialogScope,
              };
            }

            const session = await KipAgentService.createSession(
              agentId,
              resolvedUserId,
              sessionName,
              undefined,
              dialogLink,
            );
            console.info('[kip/agents] createSession success', {
              requestId,
              agentId,
              sessionId: session?.id,
              userIdSource: userIdSource || 'unknown',
              ctx: ctxFlags,
            });
            return respond(201, { success: true, data: session });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create session';
            const isNotFound = /not found/i.test(message);
            const isBadInput = /invalid|required/i.test(message);
            const status = isNotFound ? 404 : isBadInput ? 400 : 500;

            console.error('[kip/agents] createSession error', {
              requestId,
              agentId,
              userId: resolvedUserId,
              sessionName,
              message,
              stack: error instanceof Error ? error.stack : undefined,
              ctx: ctxFlags,
            });

            return respond(status, { 
              success: false, 
              message,
              error: {
                code: isNotFound
                  ? 'AGENT_NOT_FOUND'
                  : isBadInput
                    ? 'BAD_REQUEST'
                    : 'FAILED_TO_CREATE_SESSION',
                message
              }
            });
          }
        }
        
        // Create new agent
        if (!createData.name || !createData.slug) {
          return respond(400, { 
            success: false, 
            error: 'Agent name and slug are required'
          });
        }
        
        const newAgent = await KipAgentService.createAgent(createData);
        return respond(201, { success: true, data: newAgent });

      case 'PATCH': {
        try {
          const validation = UpdateSessionMetadataSchema.safeParse(req.body);
          if (!validation.success) {
            return respond(400, {
              success: false,
              error: 'Invalid session metadata',
              details: validation.error.errors
            });
          }

          const resolvedUserId = resolvedUser.userId;
          if (!resolvedUserId) {
            console.warn('[kip/agents] updateSessionMetadata missing user', { requestId, ctx: ctxFlags });
            return respond(401, {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Missing user context' },
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
            });
          }

          const { sessionId } = validation.data;
          const existingSession = await prisma.kip_sessions.findUnique({
            where: { id: sessionId },
            select: { id: true, user_id: true, agent_id: true },
          });

          if (!existingSession || existingSession.user_id !== resolvedUserId) {
            console.warn('[kip/agents] updateSessionMetadata ownership mismatch', {
              requestId,
              sessionId,
              sessionUserId: existingSession?.user_id,
              resolvedUserId,
              ctx: ctxFlags,
            });
            return respond(404, {
              success: false,
              error: 'Session not found',
            });
          }

          const targetAgentId = validation.data.agentId ?? existingSession.agent_id;
          if (!targetAgentId || existingSession.agent_id !== targetAgentId) {
            console.warn('[kip/agents] updateSessionMetadata agent mismatch', {
              requestId,
              sessionId,
              existingAgentId: existingSession.agent_id,
              providedAgentId: validation.data.agentId,
              ctx: ctxFlags,
            });
            return respond(404, { success: false, error: 'Session not found' });
          }

          const { updates, error: normalizationError } = normalizeSessionMetadataUpdates(validation.data);
          if (normalizationError) {
            return respond(400, {
              success: false,
              error: 'Invalid session metadata',
              details: normalizationError,
            });
          }

          if (!Object.keys(updates).length) {
            return respond(400, {
              success: false,
              error: 'No session metadata provided to update',
            });
          }

          const updatedSession = await KipAgentService.updateSessionMetadata({
            sessionId,
            agentId: targetAgentId,
            userId: resolvedUserId,
            updates,
          });

          console.info('[kip/agents] updateSessionMetadata success', {
            requestId,
            sessionId,
            agentId: targetAgentId,
            ctx: ctxFlags,
          });

          return respond(200, { success: true, data: updatedSession });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update session metadata';
          const isNotFound = /not found/i.test(message);
          const isInvalid = /invalid|metadata|tags|No session metadata provided/i.test(message);
          console.error('[kip/agents] updateSessionMetadata error', {
            requestId,
            sessionId: (req.body as any)?.sessionId,
            agentId: (req.body as any)?.agentId,
            message,
            stack: error instanceof Error ? error.stack : undefined,
            ctx: ctxFlags,
          });
          return respond(isNotFound ? 404 : isInvalid ? 400 : 500, {
            success: false,
            error: message,
          });
        }
      }

      case 'PUT':
        // Handle agent update
        const { id: updateId, ...updateData } = req.body;
        
        if (!updateId || typeof updateId !== 'string') {
          return respond(400, { 
            success: false, 
            error: 'Valid agent ID is required for updating an agent' 
          });
        }
        
        const updatedAgent = await KipAgentService.updateAgent(updateId, updateData);
        return respond(200, { success: true, data: updatedAgent });

      case 'DELETE': {
        const { id: deleteId, type: deleteType } = req.body;

        // Session delete: DELETE /api/kip/agents with body { type: 'session', id: sessionId }
        if (deleteType === 'session') {
          if (!deleteId || typeof deleteId !== 'string') {
            return respond(400, { success: false, error: 'Valid session ID is required' });
          }
          const session = await prisma.kip_sessions.findUnique({ where: { id: deleteId }, select: { id: true } });
          if (!session) {
            return respond(404, { success: false, error: 'Session not found' });
          }
          await prisma.kip_messages.deleteMany({ where: { session_id: deleteId } });
          await prisma.kip_sessions.delete({ where: { id: deleteId } });
          return respond(200, { success: true, data: { message: 'Session deleted successfully' } });
        }

        // Agent delete (existing behaviour)
        if (!deleteId || typeof deleteId !== 'string') {
          return respond(400, { 
            success: false, 
            error: 'Valid agent ID is required for deleting an agent' 
          });
        }
        
        const deleteResult = await KipAgentService.deleteAgent(deleteId);
        return respond(200, { success: true, data: deleteResult });
      }

      default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
        return respond(405, { success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('KIP Agents API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error',
      ...(ctxFlags ? { ctx: ctxFlags } : {}),
    });
  }
} 