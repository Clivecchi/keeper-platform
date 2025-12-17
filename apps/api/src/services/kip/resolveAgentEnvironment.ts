import { DomainCacheService, DomainPermissionService, DomainService, prisma } from '@keeper/database';
import { DomainAuthManager } from '@keeper/kam';
import { getRedis, isNoOpRedis, type RedisClientOrNoOp } from '../../lib/redis.js';

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
  activeDraft?: {
    id: string;
    kind: string;
    key: string;
    title: string;
    status: string;
    updatedAt: Date;
  };
  debug?: {
    resolvedBy: 'KAM';
    resolvedAt: string;
    injectedAt?: string;
    canary?: string;
  };
};

const redisClient: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redisClient);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const domainAuthManager = new DomainAuthManager(
  prisma,
  isNoOpRedis(redisClient) ? undefined : (redisClient as any)
);

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
  intent: 'interactive';
}): Promise<AgentEnvironmentContext> {
  const { agentId, userId, domainId, sessionId } = args;

  const resolvedAt = new Date().toISOString();
  const environment: AgentEnvironmentContext = {
    version: 'env-v1',
    domains: [],
    capabilities: {
      canDraft: false,
      canPromote: false,
    },
    debug: {
      resolvedBy: 'KAM',
      resolvedAt,
    },
  };

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
      accessibleDomains = await domainAuthManager.getAccessibleDomains(userId);
    } catch (error) {
      console.warn('[resolveAgentEnvironment] getAccessibleDomains failed', { userId, error });
    }
  }

  const accessibleMap = new Map(accessibleDomains.map((d) => [d.id, d]));
  let primaryDomainId = domainId || null;

  if (!primaryDomainId && accessibleDomains.length) {
    primaryDomainId = accessibleDomains[0].id;
  }

  if (primaryDomainId) {
    try {
      const domain = await domainService.getDomainById(primaryDomainId);
      const hasReadAccess = userId
        ? (await permissionService.checkPermission({
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

  if (sessionId) {
    try {
      const session = await prisma.kip_sessions.findUnique({
        where: { id: sessionId },
        select: { id: true, user_id: true, active_draft_id: true },
      });

      const ownsSession = !session?.user_id || (userId ? session.user_id === userId : false);

      if (session?.active_draft_id && ownsSession) {
        const draft = await prisma.kip_drafts.findFirst({
          where: {
            id: session.active_draft_id,
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
          };
        }
      }
    } catch (error) {
      console.warn('[resolveAgentEnvironment] active draft lookup failed', { sessionId, domainId, userId, error });
    }
  }

  return environment;
}

