import { DomainCacheService, DomainPermissionService, DomainService, prisma } from '@keeper/database';
import { DomainAuthManager } from '@keeper/kam';
import { getRedis, isNoOpRedis, type RedisClientOrNoOp } from '../../lib/redis.js';
import { loadDomainPolicy, resolvePolicyPackV1 } from '../../policy/domainPolicyService.js';
import { DEFAULT_POLICY_PACK_V1, DEFAULT_POLICY_VERSION, type PolicyPackV1, type ActionPack, buildActionPack } from '../../policy/policyPack.js';
import {
  resolveDialogParticipation,
  summarizeDraftPointsForAgent,
  type DialogParticipation,
} from '@keeper/shared';
import { getAgentPolicyView } from '../../governance/index.js';
import type { AgentPolicyView } from '../../governance/types.js';
import { loadDomainScopedAgents } from '../domains/loadDomainScopedAgents.js';
import { listDialogCastMembers } from '../domains/dialogCastMembership.js';
import {
  loadDialogDocumentForAgent,
  type AgentDialogDocument,
} from './loadDialogDocumentForAgent.js';

export type AgentEnvironmentContext = {
  version: 'env-v1';
  agent?: {
    id: string;
    slug?: string | null;
    name?: string | null;
  };
  domains: Array<{
    domainId: string;
    domainSlug?: string | null;
    domainName?: string | null;
    role: 'home' | 'foreign';
    visibility: 'full' | 'filtered' | 'public';
    registry?: {
      keeperTypes: { key: string; id: string }[];
      momentTypes: { key: string; id: string }[];
      boardTypes: { key: string; id: string }[];
    };
  }>;
  capabilities: {
    canDraft: boolean;
    canPromote: boolean;
  };
  actionPack?: ActionPack;
  policyPack: PolicyPackV1;
  policy: {
    version: string;
    policy: unknown;
    updatedAt?: Date | null;
    source: 'domain' | 'default';
  };
  draftsDirectory: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    updatedAt: Date;
    key?: string | null;
  }>;
  activeDraft?: {
    id: string;
    kind: string;
    key: string;
    title: string;
    status: string;
    updatedAt: Date;
    points?: ReturnType<typeof summarizeDraftPointsForAgent>;
  };
  debug?: {
    resolvedBy: 'KAM';
    resolvedAt: string;
    injectedAt?: string;
    canary?: string;
  };
  governance?: AgentPolicyView | null;
  /**
   * Domain baseline (lead + Kip + platform instruments) plus DialogCastMember-enabled
   * leads when dialogId/session.dialog_id is known — additive merge for Kip's roster prompt.
   */
  domainAgents?: Array<{
    id: string;
    slug: string;
    name: string;
    purpose: string | null;
    role: string | null;
    dialogParticipation: DialogParticipation;
  }>;
  domainIndex?: {
    keepers: Array<{ id: string; title: string; purpose?: string | null }>;
    journeys: Array<{ id: string; name: string; forward: string; keeperId: string }>;
    library: Array<{ id: string; label: string; sourceType: string }>;
  };
  /**
   * Dialog Document (Forward / Step / Paths / manuscript Points) for the active Dialog.
   * Loaded when session.dialog_id (or args.dialogId) is known — same source Chronicle reads.
   */
  dialogDocument?: AgentDialogDocument;
  /**
   * agentContext — injected by the frontend from the domain frame JSON.
   * Carries: audience role, model, forward destination, available directions,
   * and the kip_context instruction for this specific visitor.
   *
   * This is the field that makes Kip aware of everything the UI already knows.
   * Spec: Keeper JsonFrame Spec v0.1 · Step 6
   */
  agentContext?: {
    audience: string;
    model: string;
    forward: { label: string; destination: string; available_to: string[] };
    directions: Array<{ label: string; frame?: string; action?: string; available_to: string[] }>;
    kip_context: string;
  };
};

async function enrichDomainAgentsParticipation(
  agents: Array<{
    id: string;
    slug: string;
    name: string;
    purpose: string | null;
    role: string | null;
    dialogParticipation: DialogParticipation;
  }>,
): Promise<
  Array<{
    id: string;
    slug: string;
    name: string;
    purpose: string | null;
    role: string | null;
    dialogParticipation: DialogParticipation;
  }>
