/**
 * Slim allowlisted KAM environment for model prompts.
 *
 * Full env-v1 / kip-env-v1 objects stay available for action execution and
 * specialized prompt builders. Only this compact view is JSON-stringified into
 * the system prompt — avoids dumping policy packs, registries, and duplicate
 * dialog/roster payloads that already have dedicated prompt blocks.
 */

export type CompactEnvironmentForPrompt = {
  version: string;
  note: string;
  agent?: {
    id: string;
    slug?: string | null;
    name?: string | null;
  };
  domains?: Array<{
    domainId: string;
    domainSlug?: string | null;
    domainName?: string | null;
    role: string;
    visibility: string;
  }>;
  domain?: {
    id: string;
    slug?: string | null;
    name?: string | null;
  };
  capabilities?: {
    canDraft?: boolean;
    canPromote?: boolean;
    canWriteProduction?: boolean;
  };
  actionPack?: Record<string, string[]>;
  draftsDirectory?: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    updatedAt: string | Date;
    key?: string | null;
  }>;
  activeDraft?: {
    id: string;
    kind: string;
    key: string;
    title: string;
    status: string;
    updatedAt: string | Date;
    points?: unknown;
  };
  domainIndex?: {
    keepers: Array<{ id: string; title: string; purpose?: string | null }>;
    journeys: Array<{ id: string; name: string; forward: string; keeperId: string }>;
    library: Array<{ id: string; label: string; sourceType: string }>;
    dialogs: Array<{
      id: string;
      title: string;
      titleSource: string;
      documentStatus: string;
      updatedAt: string;
    }>;
  };
  dialogDocumentRef?: {
    dialogId: string;
    title?: string;
    status?: string;
    manuscriptDraftId?: string;
  };
  agentContext?: Record<string, unknown>;
  draftPolicy?: {
    autoDraft?: unknown;
  };
  debug?: {
    resolvedBy?: string;
    resolvedAt?: string;
    canary?: string;
  };
};

