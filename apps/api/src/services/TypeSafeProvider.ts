/**
 * TypeSafe System One provider — Jev evaluates typed questions, it does not chat.
 * POST https://api.typesafe.ai/v1/systemone
 */

export const TYPESAFE_SYSTEMONE_URL = 'https://api.typesafe.ai/v1/systemone';
export const TYPESAFE_MODELS_URL = 'https://api.typesafe.ai/v1/models';
export const TYPESAFE_DEFAULT_MODEL = 'jev-latest';

type TypeSafeMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
};

type TypeSafeCallResult = {
  success: boolean;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  retries_used: number;
  execution_time_ms: number;
};

export type TypeSafeQuestion =
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
  | { type: 'score'; instructions: string; criteria: string[] };

export type TypeSafeQuestions = Record<string, TypeSafeQuestion>;

const DEFAULT_QUESTIONS: TypeSafeQuestions = {
  kind: {
    type: 'choice',
    instructions: 'What kind of turn is this?',
    criteria: {
      conversation: 'Needs generated language for a person',
      decision: 'Needs a structured yes/no, score, or classification',
      lookup: 'Needs facts from a system or document',
    },
  },
  is_clear: {
    type: 'noul',
    instructions: 'Is the latest request specific enough to act on?',
  },
};

function messageText(content: TypeSafeMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

export function conversationToState(messages: TypeSafeMessage[]): string {
  return messages
    .map((message) => {
      const text = messageText(message.content).trim();
      if (!text) return '';
      return `${message.role}: ${text}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function isQuestionMap(value: unknown): value is TypeSafeQuestions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const type = (entry as { type?: unknown }).type;
    return type === 'noul' || type === 'choice' || type === 'score';
  });
}

export function resolveTypeSafeRequest(
  messages: TypeSafeMessage[],
  settings: { model?: string },
): { state: unknown; questions: TypeSafeQuestions; model: string } {
  const model = settings.model?.trim() || TYPESAFE_DEFAULT_MODEL;
  const lastUser = [...messages].reverse().find((row) => row.role === 'user');
  const lastText = lastUser ? messageText(lastUser.content).trim() : '';

  if (lastText.startsWith('{')) {
    try {
      const parsed = JSON.parse(lastText) as Record<string, unknown>;
      if (isQuestionMap(parsed.questions)) {
        return {
          state: parsed.state ?? conversationToState(messages),
          questions: parsed.questions,
          model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : model,
        };
      }
      if (isQuestionMap(parsed)) {
        return { state: conversationToState(messages), questions: parsed, model };
      }
    } catch {
      /* use conversation as state */
    }
  }

  return {
    state: conversationToState(messages),
    questions: DEFAULT_QUESTIONS,
    model,
  };
}

function formatAnswers(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [id, raw] of Object.entries(answers)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (row.type === 'noul' && typeof row.noul === 'number') {
      lines.push(`${id}: ${row.noul.toFixed(3)}`);
      continue;
    }
    if (row.type === 'choice' && typeof row.choice === 'string') {
      const confidence = typeof row.confidence === 'number' ? ` (confidence ${row.confidence.toFixed(2)})` : '';
      lines.push(`${id}: ${row.choice}${confidence}`);
      continue;
    }
    if (row.type === 'score' && typeof row.score === 'number') {
      const confidence = typeof row.confidence === 'number' ? ` (confidence ${row.confidence.toFixed(2)})` : '';
      lines.push(`${id}: ${row.score.toFixed(3)}${confidence}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : JSON.stringify(answers);
}

export class TypeSafeProvider {
  static async callModel(
    messages: TypeSafeMessage[],
    settings: { model?: string },
    apiKey?: string,
    jsonMode?: boolean,
  ): Promise<TypeSafeCallResult> {
    if (!apiKey?.trim()) {
      throw new Error('TypeSafe API key is not configured. Add TYPESAFE_API_KEY to Railway, or a platform/user key.');
    }

    const request = resolveTypeSafeRequest(messages, settings);
    const res = await fetch(TYPESAFE_SYSTEMONE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const bodyText = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }

    if (!res.ok) {
      const detail =
        typeof parsed.error === 'string'
          ? parsed.error
          : typeof parsed.message === 'string'
            ? parsed.message
            : bodyText.slice(0, 240) || res.statusText;
      throw new Error(`TypeSafe API ${res.status}: ${detail}`);
    }

    const answers =
      parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)
        ? (parsed.answers as Record<string, unknown>)
        : parsed;
    const usageRaw = parsed.usage && typeof parsed.usage === 'object' ? (parsed.usage as Record<string, unknown>) : {};
    const promptTokens = typeof usageRaw.input_tokens === 'number' ? usageRaw.input_tokens : 0;
    const completionTokens = typeof usageRaw.output_tokens === 'number' ? usageRaw.output_tokens : 0;
    const model =
      typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : request.model;

    return {
      success: true,
      content: jsonMode ? JSON.stringify(answers) : formatAnswers(answers),
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
      model,
      retries_used: 0,
      execution_time_ms: 0,
    };
  }
}

export async function verifyTypeSafeKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string; hint?: string }> {
  try {
    const res = await fetch(TYPESAFE_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: 'TypeSafe API key is invalid',
        hint: 'Verify TYPESAFE_API_KEY on Railway, or the platform/user key for typesafe.',
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `TypeSafe API returned HTTP ${res.status}`,
        hint: 'Check network access to api.typesafe.ai.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach TypeSafe',
      hint: 'Check network connectivity from the API host.',
    };
  }
}

export function transformTypeSafeModels(raw: unknown): Array<{ id: string; label: string; type: string; metadata: Record<string, unknown> }> {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { models?: unknown }).models)
      ? (raw as { models: unknown[] }).models
      : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const id = typeof row.name === 'string' ? row.name : typeof row.id === 'string' ? row.id : '';
      if (!id.trim()) return null;
      const label = typeof row.description === 'string' && row.description.trim() ? `${id} — ${row.description.trim()}` : id;
      return {
        id: id.trim(),
        label,
        type: 'language',
        metadata: { ...row },
      };
    })
    .filter((row): row is { id: string; label: string; type: string; metadata: Record<string, unknown> } => row != null);
}
