import { randomUUID } from 'crypto';
import type { Prisma, PrismaClient } from '@keeper/database';
import { defaultDomainSettingsForCreate, domainFrameLooksUnseeded } from '@keeper/shared';
import { ensureDomainHomeBoard } from '../boards/domainManagement.js';
import { buildInitialDomainFrameJson } from './buildInitialDomainFrameJson.js';
import { DEFAULT_DOMAIN_THEME_PRIMARY } from './domainFrameFallback.js';

const DEFAULT_LEAD_MODEL = 'claude-sonnet-4-6';
const DEFAULT_KEEPER_TYPE = 'DomainKeeper';

export interface ProvisionDomainOnCreateInput {
  domain: Pick<
    Prisma.DomainGetPayload<Record<string, never>>,
    'id' | 'name' | 'slug' | 'description' | 'ownerId' | 'settings' | 'theme' | 'frame_json'
  >;
}

export interface ProvisionDomainOnCreateResult {
  domain: Prisma.DomainGetPayload<Record<string, never>>;
  keeperId: string | null;
  leadAgentId: string | null;
  leadAgentSlug: string | null;
  frameWritten: boolean;
  frameAgentSynced: boolean;
}

function isEmptyJson(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0)
  );
}

function leadAgentSlugForDomain(domainSlug: string): string {
  const base = `${domainSlug.trim()}-lead`.slice(0, 48);
  return base.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'domain-lead';
}

const PLACEHOLDER_LEAD_AGENT_SLUGS = new Set(['kip', 'kip-default']);

/** Custom lead slug from frame_json, excluding platform placeholders. */
function readFrameLeadAgentSlug(frame: Record<string, unknown> | null): string | null {
  const kip = frame?.kip;
  if (!kip || typeof kip !== 'object') return null;
  const raw = (kip as Record<string, unknown>).agent_id;
  if (typeof raw !== 'string') return null;
  const slug = raw.trim();
  if (!slug || PLACEHOLDER_LEAD_AGENT_SLUGS.has(slug)) return null;
  return slug;
}

function patchFrameLeadAgentSlug(
  frame: Record<string, unknown>,
  leadAgentSlug: string,
): Record<string, unknown> {
  const kip =
    frame.kip && typeof frame.kip === 'object'
      ? { ...(frame.kip as Record<string, unknown>) }
      : {};
  return {
    ...frame,
    kip: {
      ...kip,
      agent_id: leadAgentSlug,
    },
  };
}

async function createDomainLeadAgent(
  prisma: PrismaClient,
  input: {
    name: string;
    slug: string;
    description?: string | null;
    ownerId: string;
    /** When frame_json references a specific slug, create that row exactly. */
    preferredSlug?: string | null;
  },
): Promise<{ id: string; slug: string } | null> {
  let agentSlug = input.preferredSlug?.trim() || leadAgentSlugForDomain(input.slug);
  const purpose =
    input.description?.trim() ||
    `Lead agent for ${input.name.trim()} — guides keepers in this domain.`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await prisma.kip_agents.findUnique({
      where: { slug: agentSlug },
      select: { id: true, slug: true },
    });
    if (existing) {
      return existing;
    }

    try {
      const created = await prisma.kip_agents.create({
        data: {
          slug: agentSlug,
          name: input.name.trim(),
          purpose,
          model: DEFAULT_LEAD_MODEL,
          model_provider: 'anthropic',
          role: 'Lead',
          context_scope: input.slug,
          memory_enabled: true,
          tools: [],
          permissions: [],
          capabilities: [],
          status: 'ready',
          visibility: 'private',
          created_by: input.ownerId,
          config: {
            domain_slug: input.slug,
            personality: `Domain lead for ${input.name.trim()}. Warm, clear, and oriented to this domain's purpose.`,
          },
        },
        select: { id: true, slug: true },
      });
      return created;
    } catch (error) {
      const isUnique =
        error instanceof Error && error.message.toLowerCase().includes('unique');
      if (!isUnique || attempt >= 2) {
        console.warn('[provisionDomain] Failed to create domain lead agent:', error);
        return null;
      }
      agentSlug = `${agentSlug}-${randomUUID().slice(0, 6)}`.slice(0, 48);
    }
  }

  return null;
}

