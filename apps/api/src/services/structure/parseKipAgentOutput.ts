import { logger } from '@keeper/shared';
import {
  ActionValidationError,
  isActionParseSuccess,
  safeParseActions,
} from '../../api/kip/actions/schema.js';

export const ACTION_ENVELOPE_TYPE = 'agent_output';

export type StructuredAgentAction = { type: string; payload?: Record<string, unknown> | null };

export type ParsedAgentOutput = {
  responseText: string;
  actions: StructuredAgentAction[];
  raw: string;
  ignoredReason?: string;
  validationError?: ActionValidationError;
  repaired?: boolean;
};

/**
 * Extract JSON object from mixed response (prose + JSON).
 */
export function extractJsonFromResponse(raw: string): string | null {
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
      if (
        typeof obj === 'object'
        && obj !== null
        && (typeof obj.response === 'string' || Array.isArray(obj.actions))
      ) {
        return candidate;
      }
    } catch {
      /* ignore */
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

export function looksLikeJsonAttempt(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```');
}

function mapLegacyActions(parsed: Record<string, unknown>): StructuredAgentAction[] {
  if (!Array.isArray(parsed.actions)) return [];
  return parsed.actions
    .filter((action): action is Record<string, unknown> => !!action && typeof (action as { type?: unknown }).type === 'string')
    .map((action) => ({
      type: String(action.type),
      payload: (action.payload ?? null) as Record<string, unknown> | null,
    }));
}

function parseEnvelopeObject(
  parsed: Record<string, unknown>,
  raw: string,
  requestId?: string,
): ParsedAgentOutput {
  const responseText = typeof parsed.response === 'string' ? parsed.response : raw;
  const actionsResult = safeParseActions(parsed);

  if (isActionParseSuccess(actionsResult)) {
    return {
      responseText,
      actions: actionsResult.actions as StructuredAgentAction[],
      raw,
    };
  }

  const validationError = actionsResult.error;
  logger.warn(
    {
      requestId,
      reason: 'action_validation_failed',
      error: validationError.message,
      context: validationError.context,
    },
    '[structure] failed to parse actions from agent response',
  );

  if (parsed.type !== ACTION_ENVELOPE_TYPE) {
    return {
      responseText,
      actions: [],
      raw,
      ignoredReason: 'missing_agent_output_envelope',
      validationError,
    };
  }

  return {
    responseText,
    actions: mapLegacyActions(parsed),
    raw,
    validationError,
  };
}

/**
 * Parse primary model output into agent_output shape (no Together repair).
 */
export function parseKipAgentOutput(raw: string, requestId?: string): ParsedAgentOutput {
  const trimmed = raw.trim();

  if (trimmed.startsWith('```')) {
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(stripped) as Record<string, unknown>;
      return parseEnvelopeObject(parsed, stripped, requestId);
    } catch {
      return { responseText: stripped, actions: [], raw, ignoredReason: 'fenced_response' };
    }
  }

  const jsonStr = extractJsonFromResponse(trimmed) ?? trimmed;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return parseEnvelopeObject(parsed, raw, requestId);
  } catch {
    const fallbackJson = extractJsonFromResponse(raw);
    if (fallbackJson) {
      try {
        const parsed = JSON.parse(fallbackJson) as Record<string, unknown>;
        return parseEnvelopeObject(parsed, raw, requestId);
      } catch {
        /* fall through */
      }
    }
    return {
      responseText: trimmed,
      actions: [],
      raw,
      ignoredReason: 'invalid_json',
    };
  }
}

export function wrapProseAsAgentOutput(prose: string): ParsedAgentOutput {
  const text = prose.trim();
  return {
    responseText: text,
    actions: [],
    raw: prose,
    ignoredReason: 'plain_text_fallback',
  };
}

export function parsedFromRepairedJson(
  jsonText: string,
  originalRaw: string,
  requestId?: string,
): ParsedAgentOutput {
  const parsed = parseKipAgentOutput(jsonText, requestId);
  if (parsed.ignoredReason === 'invalid_json') {
    return parsed;
  }
  return { ...parsed, raw: originalRaw, repaired: true, ignoredReason: undefined };
}
