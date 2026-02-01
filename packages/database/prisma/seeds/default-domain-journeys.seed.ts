#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

type SeedDomain = {
  id: string;
  ownerId: string;
  slug: string;
};

async function ensureSeedOwner(): Promise<{ id: string; email: string }> {
  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'seed@ke3p.com';
  const existing = await prisma.users.findUnique({ where: { email: ownerEmail } }).catch(() => null);
  if (existing) {
    return { id: existing.id, email: ownerEmail };
  }
  const created = await prisma.users.create({
    data: {
      id: randomUUID(),
      email: ownerEmail,
      name: 'Seed Owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { id: created.id, email: ownerEmail };
}

async function ensureDefaultDomain(): Promise<SeedDomain> {
  const owner = await ensureSeedOwner();
  const existing = await prisma.domain.findUnique({ where: { slug: 'default' } }).catch(() => null);
  if (existing) {
    return { id: existing.id, ownerId: existing.ownerId, slug: existing.slug };
  }

  const created = await prisma.domain.create({
    data: {
      id: randomUUID(),
      name: 'Default',
      slug: 'default',
      status: 'active',
      isActive: true,
      ownerId: owner.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      features: {},
      settings: {},
    },
  });

  return { id: created.id, ownerId: created.ownerId, slug: created.slug };
}

async function resolveThemeId(): Promise<string | null> {
  const theme = await prisma.themes.findFirst({
    where: { slug: 'default-keeper-theme' },
    select: { id: true },
  });
  if (theme?.id) return theme.id;
  const fallback = await prisma.themes.findFirst({ select: { id: true } });
  return fallback?.id ?? null;
}

export default async function seedDefaultJourneys() {
  console.log('🧭 Seeding default domain journeys...');

  const domain = await ensureDefaultDomain();
  const themeId = await resolveThemeId();

  const keeperStoryId = 'keeper-story-default';
  const keeperDevId = 'keeper-dev-default';

  await prisma.keeper.upsert({
    where: { id: keeperStoryId },
    update: {
      title: 'Keeper Origin Stories',
      purpose: 'Captures the narrative journey of building the Keeper Platform.',
      domainId: domain.id,
      theme_id: themeId ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      id: keeperStoryId,
      title: 'Keeper Origin Stories',
      purpose: 'Captures the narrative journey of building the Keeper Platform.',
      ownerId: domain.ownerId,
      domainId: domain.id,
      keeperType: 'StoryKeeper',
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.keeper.upsert({
    where: { id: keeperDevId },
    update: {
      title: 'Platform Development Keeper',
      purpose: 'Tracks the development and evolution of the Keeper Platform.',
      domainId: domain.id,
      theme_id: themeId ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      id: keeperDevId,
      title: 'Platform Development Keeper',
      purpose: 'Tracks the development and evolution of the Keeper Platform.',
      ownerId: domain.ownerId,
      domainId: domain.id,
      keeperType: 'DevKeeper',
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const journeyBeginId = 'journey-begin-again-default';
  const journeyPlatformId = 'journey-platform-evolution-default';
  const journeyThirdId = 'journey-keeper-heart-default';

  await prisma.journey.upsert({
    where: { id: journeyBeginId },
    update: {
      name: 'Begin... Again;',
      forward:
        'Every ending is a beginning. This journey captures the moments where we decide to continue, to build, to keep what matters.',
      domainId: domain.id,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      id: journeyBeginId,
      name: 'Begin... Again;',
      forward:
        'Every ending is a beginning. This journey captures the moments where we decide to continue, to build, to keep what matters.',
      ownerId: domain.ownerId,
      domainId: domain.id,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.journey.upsert({
    where: { id: journeyPlatformId },
    update: {
      name: 'Platform Evolution',
      forward:
        'From concept to reality, tracking the technical and philosophical evolution of Keeper Platform.',
      domainId: domain.id,
      keeperId: keeperDevId,
      theme_id: themeId ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      id: journeyPlatformId,
      name: 'Platform Evolution',
      forward:
        'From concept to reality, tracking the technical and philosophical evolution of Keeper Platform.',
      ownerId: domain.ownerId,
      domainId: domain.id,
      keeperId: keeperDevId,
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.journey.upsert({
    where: { id: journeyThirdId },
    update: {
      name: 'Keeper Heart & Mind',
      forward:
        'Tracing the narrative and architectural intent behind Keeper’s heart and mind.',
      domainId: domain.id,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      id: journeyThirdId,
      name: 'Keeper Heart & Mind',
      forward:
        'Tracing the narrative and architectural intent behind Keeper’s heart and mind.',
      ownerId: domain.ownerId,
      domainId: domain.id,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const pathRoadId = 'path-the-road-default';
  const pathSparkId = 'path-first-spark-default';
  const pathFoundationId = 'path-technical-foundation-default';

  await prisma.path.upsert({
    where: { id: pathRoadId },
    update: {
      name: 'The Road',
      prelude:
        'A path well-worn, yet full of promise. Every step forward is both familiar and new.',
      journeyId: journeyBeginId,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
    },
    create: {
      id: pathRoadId,
      name: 'The Road',
      prelude:
        'A path well-worn, yet full of promise. Every step forward is both familiar and new.',
      ownerId: domain.ownerId,
      journeyId: journeyBeginId,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
    },
  });

  await prisma.path.upsert({
    where: { id: pathSparkId },
    update: {
      name: 'First Spark',
      prelude: 'The idea that caught fire and refused to fade.',
      journeyId: journeyBeginId,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
    },
    create: {
      id: pathSparkId,
      name: 'First Spark',
      prelude: 'The idea that caught fire and refused to fade.',
      ownerId: domain.ownerId,
      journeyId: journeyBeginId,
      keeperId: keeperStoryId,
      theme_id: themeId ?? undefined,
    },
  });

  await prisma.path.upsert({
    where: { id: pathFoundationId },
    update: {
      name: 'Technical Foundation',
      prelude: 'Building the infrastructure that supports the long arc.',
      journeyId: journeyPlatformId,
      keeperId: keeperDevId,
      theme_id: themeId ?? undefined,
    },
    create: {
      id: pathFoundationId,
      name: 'Technical Foundation',
      prelude: 'Building the infrastructure that supports the long arc.',
      ownerId: domain.ownerId,
      journeyId: journeyPlatformId,
      keeperId: keeperDevId,
      theme_id: themeId ?? undefined,
    },
  });

  await prisma.moment.create({
    data: {
      id: randomUUID(),
      title: 'Walking the Road',
      narrative:
        'Standing at the crossroads, we choose to walk forward with intention.',
      pathId: pathRoadId,
      journeyId: journeyBeginId,
      ownerId: domain.ownerId,
      domainId: domain.id,
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }).catch(() => null);

  await prisma.moment.create({
    data: {
      id: randomUUID(),
      title: 'Foundation Set',
      narrative:
        'The first stable layer is laid. The rest can now rise with clarity.',
      pathId: pathFoundationId,
      journeyId: journeyPlatformId,
      ownerId: domain.ownerId,
      domainId: domain.id,
      theme_id: themeId ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }).catch(() => null);

  console.log('✅ Default domain journeys seeded.');
}