/**
 * Idempotent provisioning for personal domains:
 * frame_json, domain lead agent, default keeper, primaryDomainId, home board.
 */
export async function provisionDomainOnCreate(
  prisma: PrismaClient,
  { domain }: ProvisionDomainOnCreateInput,
): Promise<ProvisionDomainOnCreateResult> {
  const existingSettings =
    domain.settings && typeof domain.settings === 'object' && !Array.isArray(domain.settings)
      ? (domain.settings as Record<string, unknown>)
      : {};

  const existingPrimaryAgentId =
    typeof existingSettings.primaryAgentId === 'string' ? existingSettings.primaryAgentId : null;

  const existingFrame =
    domain.frame_json && typeof domain.frame_json === 'object' && !Array.isArray(domain.frame_json)
      ? (domain.frame_json as Record<string, unknown>)
      : null;

  const frameLeadSlug = readFrameLeadAgentSlug(existingFrame);

  let leadAgentId: string | null = null;
  let leadAgentSlug: string | null = null;

  // frame_json agent_id wins — repair when the row is missing (common on older domains).
  if (frameLeadSlug) {
    const frameLead = await prisma.kip_agents.findUnique({
      where: { slug: frameLeadSlug },
      select: { id: true, slug: true },
    });
    if (frameLead) {
      leadAgentId = frameLead.id;
      leadAgentSlug = frameLead.slug;
    } else {
      const created = await createDomainLeadAgent(prisma, {
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        ownerId: domain.ownerId,
        preferredSlug: frameLeadSlug,
      });
      if (created) {
        leadAgentId = created.id;
        leadAgentSlug = created.slug;
      }
    }
  }

  if (!leadAgentId && existingPrimaryAgentId) {
    const settingsLead = await prisma.kip_agents.findUnique({
      where: { id: existingPrimaryAgentId },
      select: { id: true, slug: true },
    });
    if (settingsLead) {
      leadAgentId = settingsLead.id;
      leadAgentSlug = settingsLead.slug;
    }
  }

  if (!leadAgentId) {
    const leadAgent = await createDomainLeadAgent(prisma, {
      name: domain.name,
      slug: domain.slug,
      description: domain.description,
      ownerId: domain.ownerId,
    });

    if (leadAgent) {
      leadAgentId = leadAgent.id;
      leadAgentSlug = leadAgent.slug;
    } else {
      const kip = await prisma.kip_agents.findFirst({
        where: { slug: 'kip' },
        select: { id: true, slug: true },
      });
      if (kip) {
        leadAgentId = kip.id;
        leadAgentSlug = kip.slug;
      }
    }
  }

  if (!leadAgentSlug && leadAgentId) {
    const resolved = await prisma.kip_agents.findUnique({
      where: { id: leadAgentId },
      select: { slug: true },
    });
    leadAgentSlug = resolved?.slug ?? 'kip';
  }

  const needsFrame =
    isEmptyJson(domain.frame_json) ||
    domainFrameLooksUnseeded(existingFrame ?? {}, domain.slug, domain.name);

  let frameJson: Record<string, unknown> | null = needsFrame
    ? buildInitialDomainFrameJson({
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        leadAgentSlug: leadAgentSlug ?? 'kip',
      })
    : null;

  let frameAgentSynced = false;
  if (!frameJson && existingFrame && leadAgentSlug) {
    const currentAgentId =
      existingFrame.kip &&
      typeof existingFrame.kip === 'object' &&
      typeof (existingFrame.kip as Record<string, unknown>).agent_id === 'string'
        ? ((existingFrame.kip as Record<string, unknown>).agent_id as string).trim()
        : '';
    if (currentAgentId !== leadAgentSlug) {
      frameJson = patchFrameLeadAgentSlug(existingFrame, leadAgentSlug);
      frameAgentSynced = true;
    }
  }

  const mergedSettings = defaultDomainSettingsForCreate({
    ...existingSettings,
    ...(leadAgentId ? { primaryAgentId: leadAgentId } : {}),
    ...(typeof existingSettings.keeperTypeKey !== 'string'
      ? { keeperTypeKey: DEFAULT_KEEPER_TYPE }
      : {}),
  });

  const existingTheme =
    domain.theme && typeof domain.theme === 'object' && !Array.isArray(domain.theme)
      ? (domain.theme as Record<string, unknown>)
      : {};

  const themeColors =
    existingTheme.colors && typeof existingTheme.colors === 'object'
      ? (existingTheme.colors as Record<string, unknown>)
      : {};

  const mergedTheme = {
    ...existingTheme,
    colors: {
      ...themeColors,
      primary: typeof themeColors.primary === 'string' ? themeColors.primary : DEFAULT_DOMAIN_THEME_PRIMARY,
    },
  };

  await prisma.domain.update({
    where: { id: domain.id },
    data: {
      ...(frameJson ? { frame_json: frameJson as Prisma.InputJsonValue } : {}),
      settings: mergedSettings as Prisma.InputJsonValue,
      theme: mergedTheme as Prisma.InputJsonValue,
    },
  });

  let keeperId: string | null = null;
  try {
    const existingKeeper = await prisma.keeper.findFirst({
      where: { domainId: domain.id, ownerId: domain.ownerId },
      select: { id: true },
    });

    if (existingKeeper) {
      keeperId = existingKeeper.id;
    } else {
      const keeper = await prisma.keeper.create({
        data: {
          id: `keeper-${domain.id}`,
          title: domain.name.trim(),
          purpose:
            domain.description?.trim() ||
            `Default keeper for ${domain.name.trim()}.`,
          ownerId: domain.ownerId,
          domainId: domain.id,
          keeperType: DEFAULT_KEEPER_TYPE,
        },
        select: { id: true },
      });
      keeperId = keeper.id;
    }
  } catch (error) {
    console.warn('[provisionDomain] Failed to create default keeper:', error);
  }

  try {
    const owner = await prisma.users.findUnique({
      where: { id: domain.ownerId },
      select: { primaryDomainId: true },
    });
    if (!owner?.primaryDomainId) {
      await prisma.users.update({
        where: { id: domain.ownerId },
        data: { primaryDomainId: domain.id },
      });
    }
  } catch (error) {
    console.warn('[provisionDomain] Failed to set primaryDomainId:', error);
  }

  try {
    await ensureDomainHomeBoard(prisma as Parameters<typeof ensureDomainHomeBoard>[0], domain.id);
  } catch (error) {
    console.warn('[provisionDomain] Failed to ensure domain home board:', error);
  }

  const updatedDomain = await prisma.domain.findUniqueOrThrow({ where: { id: domain.id } });

  return {
    domain: updatedDomain,
    keeperId,
    leadAgentId,
    leadAgentSlug,
    frameWritten: frameJson !== null,
    frameAgentSynced,
  };
}

