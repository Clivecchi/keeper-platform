import { DomainCacheService, DomainPermissionService, DomainService, prisma } from '@keeper/database';
import { DomainAuthManager } from '@keeper/kam';
import { getRedis, isNoOpRedis, type RedisClientOrNoOp } from '../../lib/redis.js';

export type AgentEnvironmentContext = {
  version: 'env-v1';
  domains: Array<{
    domainId: string;
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
  debug?: {
    resolvedBy: 'KAM';
    resolvedAt: string;
    injectedAt?: string;
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
  intent: 'interactive';
}): Promise<AgentEnvironmentContext> {
  const { agentId, userId, domainId } = args;

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

  return environment;
}