> {
  if (agents.length === 0) return agents;
  try {
    const rows = await prisma.kip_agents.findMany({
      where: { id: { in: agents.map((agent) => agent.id) } },
      select: { id: true, slug: true, config: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return agents.map((agent) => {
      const row = byId.get(agent.id);
      if (!row) return agent;
      return {
        ...agent,
        dialogParticipation: resolveDialogParticipation(row.config, { slug: row.slug }),
      };
    });
  } catch {
    return agents;
  }
}

// Lazy initialization - services will be created only when needed
let cacheService: DomainCacheService | null = null;
let domainService: DomainService | null = null;
let permissionService: DomainPermissionService | null = null;
let domainAuthManager: DomainAuthManager | null = null;

function getDomainAuthManager(): DomainAuthManager {
  if (!domainAuthManager) {
    if (!cacheService) {
      const redisClient = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redisClient);
    }
    if (!domainService) {
      domainService = new DomainService(prisma, cacheService);
    }
    if (!permissionService) {
      permissionService = new DomainPermissionService(prisma, cacheService);
    }
    domainAuthManager = new DomainAuthManager(
      prisma,
      isNoOpRedis(getRedis()) ? undefined : (getRedis() as any)
    );
  }
  return domainAuthManager;
}

function getDomainService(): DomainService {
  if (!domainService) {
    if (!cacheService) {
      const redisClient = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redisClient);
    }
    domainService = new DomainService(prisma, cacheService);
  }
  return domainService;
}

function getPermissionService(): DomainPermissionService {
  if (!permissionService) {
    if (!cacheService) {
      const redisClient = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redisClient);
    }
    permissionService = new DomainPermissionService(prisma, cacheService);
  }
  return permissionService;
}
const DRAFT_DIRECTORY_LIMIT = 25;

async function loadRegistry(domainId: string): Promise<AgentEnvironmentContext['domains'][number]['registry']> {
  const registry = {
    keeperTypes: [] as { key: string; id: string }[],
    momentTypes: [] as { key: string; id: string }[],
    boardTypes: [] as { key: string; id: string }[],
  };

  try {
    const keeperTypes = await prisma.keeperType.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    registry.keeperTypes = keeperTypes.map((type) => ({
      id: type.id,
      key: type.name,
    }));
  } catch (error) {
    console.warn('[resolveAgentEnvironment] keeper types lookup failed', { domainId, error });
  }

  try {
    const boardTypes = await prisma.board.findMany({
      where: { domainId },
      select: { boardType: true },
      distinct: ['boardType'],
    });
    registry.boardTypes = boardTypes
      .map((entry) => entry.boardType)
      .filter((key): key is string => Boolean(key))
      .map((key) => ({ id: key, key }));
  } catch (error) {
    console.warn('[resolveAgentEnvironment] board types lookup failed', { domainId, error });
  }

  // Moment types are not modeled yet; keep the shape stable with an empty array.
  return registry;
}

