import { randomUUID, createHash } from 'crypto';
import { PrismaClient } from '@keeper/database';

type FrameKey =
  | 'domain.summary'
  | 'domain.users'
  | 'domain.permissions'
  | 'domain.custom-domains'
  | 'domain.dns-status'
  | 'domain.theme'
  | 'domain.activity';

const BOARD_TYPE = 'domain-home';

function uuidV5Like(namespace: string, name: string): string {
  // Deterministic UUID v4-shaped from sha1 hash (not standard v5, but stable)
  const hash = createHash('sha1').update(`${namespace}:${name}`).digest('hex');
  // Force version 4 nibble and variant bits to make it UUID-like
  const chars = hash.slice(0, 32).split('');
  chars[12] = '4';
  const variant = parseInt(chars[16], 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${chars.slice(0, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}-${chars.slice(16, 20).join('')}-${chars.slice(20, 32).join('')}`;
}

function deterministicFrameId(domainId: string, frameKey: FrameKey): string {
  return uuidV5Like(domainId, frameKey);
}

function defaultPropsFor(frameKey: FrameKey, domainId: string, boardId: string) {
  switch (frameKey) {
    case 'domain.summary':
      return { title: 'Domain Summary', domainId, showStats: true };
    case 'domain.users':
      return { title: 'Users', domainId, allowInvite: true };
    case 'domain.permissions':
      return { title: 'Permissions', domainId };
    case 'domain.custom-domains':
      return { title: 'Custom Domains', domainId };
    case 'domain.dns-status':
      return { title: 'DNS Status', domainId };
    case 'domain.theme':
      return { title: 'Theme', domainId };
    case 'domain.activity':
      return { title: 'Activity', domainId };
    default:
      return { domainId, boardId };
  }
}

const FRAME_SPECS: Array<{ key: FrameKey; name: string; pattern: string; frameType: string; orderIndex: number }>
  = [
    { key: 'domain.summary', name: 'Summary', pattern: 'focus', frameType: 'preview', orderIndex: 0 },
    { key: 'domain.users', name: 'Users', pattern: 'canvas', frameType: 'media_card', orderIndex: 1 },
    { key: 'domain.permissions', name: 'Permissions', pattern: 'form', frameType: 'config_panel', orderIndex: 2 },
    { key: 'domain.custom-domains', name: 'Custom Domains', pattern: 'focus', frameType: 'preview', orderIndex: 3 },
    { key: 'domain.dns-status', name: 'DNS Status', pattern: 'focus', frameType: 'preview', orderIndex: 4 },
    { key: 'domain.theme', name: 'Theme', pattern: 'form', frameType: 'config_panel', orderIndex: 5 },
    // Optional
    { key: 'domain.activity', name: 'Activity', pattern: 'canvas', frameType: 'media_card', orderIndex: 6 },
  ];

export async function ensureDomainManagementBoard(client: PrismaClient, domainId: string) {
  const includeBoard = {
    frames: {
      orderBy: { orderIndex: 'asc' },
      include: { FrameConfig: true },
    },
  } as const;

  // 1) Ensure board exists and is unique per (domainId, boardType)
  let board = await client.board.findFirst({ where: { domainId, boardType: BOARD_TYPE }, include: includeBoard });

  if (!board) {
    // Create minimal frame configs up-front to reference
    const coverCfg = await client.frameConfig.findFirst({ where: { name: 'cover-default' } })
      || await client.frameConfig.create({ data: { id: randomUUID(), name: 'cover-default', description: 'Default cover', theme: {} } });
    const settingsCfg = await client.frameConfig.findFirst({ where: { name: 'settings-default' } })
      || await client.frameConfig.create({ data: { id: randomUUID(), name: 'settings-default', description: 'Default settings', theme: {} } });

    // Derive a stable slug
    const safeSlug = `domain-${domainId.slice(0, 8)}-home`;

    try {
      board = await client.board.create({
        data: {
          id: randomUUID(),
          keeperId: domainId, // temporary association for listing; can be actual owner later
          name: 'Domain Management Board',
          slug: safeSlug,
          description: 'Management board for this domain',
          behavior: { defaultPattern: 'canvas', startFrameId: null },
          data: { scope: 'domain', entityId: domainId, frames: [], layoutPrefs: {} },
          access: { visibility: 'private' },
          domainId,
          boardType: BOARD_TYPE,
          updatedAt: new Date(),
        },
        include: includeBoard,
      });

      // Seed cover + settings
      await client.frameInstance.createMany({
        data: [
          {
            id: randomUUID(),
            boardId: board.id,
            role: 'cover',
            name: 'Cover',
            pattern: 'focus',
            frameType: 'media_card',
            orderIndex: 0,
            layoutKind: 'focus',
            layoutData: {},
            props: { title: board.name, subtitle: 'Manage your domain', media: null, alignment: 'center' },
            entityType: 'domain',
            entityId: domainId,
            configId: coverCfg.id,
            updatedAt: new Date(),
          },
          {
            id: randomUUID(),
            boardId: board.id,
            role: 'settings',
            name: 'Settings',
            pattern: 'form',
            frameType: 'config_panel',
            orderIndex: 1,
            layoutKind: 'row',
            layoutData: {},
            props: { domainId },
            entityType: 'domain',
            entityId: domainId,
            configId: settingsCfg.id,
            updatedAt: new Date(),
          },
        ],
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique (domainId, boardType) or (keeperId, slug) conflict — fetch the existing
        board = await client.board.findFirst({ where: { domainId, boardType: BOARD_TYPE }, include: includeBoard })
          || await client.board.findFirst({ where: { keeperId: domainId, slug: safeSlug }, include: includeBoard });
      } else {
        throw e;
      }
    }
  }

  // 2) Idempotently upsert deterministic frames
  if (!board) throw new Error('Failed to resolve domain management board');

  const byId = new Map((board.frames || []).map(f => [f.id, f] as const));

  for (const spec of FRAME_SPECS) {
    const id = deterministicFrameId(domainId, spec.key);
    const exists = byId.get(id);
    const cfgName = `${spec.key}-default`;

    const cfg = await client.frameConfig.findFirst({ where: { name: cfgName } })
      || await client.frameConfig.create({ data: { id: randomUUID(), name: cfgName, description: `Default for ${spec.key}`, theme: {} } });

    if (!exists) {
      await client.frameInstance.create({
        data: {
          id,
          boardId: board.id,
          role: null,
          name: spec.name,
          pattern: spec.pattern,
          frameType: spec.frameType,
          orderIndex: 2 + spec.orderIndex, // after cover(0) and settings(1)
          layoutKind: spec.pattern === 'focus' ? 'focus' : (spec.pattern === 'form' ? 'row' : 'canvas'),
          layoutData: {},
          props: defaultPropsFor(spec.key, domainId, board.id),
          entityType: 'domain',
          entityId: domainId,
          configId: cfg.id,
          updatedAt: new Date(),
        }
      });
    } else {
      // Keep existing; ensure props contain identity fields
      const existingProps = (exists.props as any) || {};
      const required = defaultPropsFor(spec.key, domainId, board.id);
      const merged = { ...required, ...existingProps };
      await client.frameInstance.update({ where: { id }, data: { props: merged, updatedAt: new Date() } });
    }
  }

  // Reload and return
  const full = await client.board.findUnique({ where: { id: board.id }, include: includeBoard });
  if (!full) throw new Error('Failed to load domain management board');
  return full;
}


