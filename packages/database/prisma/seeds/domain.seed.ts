import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Inlined from apps/web/src/v0/data/domain-frame.default.ts
// Shape: DomainFrameJson · Keeper JsonFrame Spec v0.1 · March 2026
// Do not modify the shape here — change domain-frame.default.ts first, then sync.
const DEFAULT_DOMAIN_FRAME_JSON = {
  domain: 'default',
  keeper_type: 'platform',
  theme: {
    wordmark: 'KE3P',
    tagline: 'cryptically designed, wonderfully underfolded',
    background: '/images/keeper-dawn.jpg',
    colors: {
      primary: '#2d6a7f',
      accent: '#b8963e',
      surface: '#fdfaf4',
    },
    fonts: {
      display: 'Cormorant Garamond',
      ui: 'Outfit',
    },
  },
  kip: {
    agent_id: 'kip-default',
    model: 'claude-sonnet-4-6',
    visibility: 'public',
    greeting: 'Hello. What would you like to keep today?',
  },
  audience_roles: ['guest', 'keeper', 'admin'],
  cover: {
    slide_type: 'domain_cover',
    card: {
      type: 'journey_invitation',
      available_to: ['guest', 'keeper', 'admin'],
    },
  },
  forward: {
    label: 'Forward',
    destination: 'journey/default',
    available_to: ['guest', 'keeper', 'admin'],
  },
  directions: [
    {
      label: 'Journeys',
      frame: 'journeys',
      available_to: ['keeper', 'admin'],
    },
    {
      label: 'Sign In',
      action: 'auth.signin',
      available_to: ['guest'],
    },
  ],
  kip_context: {
    guest: 'A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.',
    keeper: 'An authenticated keeper. Orient to their journeys and moments.',
    admin: 'Platform admin. Full context available.',
  },
  interaction_bar: {
    primary: 'forward',
    secondary: ['kip'],
    auth: {
      guest: ['sign_in'],
      keeper: [],
      admin: ['settings'],
    },
  },
};

export default async function seedDomain() {
  const hostname = process.env.FALLBACK_DOMAIN ?? 'www.ke3p.com';
  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'seed@ke3p.com';

  // Find or create owner user
  let owner = await prisma.users.findUnique({ where: { email: ownerEmail } }).catch(() => null);
  if (!owner) {
    owner = await prisma.users.create({
      data: {
        id: randomUUID(),
        email: ownerEmail,
        name: 'Seed Owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Ensure a single platform domain exists
  const existing = await prisma.domain.findFirst({
    where: {
      OR: [
        { customDomain: hostname },
        { name: 'Platform' },
        { slug: 'platform' },
      ],
    },
  });

  if (!existing) {
    await prisma.domain.create({
      data: {
        id: randomUUID(),
        name: 'Platform',
        slug: 'platform',
        customDomain: hostname,
        customDomainVerified: true,
        status: 'active',
        isActive: true,
        ownerId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        features: {},
        settings: {},
      },
    });
    // Also set as primaryDomain if missing
    await prisma.users.update({ where: { id: owner.id }, data: { primaryDomainId: undefined } }).catch(() => {});
  }

  // Ensure the 'default' domain exists.
  // frame_json is only set on CREATE — never overwritten on UPDATE.
  // Once the domain exists, frame_json is owned by the Designer Board and Kip.
  // Overwriting it here would wipe any JSON authored via the platform.
  await prisma.domain.upsert({
    where: { slug: 'default' },
    update: {
      // Intentionally no frame_json here — preserve whatever is in the database.
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      name: 'Default',
      slug: 'default',
      status: 'active',
      isActive: true,
      isPublic: true,
      ownerId: owner.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      features: {},
      settings: {},
      frame_json: DEFAULT_DOMAIN_FRAME_JSON,
    },
  });
}


