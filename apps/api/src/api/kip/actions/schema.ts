/**
 * Canonical Action Schema for KIP Agent Actions
 * 
 * Defines runtime validation schemas for agent actions to prevent
 * malformed or unknown actions from being silently ignored.
 */

import { z } from 'zod';

/**
 * Core action types that must be supported by the executor
 */
export const CORE_ACTIONS = ['draft.create'] as const;

export type CoreActionType = typeof CORE_ACTIONS[number];

/**
 * Draft create action payload schema
 */
const draftCreatePayloadSchema = z.object({
  kind: z.string().min(1, 'kind is required'),
  key: z.string().min(1, 'key is required'),
  title: z.string().min(1, 'title is required'),
  summary: z.string().nullable().optional().default(''),
  spec: z.record(z.any()).optional().default({}),
  agentId: z.string().uuid().optional(),
  keeperId: z.string().min(1).optional(),
});

/**
 * Draft update action payload schema
 */
const draftUpdatePayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'reviewed', 'approved', 'promoted', 'archived']).optional(),
  spec: z.record(z.any()).optional(),
});

const draftUpdateProposePayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  status: z.enum(['draft', 'reviewed', 'approved', 'promoted', 'archived']).optional(),
  spec: z.record(z.any()).optional(),
});

/**
 * Draft delete action payload schema
 */
const draftDeletePayloadSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Draft list action payload schema (optional filters)
 */
const draftListPayloadSchema = z.object({
  kind: z.string().optional(),
  status: z.enum(['draft', 'reviewed', 'approved', 'promoted', 'archived']).optional(),
}).optional().default({});

/**
 * Draft get/read action payload schema
 */
const draftGetPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
  kind: z.string().optional(),
  key: z.string().optional(),
}).refine(
  (data) => data.id || data.draftId || (data.kind && data.key),
  { message: 'Must provide id, draftId, or both kind and key' }
);

/**
 * Draft setActive action payload schema
 */
const draftSetActivePayloadSchema = z.object({
  draftId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
}).refine(
  (data) => data.draftId || data.id,
  { message: 'Must provide draftId or id' }
);

/**
 * Moment create action payload schema
 */
const momentCreatePayloadSchema = z.object({
  title: z.string().min(1, 'title is required'),
  narrative: z.string().min(1, 'narrative is required'),
  journeyId: z.string().optional(),
});

/**
 * SOLE save action payload schema
 */
const soleSavePayloadSchema = z.object({
  content: z.string().min(1, 'content is required'),
  topic: z.string().optional(),
  journeyId: z.string().optional(),
  momentId: z.string().optional(),
  engagementTemplateId: z.string().uuid().optional(),
});

/**
 * SOLE read action payload schema
 */
