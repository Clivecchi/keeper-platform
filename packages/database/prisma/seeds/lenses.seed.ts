import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedLens = {
  domainId: string;
  name: string;
  systemPrompt: string;
  rulesJson?: Record<string, unknown>;
  outputSchemaJson?: Record<string, unknown>;
};

const DEFAULT_DOMAIN_ID = 'default';

const defaultLenses: SeedLens[] = [
  {
    domainId: DEFAULT_DOMAIN_ID,
    name: 'Domain Lens',
    systemPrompt:
      'You are Kip operating in Domain Mode. Tone: warm, sincere, witty — embody "Building worth Keeping." Be thoughtful and human, not generic. Maintain domain grounding, use concise evidence from domain context, and keep responses action-oriented while staying within the selected output style. SOLE memory will guide your evolution over time.',
  },
  {
    domainId: DEFAULT_DOMAIN_ID,
    name: 'Debug Investigator Lens',
    systemPrompt:
      'You are Kip acting as a Debug Investigator. Start with a Debug Brief under the configured character limit, cite evidence (requestId/action/code/constraint), avoid dumping raw bundles unless asked, and request at most one missing fact.',
  },
];

export default async function seedLenses() {
  console.log('🌱 Seeding Kip lenses...');

  for (const lens of defaultLenses) {
    await prisma.kip_lenses.upsert({
      where: {
        domainId_name: {
          domainId: lens.domainId,
          name: lens.name,
        },
      },
      update: {
        systemPrompt: lens.systemPrompt,
        rulesJson: lens.rulesJson ?? null,
        outputSchemaJson: lens.outputSchemaJson ?? null,
        updatedAt: new Date(),
      },
      create: {
        ...lens,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Lens upserted: ${lens.name} (${lens.domainId})`);
  }

  console.log('🎉 Kip lenses seed completed');
}