const COMPACT_NOTE =
  'Compact KAM context. Domain agent roster and full Dialog Document are in dedicated system blocks — do not expect them here. Use draftsDirectory / activeDraft / domainIndex below for draft and domain lookup.';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function slimAgentContext(raw: unknown): Record<string, unknown> | undefined {
  const ctx = asRecord(raw);
  if (!ctx) return undefined;

  const out: Record<string, unknown> = {};
  for (const key of [
    'audience',
    'model',
    'forward',
    'directions',
    'kip_context',
    'glossMode',
    'glossAnchor',
    'glossContent',
    'draftDiscuss',
    'draftDiscussIntent',
    'designBoard',
  ] as const) {
    if (ctx[key] !== undefined) out[key] = ctx[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Build the allowlisted environment object injected into the model system prompt.
 */
export function buildCompactEnvironmentForPrompt(
  environment: unknown,
): CompactEnvironmentForPrompt | null {
  const env = asRecord(environment);
  if (!env) return null;

  const version =
    typeof env.version === 'string' && env.version.trim()
      ? env.version
      : 'env-compact';

  const compact: CompactEnvironmentForPrompt = {
    version,
    note: COMPACT_NOTE,
  };

  const agent = asRecord(env.agent);
  if (agent && typeof agent.id === 'string') {
    compact.agent = {
      id: agent.id,
      slug: typeof agent.slug === 'string' ? agent.slug : null,
      name: typeof agent.name === 'string' ? agent.name : null,
    };
  }

  if (Array.isArray(env.domains)) {
    compact.domains = env.domains
      .map((entry) => {
        const d = asRecord(entry);
        if (!d || typeof d.domainId !== 'string') return null;
        return {
          domainId: d.domainId,
          domainSlug: typeof d.domainSlug === 'string' ? d.domainSlug : null,
          domainName: typeof d.domainName === 'string' ? d.domainName : null,
          role: typeof d.role === 'string' ? d.role : 'foreign',
          visibility: typeof d.visibility === 'string' ? d.visibility : 'filtered',
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  const domain = asRecord(env.domain);
  if (domain && typeof domain.id === 'string') {
    compact.domain = {
      id: domain.id,
      slug: typeof domain.slug === 'string' ? domain.slug : null,
      name: typeof domain.name === 'string' ? domain.name : null,
    };
  }

  const capabilities = asRecord(env.capabilities);
  if (capabilities) {
    compact.capabilities = {
      canDraft: capabilities.canDraft === true,
      canPromote: capabilities.canPromote === true,
      canWriteProduction: capabilities.canWriteProduction === true,
    };
  }

  const actionPack = asRecord(env.actionPack);
  if (actionPack) {
    const slimPack: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(actionPack)) {
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        slimPack[key] = value as string[];
      }
    }
    if (Object.keys(slimPack).length > 0) compact.actionPack = slimPack;
  }

  if (Array.isArray(env.draftsDirectory)) {
    compact.draftsDirectory = env.draftsDirectory
      .map((entry) => {
        const d = asRecord(entry);
        if (!d || typeof d.id !== 'string') return null;
        return {
          id: d.id,
          title: typeof d.title === 'string' ? d.title : '',
          kind: typeof d.kind === 'string' ? d.kind : '',
          status: typeof d.status === 'string' ? d.status : '',
          updatedAt: (d.updatedAt as string | Date) ?? '',
          key: typeof d.key === 'string' ? d.key : null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .slice(0, 20);
  }

  const activeDraft = asRecord(env.activeDraft);
  if (activeDraft && typeof activeDraft.id === 'string') {
    compact.activeDraft = {
      id: activeDraft.id,
      kind: typeof activeDraft.kind === 'string' ? activeDraft.kind : '',
      key: typeof activeDraft.key === 'string' ? activeDraft.key : '',
      title: typeof activeDraft.title === 'string' ? activeDraft.title : '',
      status: typeof activeDraft.status === 'string' ? activeDraft.status : '',
      updatedAt: (activeDraft.updatedAt as string | Date) ?? '',
      points: activeDraft.points,
    };
  }

  const domainIndex = asRecord(env.domainIndex);
  if (domainIndex) {
    compact.domainIndex = {
      keepers: Array.isArray(domainIndex.keepers)
        ? (domainIndex.keepers as Array<{ id: string; title: string; purpose?: string | null }>)
        : [],
      journeys: Array.isArray(domainIndex.journeys)
        ? (domainIndex.journeys as Array<{
            id: string;
            name: string;
            forward: string;
            keeperId: string;
          }>)
        : [],
      library: Array.isArray(domainIndex.library)
        ? (domainIndex.library as Array<{ id: string; label: string; sourceType: string }>)
        : [],
      dialogs: Array.isArray(domainIndex.dialogs)
        ? (domainIndex.dialogs as Array<{
            id: string;
            title: string;
            titleSource: string;
            documentStatus: string;
            updatedAt: string;
          }>)
        : [],
    };
  }

  const dialogDocument = asRecord(env.dialogDocument);
  if (dialogDocument && typeof dialogDocument.dialogId === 'string') {
    compact.dialogDocumentRef = {
      dialogId: dialogDocument.dialogId,
      title: typeof dialogDocument.title === 'string' ? dialogDocument.title : undefined,
      status: typeof dialogDocument.status === 'string' ? dialogDocument.status : undefined,
      ...(typeof dialogDocument.manuscriptDraftId === 'string'
        ? { manuscriptDraftId: dialogDocument.manuscriptDraftId }
        : {}),
    };
  }

  const agentContext = slimAgentContext(env.agentContext);
  if (agentContext) compact.agentContext = agentContext;

  const policy = asRecord(env.policy);
  const policyBody = asRecord(policy?.policy);
  const draftsPolicy = asRecord(policyBody?.drafts);
  if (draftsPolicy?.autoDraft !== undefined) {
    compact.draftPolicy = { autoDraft: draftsPolicy.autoDraft };
  }

  const debug = asRecord(env.debug);
  if (debug) {
    compact.debug = {
      resolvedBy: typeof debug.resolvedBy === 'string' ? debug.resolvedBy : undefined,
      resolvedAt: typeof debug.resolvedAt === 'string' ? debug.resolvedAt : undefined,
      canary: typeof debug.canary === 'string' ? debug.canary : undefined,
    };
  }

  return compact;
}

/** Character counts for before/after prompt-size comparison in timings. */
export function measureEnvironmentPromptSize(environment: unknown): {
  fullChars: number;
  compactChars: number;
} {
  const fullChars = environment == null ? 0 : JSON.stringify(environment, null, 2).length;
  const compact = buildCompactEnvironmentForPrompt(environment);
  const compactChars = compact == null ? 0 : JSON.stringify(compact, null, 2).length;
  return { fullChars, compactChars };
}
