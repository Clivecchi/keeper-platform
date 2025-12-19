export const DEFAULT_POLICY_VERSION = 'policy-v1';

// Base policy JSON (stored in DB)
export const DEFAULT_POLICY_PACK_V1 = {
  drafts: {
    enabled: true,
    userTriggers: ['draft', 'create a draft', 'save as draft'],
    autoDraft: {
      enabled: true,
      thresholds: { minSections: 3, minChars: 1200 },
      kinds: ['vehicle_template', 'journey_spec', 'keeper_type_proposal', 'checklist_spec'],
      behavior: 'create_then_confirm' as const,
    },
  },
  actions: {
    allow: ['draft.create', 'draft.update', 'draft.list', 'draft.get', 'draft.read'],
  },
} as const;

const DEFAULT_ENTITY_PERMS = { create: false, read: true, update: false, delete: false } as const;

export type ActionPack = {
  draft: string[];
  keeper: string[];
  journey: string[];
  moment: string[];
  [key: string]: string[];
};

export type PolicyPackV1 = {
  policyVersion: string;
  resolvedBy: 'KAM';
  actions: { allow: string[] };
  entities: {
    drafts: { create: boolean; read: boolean; update: boolean; delete: boolean };
    keepers: { create: boolean; read: boolean; update: boolean; delete: boolean };
    journeys: { create: boolean; read: boolean; update: boolean; delete: boolean };
    moments: { create: boolean; read: boolean; update: boolean; delete: boolean };
  };
};

const DEFAULT_POLICY_PACK_RESOLVED: PolicyPackV1 = {
  policyVersion: DEFAULT_POLICY_VERSION,
  resolvedBy: 'KAM',
  actions: { allow: [...DEFAULT_POLICY_PACK_V1.actions.allow] },
  entities: {
    drafts: { create: true, read: true, update: true, delete: false },
    keepers: { ...DEFAULT_ENTITY_PERMS },
    journeys: { ...DEFAULT_ENTITY_PERMS },
    moments: { ...DEFAULT_ENTITY_PERMS },
  },
};

export function mapPolicyJsonToPack(policyJson: any): PolicyPackV1 {
  const base = policyJson ?? {};
  const draftsEnabled = base?.drafts?.enabled !== false;

  const allowListSource: string[] = Array.isArray(base?.actions?.allow)
    ? base.actions.allow.filter((a: unknown): a is string => typeof a === 'string')
    : [...DEFAULT_POLICY_PACK_V1.actions.allow];

  const allow = Array.from(new Set(allowListSource.map((a) => a.trim()).filter(Boolean)));

  const filteredAllow = draftsEnabled ? allow : allow.filter((action) => !action.startsWith('draft.'));

  return {
    policyVersion: DEFAULT_POLICY_VERSION,
    resolvedBy: 'KAM',
    actions: { allow: filteredAllow.length ? filteredAllow : [...DEFAULT_POLICY_PACK_V1.actions.allow] },
    entities: {
      drafts: { create: draftsEnabled, read: draftsEnabled, update: draftsEnabled, delete: false },
      keepers: { ...DEFAULT_ENTITY_PERMS },
      journeys: { ...DEFAULT_ENTITY_PERMS },
      moments: { ...DEFAULT_ENTITY_PERMS },
    },
  };
}

export function buildPolicyPackFromEnvironment(env: any): PolicyPackV1 {
  if (env?.policyPack) {
    return env.policyPack as PolicyPackV1;
  }

  if (env?.policy?.policy) {
    return mapPolicyJsonToPack(env.policy.policy);
  }

  if (env?.policy) {
    return mapPolicyJsonToPack(env.policy);
  }

  return DEFAULT_POLICY_PACK_RESOLVED;
}

export function isActionAllowed(env: any, action: string): boolean {
  if (!action) return false;
  const pack = buildPolicyPackFromEnvironment(env);
  return Array.isArray(pack.actions.allow) ? pack.actions.allow.includes(action) : false;
}

export function buildActionPack(allow: string[] = []): ActionPack {
  const actionPack: ActionPack = {
    draft: [],
    keeper: [],
    journey: [],
    moment: [],
  };

  for (const action of allow) {
    if (typeof action !== 'string') continue;
    const [entity, capability] = action.split('.');
    if (!entity || !capability) continue;
    if (!actionPack[entity]) {
      actionPack[entity] = [];
    }
    if (!actionPack[entity].includes(capability)) {
      actionPack[entity].push(capability);
    }
  }

  return actionPack;
}