const soleReadPayloadSchema = z.object({
  topic: z.string().optional(),
  keeperId: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

/**
 * Journey read action payload schema
 */
const journeyReadPayloadSchema = z.object({
  journeyId: z.string(),
});

/**
 * Moment read action payload schema
 */
const momentReadPayloadSchema = z.object({
  momentId: z.string(),
});

/**
 * Keeper read action payload schema
 */
const keeperReadPayloadSchema = z.object({
  keeperId: z.string(),
});

/**
 * Image generate action payload schema
 * domain_context is intentionally absent — it is added server-side from domain JSON
 */
export const imageGeneratePayloadSchema = z.object({
  subject:      z.string().min(1, 'subject is required'),
  mood:         z.string().optional(),
  style:        z.string().optional(),
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional(),
  model:        z.string().optional(),
});

export type ImageGenerateAction = z.infer<typeof imageGeneratePayloadSchema> & { type: 'image.generate' };

/**
 * Action payload schemas by type
 */
const actionPayloadSchemas: Record<string, z.ZodSchema> = {
  'draft.create': draftCreatePayloadSchema,
  'draft.update': draftUpdatePayloadSchema,
  'draft.update.propose': draftUpdateProposePayloadSchema,
  'draft.delete': draftDeletePayloadSchema,
  'draft.list': draftListPayloadSchema,
  'draft.get': draftGetPayloadSchema,
  'draft.read': draftGetPayloadSchema,
  'draft.setActive': draftSetActivePayloadSchema,
  'moment.create': momentCreatePayloadSchema,
  'sole.save': soleSavePayloadSchema,
  'sole.read': soleReadPayloadSchema,
  'journey.read': journeyReadPayloadSchema,
  'moment.read': momentReadPayloadSchema,
  'keeper.read': keeperReadPayloadSchema,
  'image.generate': imageGeneratePayloadSchema,
};

/**
 * Single action schema
 * Note: Payload validation happens in parseActionsOrThrow for better error messages
 */
const actionSchema = z.object({
  type: z.string().min(1, 'action type is required'),
  payload: z.unknown().optional(),
});

/**
 * Agent output envelope schema (legacy and current formats)
 */
const agentOutputEnvelopeSchema = z.object({
  type: z.literal('agent_output'),
  response: z.string().optional(),
  actions: z.array(actionSchema).optional(),
});

/**
 * Legacy format: actions as object (normalize to array)
 */
const legacyActionsObjectSchema = z.record(z.unknown());

/**
 * Parse actions from raw agent response
 * Supports:
 * - Current format: { type: "agent_output", actions: [...] }
 * - Legacy format: { actions: {...} } (object instead of array)
 * - Direct array: [...]
 */
export function parseActionsOrThrow(raw: unknown): Array<{ type: string; payload?: unknown }> {
  if (raw === null || raw === undefined) {
    throw new ActionValidationError('No actions data provided', []);
  }

  // Handle string input (JSON parse it)
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw.trim());
    } catch (error) {
      throw new ActionValidationError('Invalid JSON in actions data', [], error);
    }
  }

  // Handle direct array
  if (Array.isArray(parsed)) {
    const validated = parsed.map((action, index) => {
      try {
        return actionSchema.parse(action);
      } catch (error) {
        throw new ActionValidationError(
          `Invalid action at index ${index}`,
          [],
          error,
          { action, index }
        );
      }
    });
    return validated.map(a => ({
      type: a.type,
      payload: a.payload,
    }));
  }

  // Handle agent_output envelope
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Check for agent_output envelope
    if (obj.type === 'agent_output') {
      try {
        const envelope = agentOutputEnvelopeSchema.parse(obj);
        const actions = envelope.actions || [];
        return actions.map(a => ({
          type: a.type,
          payload: a.payload,
        }));
      } catch (error) {
        throw new ActionValidationError(
          'Invalid agent_output envelope',
          [],
          error,
          { envelope: obj }
        );
      }
    }

    // Check for legacy actions object format
    if (obj.actions !== undefined && !Array.isArray(obj.actions)) {
      const legacyActions = obj.actions as Record<string, unknown>;
      const normalized: Array<{ type: string; payload?: unknown }> = [];
      
      // Normalize object to array
      for (const [key, value] of Object.entries(legacyActions)) {
        if (typeof value === 'object' && value !== null && 'type' in value) {
          normalized.push(value as { type: string; payload?: unknown });
        } else {
          normalized.push({ type: key, payload: value });
        }
      }

      // Validate normalized actions
      const validated = normalized.map((action, index) => {
        try {
          return actionSchema.parse(action);
        } catch (error) {
          throw new ActionValidationError(
            `Invalid normalized action at index ${index} (from legacy format)`,
            [],
            error,
            { action, index, originalKey: Object.keys(legacyActions)[index] }
          );
        }
      });

      return validated.map(a => ({
        type: a.type,
        payload: a.payload,
      }));
    }

    // Check for actions array in object
    if (Array.isArray(obj.actions)) {
      const validated = obj.actions.map((action, index) => {
        try {
          return actionSchema.parse(action);
        } catch (error) {
          throw new ActionValidationError(
            `Invalid action at index ${index}`,
            [],
            error,
            { action, index }
          );
        }
      });
      return validated.map(a => ({
        type: a.type,
        payload: a.payload,
      }));
    }
  }

  throw new ActionValidationError(
    'Actions data must be an array, agent_output envelope, or object with actions property',
    [],
    undefined,
    { raw }
  );
}

/**
 * Type guard for action parse result
 */
export function isActionParseSuccess(
  result: { ok: true; actions: Array<{ type: string; payload?: unknown }> } | { ok: false; error: ActionValidationError }
): result is { ok: true; actions: Array<{ type: string; payload?: unknown }> } {
  return result.ok === true;
}

/**
 * Safe parse actions (returns result object instead of throwing)
 */
export function safeParseActions(
  raw: unknown
): { ok: true; actions: Array<{ type: string; payload?: unknown }> } | { ok: false; error: ActionValidationError } {
  try {
    const actions = parseActionsOrThrow(raw);
    return { ok: true, actions };
  } catch (error) {
    if (error instanceof ActionValidationError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new ActionValidationError('Unknown error parsing actions', [], error),
    };
  }
}

/**
 * Custom error class for action validation errors
 */
export class ActionValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ path: string[]; message: string }>,
    public readonly cause?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ActionValidationError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      validationErrors: this.validationErrors,
      context: this.context,
    };
  }
}

/**
 * Normalize summary field: null/undefined -> empty string, empty string stays empty string
 */
export function normalizeSummary(summary: unknown): string {
  if (summary === null || summary === undefined) {
    return '';
  }
  if (typeof summary === 'string') {
    return summary;
  }
  return String(summary);
}

