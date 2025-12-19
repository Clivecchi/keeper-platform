import { PrismaClient, DomainPermissionService, DomainCacheService, DomainService } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../../lib/redis.js';
import { loadDomainPolicy, resolvePolicyPackV1 } from '../../policy/domainPolicyService.js';
import { DEFAULT_POLICY_PACK_V1, DEFAULT_POLICY_VERSION, type PolicyPackV1, type ActionPack, buildActionPack } from '../../policy/policyPack.js';

export type KipEnvironmentContext = {
  version: 'kip-env-v1';
  domain: { id: string; slug?: string | null; name?: string | null };
  actor: { userId: string; profileId?: string | null; roles?: string[] };
  ui: {
    focus: {
      boardId?: string;
      keeperId?: string;
      journeyId?: string;
      pathId?: string;
    };
    activeBoard?: { id: string; type?: string | null; title?: string | null } | null;
    activeKeeper?: { id: string; title?: string | null; keeperTypeKey?: string | null } | null;
  };
  registry: {
    keeperTypes: Array<{ id: string; key: string; label?: string | null }>;
    momentTypes: Array<{ id: string; key: string; label?: string | null }>;
    boardTypes: Array<{ id: string; key: string; label?: string | null }>;
    frameTypes: Array<{ key: string; label?: string | null }>;
    propTypes: Array<{ key: string; label?: string | null }>;
  };
  capabilities: {
    canDraft: boolean;
    canPromote: boolean;
    canWriteProduction: boolean;
  };
  actionPack: ActionPack;
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
  };
};

const prisma = new PrismaClient();
const redis: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const DRAFT_DIRECTORY_LIMIT = 25;

const FRAME_TYPE_REGISTRY: KipEnvironmentContext['registry']['frameTypes'] = [
  { key: 'media_card', label: 'Media Card' },
  { key: 'preview', label: 'Preview' },
  { key: 'dialog', label: 'Dialog' },
  { key: 'config_panel', label: 'Config Panel' },
  { key: 'process_frame', label: 'Process Frame' },
];