/**
 * Repair a missing domain lead agent row referenced by frame_json or slug lookup.
 * Used by GET /api/kip/agents?slug= when production drift left frame ahead of kip_agents.
 */
export async function ensureDomainLeadAgentBySlug(
  prisma: PrismaClient,
  agentSlug: string,
): Promise<{ id: string; slug: string } | null> {
  const trimmed = agentSlug.trim();
  if (!trimmed) return null;

  const existing = await prisma.kip_agents.findUnique({
    where: { slug: trimmed },
    select: { id: true, slug: true },
  });
  if (existing) return existing;

  const domainSlugCandidates = new Set<string>();
  if (trimmed.endsWith('-lead')) {
    domainSlugCandidates.add(trimmed.slice(0, -'-lead'.length));
  }
  domainSlugCandidates.add(trimmed);

  for (const domainSlug of domainSlugCandidates) {
    if (!domainSlug) continue;
    const domain = await prisma.domain.findFirst({
      where: { slug: domainSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ownerId: true,
        frame_json: true,
      },
    });
    if (!domain) continue;

    const frameLead = readFrameLeadAgentSlug(
      domain.frame_json as Record<string, unknown> | null,
    );
    const preferredSlug =
      frameLead && (frameLead === trimmed || !frameLead.endsWith('-lead'))
        ? frameLead
        : trimmed;

    const created = await createDomainLeadAgent(prisma, {
      name: domain.name,
      slug: domain.slug,
      description: domain.description,
      ownerId: domain.ownerId,
      preferredSlug,
    });
    if (created) return created;
  }

  return null;
}
