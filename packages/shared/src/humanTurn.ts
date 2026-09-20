/**
 * Human Turn identity — the seam Dialog → Scene → Turns / Performances will use.
 * V0 binds System One orientation to this id. No Scene model.
 */

export const HUMAN_TURN_VERSION = 'human-turn-v0' as const;

const HUMAN_TURN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createHumanTurnId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
}

export function isHumanTurnId(value: unknown): value is string {
  return typeof value === 'string' && HUMAN_TURN_ID_PATTERN.test(value.trim());
}

export function resolveHumanTurnId(value?: string | null): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return isHumanTurnId(trimmed) ? trimmed : createHumanTurnId();
}

export type HumanTurnRole = 'lead' | 'cast';

export type HumanTurnSystemOneDelivery = {
  audience: 'lead';
  suppliedToLead: boolean;
  suppliedToCast: false;
  eligible: boolean;
  available: boolean;
  model: string | null;
  errorCode?: string;
};

export type HumanTurnSystemOneBinding = {
  judgedAt: string | null;
  /** True after this Turn decided whether to call Jev. Later Lead passes must reuse. */
  evaluatedOnce: boolean;
  /** Structured Jev record. Prompt text is a rendering of this, not the source of truth. */
  shadow: Record<string, unknown> | null;
  delivery: HumanTurnSystemOneDelivery;
};

export type HumanTurnCastMember = {
  slug: string;
  attributedTo?: string;
  status: string;
  receivedOrientation: false;
};

export type HumanTurnLeadGeneration = {
  label: string;
  receivedOrientation: boolean;
};

export type HumanTurnAction = {
  type: string;
  status: string;
};

export type HumanTurnRecord = {
  version: typeof HUMAN_TURN_VERSION;
  id: string;
  dialogId: string | null;
  sessionId: string | null;
  role: HumanTurnRole;
  systemOne: HumanTurnSystemOneBinding;
  cast: HumanTurnCastMember[];
  leadGenerations: HumanTurnLeadGeneration[];
  actions: HumanTurnAction[];
};

export function emptyHumanTurnSystemOneBinding(): HumanTurnSystemOneBinding {
  return {
    judgedAt: null,
    evaluatedOnce: false,
    shadow: null,
    delivery: {
      audience: 'lead',
      suppliedToLead: false,
      suppliedToCast: false,
      eligible: false,
      available: false,
      model: null,
    },
  };
}

export function buildHumanTurnRecord(params: {
  id: string;
  dialogId?: string | null;
  sessionId?: string | null;
  role: HumanTurnRole;
  systemOne?: HumanTurnSystemOneBinding;
  cast?: HumanTurnCastMember[];
  leadGenerations?: HumanTurnLeadGeneration[];
  actions?: HumanTurnAction[];
}): HumanTurnRecord {
  return {
    version: HUMAN_TURN_VERSION,
    id: params.id,
    dialogId: params.dialogId ?? null,
    sessionId: params.sessionId ?? null,
    role: params.role,
    systemOne: params.systemOne ?? emptyHumanTurnSystemOneBinding(),
    cast: params.cast ?? [],
    leadGenerations: params.leadGenerations ?? [],
    actions: params.actions ?? [],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseHumanTurnRecord(value: unknown): HumanTurnRecord | null {
  const record = asRecord(value);
  if (!record || record.version !== HUMAN_TURN_VERSION || !isHumanTurnId(record.id)) {
    return null;
  }
  const systemOne = asRecord(record.systemOne);
  const delivery = asRecord(systemOne?.delivery);
  return {
    version: HUMAN_TURN_VERSION,
    id: record.id,
    dialogId: typeof record.dialogId === 'string' ? record.dialogId : null,
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : null,
    role: record.role === 'cast' ? 'cast' : 'lead',
    systemOne: {
      judgedAt: typeof systemOne?.judgedAt === 'string' ? systemOne.judgedAt : null,
      evaluatedOnce: systemOne?.evaluatedOnce === true,
      shadow: asRecord(systemOne?.shadow),
      delivery: {
        audience: 'lead',
        suppliedToLead: delivery?.suppliedToLead === true,
        suppliedToCast: false,
        eligible: delivery?.eligible === true,
        available: delivery?.available === true,
        model: typeof delivery?.model === 'string' ? delivery.model : null,
        ...(typeof delivery?.errorCode === 'string' ? { errorCode: delivery.errorCode } : {}),
      },
    },
    cast: Array.isArray(record.cast)
      ? record.cast.flatMap((row) => {
          const item = asRecord(row);
          if (!item || typeof item.slug !== 'string') return [];
          return [{
            slug: item.slug,
            ...(typeof item.attributedTo === 'string' ? { attributedTo: item.attributedTo } : {}),
            status: typeof item.status === 'string' ? item.status : 'unknown',
            receivedOrientation: false as const,
          }];
        })
      : [],
    leadGenerations: Array.isArray(record.leadGenerations)
      ? record.leadGenerations.flatMap((row) => {
          const item = asRecord(row);
          if (!item || typeof item.label !== 'string') return [];
          return [{
            label: item.label,
            receivedOrientation: item.receivedOrientation === true,
          }];
        })
      : [],
    actions: Array.isArray(record.actions)
      ? record.actions.flatMap((row) => {
          const item = asRecord(row);
          if (!item || typeof item.type !== 'string') return [];
          return [{
            type: item.type,
            status: typeof item.status === 'string' ? item.status : 'unknown',
          }];
        })
      : [],
  };
}