export async function resolveAgentEnvironment(args: {
  agentId: string;
  userId?: string;
  domainId?: string;
  sessionId?: string;
  /** When omitted, resolved from kip_sessions.dialog_id when sessionId is present. */
  dialogId?: string;
  intent: 'interactive';
}): Promise<AgentEnvironmentContext> {
  const { agentId, userId, domainId, sessionId, dialogId } = args;

  const resolvedAt = new Date().toISOString();
  const environment: AgentEnvironmentContext = {
    version: 'env-v1',
    domains: [],
    capabilities: {
      canDraft: false,
      canPromote: false,
    },
    actionPack: buildActionPack([...DEFAULT_POLICY_PACK_V1.actions.allow]),
    policyPack: {
      policyVersion: DEFAULT_POLICY_VERSION,
      resolvedBy: 'KAM',
      actions: { allow: [...DEFAULT_POLICY_PACK_V1.actions.allow] },
      entities: {
        drafts: { create: true, read: true, update: true, delete: false },
        keepers: { create: false, read: true, update: false, delete: false },
        journeys: { create: false, read: true, update: false, delete: false },
        moments: { create: false, read: true, update: false, delete: false },
      },
    },
    policy: {
      version: DEFAULT_POLICY_VERSION,
      policy: DEFAULT_POLICY_PACK_V1,
      updatedAt: null,
      source: 'default',
    },
    draftsDirectory: [],
    debug: {
      resolvedBy: 'KAM',
      resolvedAt,
    },
  };

  // One session fetch for dialog_id (cast roster) + active draft — avoid double query later.
  let sessionRow: {
    id: string;
    user_id: string | null;
    active_draft_id: string | null;
    dialog_id: string | null;
  } | null = null;
  let effectiveDialogId = dialogId;
  if (sessionId) {
    try {
      sessionRow = await prisma.kip_sessions.findUnique({
        where: { id: sessionId },
        select: { id: true, user_id: true, active_draft_id: true, dialog_id: true },
      });
      if (!effectiveDialogId) {
        effectiveDialogId = sessionRow?.dialog_id ?? undefined;
      }
    } catch (error) {
      console.warn('[resolveAgentEnvironment] session lookup failed', { sessionId, error });
    }
  }

  try {
    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId },
      select: { id: true, slug: true, name: true },
    });
    environment.agent = {
      id: agentId,
      slug: agent?.slug ?? null,
      name: agent?.name ?? null,
    };
  } catch (error) {
    console.warn('[resolveAgentEnvironment] agent lookup failed', { agentId, error });
    environment.agent = { id: agentId, slug: null, name: null };
  }

  let accessibleDomains: Array<{
    id: string;
    permissions: string[];
    role: string;
    isOwner: boolean;
  }> = [];

  if (userId) {
    try {
      accessibleDomains = await getDomainAuthManager().getAccessibleDomains(userId);
    } catch (error) {
      console.warn('[resolveAgentEnvironment] getAccessibleDomains failed', { userId, error });
    }
  }

  const accessibleMap = new Map(accessibleDomains.map((d) => [d.id, d]));
  let primaryDomainId = domainId || null;

  if (!primaryDomainId && userId) {
    const userRow = await prisma.users.findUnique({
      where: { id: userId },
      select: { primaryDomainId: true },
    });
    const anchored = userRow?.primaryDomainId?.trim() || null;
    if (anchored && accessibleMap.has(anchored)) {
      primaryDomainId = anchored;
    } else if (accessibleDomains.length) {
      primaryDomainId = accessibleDomains[0].id;
    }
  } else if (!primaryDomainId && accessibleDomains.length) {
    primaryDomainId = accessibleDomains[0].id;
  }

  if (primaryDomainId) {
    try {
      const domain = await getDomainService().getDomainById(primaryDomainId);
      const hasReadAccess = userId
        ? (await getPermissionService().checkPermission({
            userId,
            domainId: primaryDomainId,
            permission: 'read',
          })).hasPermission
        : Boolean(domain?.isPublic);

      const visibility: AgentEnvironmentContext['domains'][number]['visibility'] = hasReadAccess
        ? 'full'
        : domain?.isPublic
          ? 'public'
          : 'filtered';

      const domainRole: AgentEnvironmentContext['domains'][number]['role'] = hasReadAccess ? 'home' : 'foreign';
      const registry = hasReadAccess ? await loadRegistry(primaryDomainId) : undefined;

      environment.domains.push({
        domainId: primaryDomainId,
        domainSlug: domain?.slug ?? null,
        domainName: domain?.name ?? null,
        role: domainRole,
        visibility,
        ...(registry ? { registry } : {}),
      });

      const perms = accessibleMap.get(primaryDomainId)?.permissions || [];
      environment.capabilities.canDraft = hasReadAccess && perms.includes('write');
      environment.capabilities.canPromote = hasReadAccess && (perms.includes('admin') || perms.includes('share'));

      try {
        environment.policy = await loadDomainPolicy(primaryDomainId);
      } catch (error) {
        console.warn('[resolveAgentEnvironment] policy resolution failed, using default', {
          domainId: primaryDomainId,
          error,
        });
        environment.policy = {
          version: DEFAULT_POLICY_VERSION,
          policy: DEFAULT_POLICY_PACK_V1,
          updatedAt: null,
          source: 'default',
        };
      }

      try {
        environment.policyPack = await resolvePolicyPackV1({ domainId: primaryDomainId, userId, agentId });
        environment.actionPack = buildActionPack(environment.policyPack.actions.allow ?? []);
      } catch (error) {
        console.warn('[resolveAgentEnvironment] policyPack resolution failed, using default', {
          domainId: primaryDomainId,
          error,
        });
      }

      try {
        environment.governance = await getAgentPolicyView(primaryDomainId);
      } catch (error) {
        console.warn('[resolveAgentEnvironment] governance resolution failed', {
          domainId: primaryDomainId,
          error,
        });
      }

      if (hasReadAccess) {
        try {
          const [keepers, journeys, libraryItems] = await Promise.all([
            prisma.keeper.findMany({
              where: { domainId: primaryDomainId },
              take: 20,
              select: { id: true, title: true, purpose: true },
            }),
            prisma.journey.findMany({
              where: { domainId: primaryDomainId },
              take: 20,
              select: { id: true, name: true, forward: true, keeperId: true },
            }),
            prisma.libraryItem.findMany({
              where: { domain_id: primaryDomainId },
              orderBy: { updated_at: 'desc' },
              take: 20,
              select: { id: true, display_label: true, source_type: true },
            }),
          ]);
          environment.domainIndex = {
            keepers: keepers.map((k) => ({ id: k.id, title: k.title, purpose: k.purpose ?? null })),
            journeys: journeys.map((j) => ({ id: j.id, name: j.name, forward: j.forward, keeperId: j.keeperId })),
            library: libraryItems.map((item) => ({
              id: item.id,
              label: item.display_label?.trim() || item.id,
              sourceType: item.source_type,
            })),
          };
          try {
            const baseline = await loadDomainScopedAgents(primaryDomainId);
            let merged = baseline;
            if (effectiveDialogId && userId) {
              try {
                const castMembers = await listDialogCastMembers({
                  userId,
                  domainId: primaryDomainId,
                  dialogId: effectiveDialogId,
                });
                if (castMembers.length > 0) {
                  const seen = new Set(baseline.map((agent) => agent.id));
                  merged = [...baseline];
                  for (const member of castMembers) {
                    if (seen.has(member.agentId)) continue;
                    seen.add(member.agentId);
                    // Cast membership ≠ this domain's dialog lead. Hardcoding 'Lead'
                    // made Kip treat guest leads (e.g. Ceox on ke3p) as owning dialog voice.
                    merged.push({
                      id: member.agentId,
                      slug: member.agentSlug,
                      name: member.agentName,
                      purpose: null,
                      role: 'Cast',
                      dialogParticipation: 'voice',
                    });
                  }
                }
              } catch (error) {
                console.warn('[resolveAgentEnvironment] dialog cast lookup failed', {
                  domainId: primaryDomainId,
                  dialogId: effectiveDialogId,
                  error,
                });
              }
            }
            // Prefer declared participation from agent config when cast members
            // are also in the baseline (or when we can resolve config by slug).
            environment.domainAgents = await enrichDomainAgentsParticipation(merged);
          } catch (error) {
            console.warn('[resolveAgentEnvironment] domain agents lookup failed', {
              domainId: primaryDomainId,
              error,
            });
          }

          if (effectiveDialogId) {
            try {
              const dialogDocument = await loadDialogDocumentForAgent(
                effectiveDialogId,
                primaryDomainId,
              );
              if (dialogDocument) {
                environment.dialogDocument = dialogDocument;
              }
            } catch (error) {
              console.warn('[resolveAgentEnvironment] dialogDocument load failed', {
                domainId: primaryDomainId,
                dialogId: effectiveDialogId,
                error,
              });
            }
          }
        } catch (error) {
          console.warn('[resolveAgentEnvironment] domain index lookup failed', { domainId: primaryDomainId, error });
        }
      }

      if (hasReadAccess && userId) {
        try {
          const drafts = await prisma.kip_drafts.findMany({
            where: { domain_id: primaryDomainId, owner_id: userId },
            select: {
              id: true,
              kind: true,
              key: true,
              title: true,
              status: true,
              updated_at: true,
              keeper_id: true,
            },
            orderBy: [{ keeper_id: 'desc' }, { updated_at: 'desc' }],
            take: DRAFT_DIRECTORY_LIMIT,
          });

          environment.draftsDirectory = drafts.map((draft) => ({
            id: draft.id,
            kind: draft.kind,
            key: draft.key,
            title: draft.title,
            status: draft.status,
            updatedAt: draft.updated_at,
            keeperId: draft.keeper_id ?? undefined,
          }));
        } catch (error) {
          console.warn('[resolveAgentEnvironment] drafts directory load failed', {
            domainId: primaryDomainId,
            userId,
            error,
          });
        }
      }
    } catch (error) {
      console.warn('[resolveAgentEnvironment] domain resolution failed', { primaryDomainId, userId, agentId, error });
    }
  }

  // If no domain access was resolved, return a minimal, explicit context.
  if (environment.domains.length === 0) {
    environment.domains = [];
    environment.capabilities.canDraft = false;
    environment.capabilities.canPromote = false;
  }

  if (sessionId && sessionRow) {
    try {
      const ownsSession = !sessionRow.user_id || (userId ? sessionRow.user_id === userId : false);

      if (sessionRow.active_draft_id && ownsSession) {
        const draft = await prisma.kip_drafts.findFirst({
          where: {
            id: sessionRow.active_draft_id,
            ...(domainId ? { domain_id: domainId } : {}),
            ...(userId ? { owner_id: userId } : {}),
          },
          select: {
            id: true,
            kind: true,
            key: true,
            title: true,
            status: true,
            updated_at: true,
            spec_json: true,
          },
        });

        if (draft) {
          environment.activeDraft = {
            id: draft.id,
            kind: draft.kind,
            key: draft.key,
            title: draft.title,
            status: draft.status,
            updatedAt: draft.updated_at,
            points: summarizeDraftPointsForAgent(draft.spec_json),
          };
        }
      }
    } catch (error) {
      console.warn('[resolveAgentEnvironment] active draft lookup failed', { sessionId, domainId, userId, error });
    }
  }

  return environment;
}