export async function buildKipEnvironmentContext(args: {
  domainId: string;
  userId: string;
  sessionId?: string;
  focus?: {
    boardId?: string;
    keeperId?: string;
    journeyId?: string;
    pathId?: string;
  };
}): Promise<KipEnvironmentContext> {
  const { domainId, userId, focus, sessionId } = args;

  const environment: KipEnvironmentContext = {
    version: 'kip-env-v1',
    domain: { id: domainId, slug: null, name: null },
    actor: { userId, profileId: null, roles: [] },
    ui: {
      focus: focus ?? {},
      activeBoard: null,
      activeKeeper: null,
    },
    registry: {
      keeperTypes: [],
      momentTypes: [],
      boardTypes: [],
      frameTypes: FRAME_TYPE_REGISTRY,
      propTypes: [],
    },
    capabilities: {
      canDraft: true,
      canPromote: false,
      canWriteProduction: false,
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
  };

  try {
    const domain = await domainService.getDomainById(domainId);
    if (domain) {
      environment.domain.slug = domain.slug ?? null;
      environment.domain.name = domain.name ?? null;

      if (domain.ownerId === userId && !environment.actor.roles?.includes('owner')) {
        environment.actor.roles?.push('owner');
      }
    }
  } catch (error) {
    console.warn('[kip:environment] domain lookup failed', { domainId, error });
  }

  try {
    environment.policy = await loadDomainPolicy(domainId);
  } catch (error) {
    console.warn('[kip:environment] policy lookup failed, using default', { domainId, error });
    environment.policy = {
      version: DEFAULT_POLICY_VERSION,
      policy: DEFAULT_POLICY_PACK_V1,
      updatedAt: null,
      source: 'default',
    };
  }

  try {
    environment.policyPack = await resolvePolicyPackV1({ domainId, userId });
    environment.actionPack = buildActionPack(environment.policyPack.actions.allow ?? []);
  } catch (error) {
    console.warn('[kip:environment] policyPack resolution failed, using default', { domainId, error });
  }

  try {
    const permission = await permissionService.checkPermission({
      userId,
      domainId,
      permission: 'read',
    });

    if (permission.role) {
      const currentRoles = new Set(environment.actor.roles ?? []);
      currentRoles.add(permission.role);
      environment.actor.roles = Array.from(currentRoles);
    }
  } catch (error) {
    console.warn('[kip:environment] permission lookup failed', { domainId, userId, error });
  }

  if (focus?.boardId) {
    try {
      const board = await prisma.board.findUnique({
        where: { id: focus.boardId },
        select: { id: true, boardType: true, name: true, domainId: true },
      });

      if (board && (!board.domainId || board.domainId === domainId)) {
        environment.ui.activeBoard = {
          id: board.id,
          type: board.boardType ?? null,
          title: board.name ?? null,
        };
      }
    } catch (error) {
      console.warn('[kip:environment] board lookup failed', { boardId: focus.boardId, error });
    }
  }

  if (focus?.keeperId) {
    try {
      const keeper = await prisma.keeper.findUnique({
        where: { id: focus.keeperId },
        select: {
          id: true,
          title: true,
          keeperType: true,
          domainId: true,
          KeeperType: { select: { id: true, name: true } },
        },
      });

      if (keeper && (!keeper.domainId || keeper.domainId === domainId)) {
        environment.ui.activeKeeper = {
          id: keeper.id,
          title: keeper.title ?? null,
          keeperTypeKey: keeper.KeeperType?.name ?? keeper.keeperType ?? null,
        };
      }
    } catch (error) {
      console.warn('[kip:environment] keeper lookup failed', { keeperId: focus.keeperId, error });
    }
  }

  if (sessionId) {
    try {
      const session = await prisma.kip_sessions.findUnique({
        where: { id: sessionId },
        select: { id: true, user_id: true, active_draft_id: true },
      });

      if (session && session.active_draft_id && (!session.user_id || session.user_id === userId)) {
        const draft = await prisma.kip_drafts.findFirst({
          where: {
            id: session.active_draft_id,
            domain_id: domainId,
            owner_id: userId,
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
      console.warn('[kip:environment] active draft lookup failed', { sessionId, domainId, userId, error });
    }
  }

  try {
    if (userId) {
      const drafts = await prisma.kip_drafts.findMany({
        where: { domain_id: domainId, owner_id: userId },
        select: {
          id: true,
          kind: true,
          key: true,
          title: true,
          status: true,
          updated_at: true,
        },
        orderBy: { updated_at: 'desc' },
        take: DRAFT_DIRECTORY_LIMIT,
      });

      environment.draftsDirectory = drafts.map((draft) => ({
        id: draft.id,
        kind: draft.kind,
        key: draft.key,
        title: draft.title,
        status: draft.status,
        updatedAt: draft.updated_at,
      }));
    }
  } catch (error) {
    console.warn('[kip:environment] drafts directory lookup failed', { domainId, userId, error });
  }

  try {
    const keeperTypes = await prisma.keeperType.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    environment.registry.keeperTypes = keeperTypes.map((type) => ({
      id: type.id,
      key: type.name,
      label: type.name,
    }));
  } catch (error) {
    console.warn('[kip:environment] keeper types lookup failed', { error });
  }

  try {
    const boardTypes = await prisma.board.findMany({
      where: { domainId },
      select: { boardType: true },
      distinct: ['boardType'],
    });

    environment.registry.boardTypes = boardTypes
      .map((entry) => entry.boardType)
      .filter((key): key is string => Boolean(key))
      .map((key) => ({ id: key, key, label: key }));
  } catch (error) {
    console.warn('[kip:environment] board types lookup failed', { domainId, error });
  }

  // Moment types and prop types are not yet modeled; keep stable empty arrays.

  return environment;
}

