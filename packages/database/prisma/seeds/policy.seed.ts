import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_POLICY = {
  drafts: {
    enabled: true,
    userTriggers: ['draft', 'create a draft', 'save as draft'],
    autoDraft: {
      enabled: true,
      thresholds: { minSections: 3, minChars: 1200 },
      kinds: ['vehicle_template', 'journey_spec', 'keeper_type_proposal', 'checklist_spec'],
      behavior: 'create_then_confirm',
    },
  },
  actions: {
    allow: ['draft.create', 'draft.update', 'draft.list', 'draft.get', 'draft.read'],
  },
  entities: {
    drafts: { create: true, read: true, update: true, delete: false },
    keepers: { create: false, read: true, update: false, delete: false },
    journeys: { create: false, read: true, update: false, delete: false },
    moments: { create: false, read: true, update: false, delete: false },
  },
};

export default async function seedDomainPolicies() {
  const domains = await prisma.domain.findMany({ select: { id: true } });

  for (const domain of domains) {
    await prisma.domainPolicy.upsert({
      where: { domainId: domain.id },
      update: {
        version: 'policy-v1',
        policy: DEFAULT_POLICY,
        updatedAt: new Date(),
      },
      create: {
        domainId: domain.id,
        version: 'policy-v1',
        policy: DEFAULT_POLICY,
      },
    });
  }
}


