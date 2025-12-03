import { PrismaClient, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import {
  CANONICAL_BOARD_SLUGS,
  type CanonicalBoardSlug,
} from '@keeper/shared/canonicalBoards.js';

type Visibility = 'public' | 'admin';

export interface SystemFrameDefinition {
  key: string;
  name: string;
  pattern: string;
  frameType?: string;
  order: number;
  visibility?: Visibility;
  layout?: Prisma.JsonValue;
  props: Prisma.JsonValue;
}

export interface SystemBoardDefinition {
  slug: CanonicalBoardSlug;
  name: string;
  description: string;
  tags: string[];
  frames: SystemFrameDefinition[];
}

type DefinitionMap = Record<CanonicalBoardSlug, SystemBoardDefinition>;

export const SYSTEM_BOARD_DEFINITIONS: DefinitionMap = {
  feed: {
    slug: 'feed',
    name: 'Your Story Feed',
    description: 'Moments, reflections, and gentle prompts to keep memories current.',
    tags: ['system', 'feed', 'index'],
    frames: [
      {
        key: 'feed.hero',
        name: 'Story Feed',
        pattern: 'moment_feed',
        frameType: 'media_card',
        order: 0,
        visibility: 'public',
        props: {
          header: {
            title: 'Your Story Feed',
            subtitle: 'Moments, memories, and reflections from your life',
            cta: { label: 'Add Your First Moment', href: '/keeper/new?mode=moment' },
          },
          heroMoment: {
            title: 'Golden Hour at the Lake',
            date: 'January 10, 2025',
            tags: ['nature', 'travel', 'memories'],
            description: 'A perfect moment capturing the beauty of nature at golden hour.',
            imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
            stats: { likes: 12, comments: 3, saves: 2 },
          },
          entries: [
            {
              id: 'growth-note',
              title: 'Thoughts on Growth',
              date: 'January 9, 2025',
              description: 'Every step forward is progress—even when it feels uncertain.',
              tags: ['growth', 'mindset'],
              stats: { likes: 5, comments: 1, saves: 0 },
              journeyLabel: 'Add to Journey',
            },
          ],
          tip: 'Ask Kip about creating Moments, linking Journeys, or reflecting on your Keepers.',
        },
      },
    ],
  },
  keepers: {
    slug: 'keepers',
    name: 'Keeper Index',
    description: 'Grid of personal and professional lifebooks.',
    tags: ['system', 'keeper_index'],
    frames: [
      {
        key: 'keepers.grid',
        name: 'Keeper Grid',
        pattern: 'keeper_index_grid',
        frameType: 'media_card',
        order: 0,
        visibility: 'public',
        props: {
          title: 'Keepers',
          subtitle: 'Your personal and professional lifebooks',
          cta: { label: 'Create Keeper', href: '/keeper/new' },
          keepers: [
            {
              id: 'family',
              title: 'My Family Story',
              category: 'Family',
              description: 'A collection of memories with loved ones, milestones, and everyday moments.',
              stats: { journeys: 3, moments: 24 },
              imageUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=1200&q=80',
            },
            {
              id: 'pool-company',
              title: 'Building the Pool Company',
              category: 'Professional',
              description: 'An entrepreneurial journey from startup to scaling—challenges, victories, and lessons.',
              stats: { journeys: 2, moments: 18 },
              imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
            },
            {
              id: 'travel',
              title: 'Travel Adventures',
              category: 'Personal',
              description: 'Documenting journeys around the world, cultural experiences, and new perspectives.',
              stats: { journeys: 4, moments: 32 },
              imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
            },
            {
              id: 'fitness',
              title: 'Fitness & Wellness',
              category: 'Personal',
              description: 'Tracking personal growth through health, workouts, and wellness milestones.',
              stats: { journeys: 1, moments: 12 },
              imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
            },
          ],
        },
      },
    ],
  },
  journeys: {
    slug: 'journeys',
    name: 'Journey Index',
    description: 'Showcases the journeys unfolding within a domain.',
    tags: ['system', 'journey_index'],
    frames: [
      {
        key: 'journeys.grid',
        name: 'Journey Grid',
        pattern: 'journey_index_grid',
        frameType: 'media_card',
        order: 0,
        visibility: 'public',
        props: {
          title: 'My Journeys',
          subtitle: 'Explore the meaningful stories unfolding in your life',
          journeys: [
            {
              id: 'building-company',
              title: 'Building The Pool Company',
              description: 'An entrepreneurial adventure filled with challenges, victories, and learning.',
              stats: { chapters: 3, moments: 12 },
              imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
            },
            {
              id: 'raising-family',
              title: 'Raising My Family',
              description: 'The most meaningful journey—documenting growth, milestones, and everyday magic.',
              stats: { chapters: 4, moments: 28 },
              imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80',
            },
            {
              id: 'fitness',
              title: 'Fitness & Wellness',
              description: 'A personal health journey tracking transformation, consistency, and growth.',
              stats: { chapters: 3, moments: 18 },
              imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
            },
          ],
        },
      },
    ],
  },
  profile: {
    slug: 'profile',
    name: 'Profile Board',
    description: 'Profile summary, stats, and quick access to preferences.',
    tags: ['system', 'profile'],
    frames: [
      {
        key: 'profile.header',
        name: 'Profile Header',
        pattern: 'profile_header',
        frameType: 'media_card',
        order: 0,
        visibility: 'public',
        props: {
          name: 'Your Name',
          tagline: "Documenting life's meaningful moments",
          memberSince: 'Member since January 2025',
          avatar: { initials: 'J', color: '#b65b46' },
          editLabel: 'Edit Profile',
        },
      },
      {
        key: 'profile.stats',
        name: 'Profile Stats',
        pattern: 'profile_stats',
        frameType: 'media_card',
        order: 1,
        visibility: 'public',
        props: {
          stats: [
            { label: 'Total Moments', value: 48, description: 'Captured memories' },
            { label: 'Journeys', value: 3, description: 'Stories in progress' },
            { label: 'Collections', value: 12, description: 'Curated sets' },
          ],
        },
      },
      {
        key: 'profile.journeys',
        name: 'Profile Journeys',
        pattern: 'profile_journey_list',
        frameType: 'media_card',
        order: 2,
        visibility: 'public',
        props: {
          title: 'Your Journeys',
          journeys: [
            { id: 'pool-company', title: 'Building The Pool Company', countLabel: '12 moments' },
            { id: 'family', title: 'Raising My Family', countLabel: '28 moments' },
            { id: 'fitness', title: 'Fitness Journey', countLabel: '8 moments' },
          ],
        },
      },
      {
        key: 'profile.settings',
        name: 'Profile Settings',
        pattern: 'profile_settings',
        frameType: 'media_card',
        order: 3,
        visibility: 'public',
        props: {
          title: 'Settings & Preferences',
          description: 'Manage your account and privacy',
          action: { label: 'Open Settings', href: '/root/profile' },
        },
      },
    ],
  },
  'kip-agent': {
    slug: 'kip-agent',
    name: 'Kip Agent Board',
    description: 'Dialog surface for Kip, the collaborative life coach.',
    tags: ['system', 'agent', 'dialog'],
    frames: [
      {
        key: 'kip.dialog',
        name: 'Dialog Frame',
        pattern: 'dialog_frame',
        frameType: 'dialog',
        order: 0,
        visibility: 'public',
        props: {
          agentName: 'Kip',
          subtitle: 'Your collaborative life coach',
          messages: [
            {
              id: 'intro',
              role: 'agent',
              content: "Hello. I'm here to help you reflect on your Keepers, Journeys, and moments. What's on your mind today?",
              timestamp: '10:27 PM',
            },
            {
              id: 'user',
              role: 'user',
              content: "I've been thinking about my career transition. It's exciting but also uncertain.",
              timestamp: '10:28 PM',
            },
            {
              id: 'follow-up',
              role: 'agent',
              content: 'Career transitions bring both growth and vulnerability. This sounds like something worth documenting.',
              timestamp: '10:28 PM',
            },
          ],
          suggestions: [
            {
              id: 'journey-card',
              title: 'Journey',
              label: 'Career Evolution',
              description: 'Track feelings and progress over time by linking this transition to a Journey.',
              actionLabel: 'Open Journey',
            },
            {
              id: 'tip-card',
              title: 'Tip',
              description: 'Ask about creating Moments, linking Journeys, or reflecting on your Keepers.',
            },
          ],
          inputPlaceholder: 'Share your thoughts, ask for guidance, or reflect…',
        },
      },
    ],
  },
};

function deterministicId(domainId: string, slug: CanonicalBoardSlug, key: string): string {
  const hash = createHash('sha1').update(`${domainId}:${slug}:${key}`).digest('hex');
  const chars = hash.slice(0, 32).split('');
  chars[12] = '4';
  const variant = parseInt(chars[16], 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${chars.slice(0, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}-${chars
    .slice(16, 20)
    .join('')}-${chars.slice(20, 32).join('')}`;
}

async function ensureFrameConfig(prisma: PrismaClient, slug: CanonicalBoardSlug, frameKey: string) {
  const name = `system-board:${slug}:${frameKey}`;
  const existing = await prisma.frameConfig.findFirst({ where: { name } });
  if (existing) return existing.id;
  const config = await prisma.frameConfig.create({
    data: {
      id: randomUUID(),
      name,
      description: `Config for ${slug}:${frameKey}`,
      theme: {},
      updatedAt: new Date(),
    },
  });
  return config.id;
}

export async function ensureCanonicalBoard(
  prisma: PrismaClient,
  domainId: string,
  slug: CanonicalBoardSlug,
) {
  const definition = SYSTEM_BOARD_DEFINITIONS[slug];
  if (!definition) {
    throw new Error(`Unknown canonical board slug: ${slug}`);
  }

  const includeFrames = {
    frames: {
      orderBy: { orderIndex: 'asc' },
    },
  } as const;

  let board = await prisma.board.findFirst({
    where: { domainId, slug },
    include: includeFrames,
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        id: randomUUID(),
        keeperId: domainId,
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        theme: {},
        behavior: { defaultPattern: 'canvas' },
        data: { scope: 'domain', entityId: domainId, canonicalSlug: slug },
        config: {},
        access: { visibility: 'private' },
        tags: definition.tags,
        viewerMode: 'member',
        isPublic: false,
        domainId,
      },
      include: includeFrames,
    });
  } else {
    const needsUpdate =
      board.name !== definition.name ||
      board.description !== definition.description ||
      JSON.stringify(board.tags ?? []) !== JSON.stringify(definition.tags);
    if (needsUpdate) {
      board = await prisma.board.update({
        where: { id: board.id },
        data: {
          name: definition.name,
          description: definition.description,
          tags: definition.tags,
          data: {
            ...(board.data as Prisma.JsonObject),
            canonicalSlug: slug,
            scope: 'domain',
            entityId: domainId,
          },
        },
        include: includeFrames,
      });
    }
  }

  const framesById = new Map(board.frames.map((frame) => [frame.id, frame]));

  for (const frameDef of definition.frames) {
    const frameId = deterministicId(domainId, slug, frameDef.key);
    const configId = await ensureFrameConfig(prisma, slug, frameDef.key);
    const baseData = {
      boardId: board.id,
      role: null,
      name: frameDef.name,
      pattern: frameDef.pattern,
      frameType: frameDef.frameType ?? 'media_card',
      orderIndex: frameDef.order,
      layoutKind: 'canvas',
      layoutData: frameDef.layout ?? {},
      props: frameDef.props as Prisma.InputJsonValue,
      entityType: 'domain',
      entityId: domainId,
      configId,
      visibility: frameDef.visibility ?? 'public',
      updatedAt: new Date(),
    };

    if (framesById.has(frameId)) {
      await prisma.frameInstance.update({
        where: { id: frameId },
        data: baseData,
      });
    } else {
      await prisma.frameInstance.create({
        data: {
          id: frameId,
          ...baseData,
        },
      });
    }
  }

  return prisma.board.findFirst({
    where: { domainId, slug },
    include: includeFrames,
  });
}

export async function ensureAllCanonicalBoards(prisma: PrismaClient, domainId: string) {
  for (const slug of CANONICAL_BOARD_SLUGS) {
    await ensureCanonicalBoard(prisma, domainId, slug);
  }
}


