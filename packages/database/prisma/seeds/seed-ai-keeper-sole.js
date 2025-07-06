import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AI SOLE Keeper...');

  // Insert the AI SOLE KeeperType
  const keeperType = await prisma.keeperType.upsert({
    where: { id: 'ai-keeper-sole' },
    update: {
      name: 'AI SOLE Keeper',
      memoryPattern: 'SOLE',
      system: true,
    },
    create: {
      id: 'ai-keeper-sole',
      name: 'AI SOLE Keeper',
      memoryPattern: 'SOLE',
      system: true,
    },
  });

  console.log('✅ KeeperType created:', keeperType.id);

  // Insert engagement templates for SOLE memory interface
  const templates = [
    {
      label: 'Reflection Journal',
      slug: 'reflection_journal',
      type: 'memory',
      targetType: 'keeper',
      icon: 'journal',
      system: true,
    },
    {
      label: 'MemoryCard Generator',
      slug: 'memorycard_generator',
      type: 'memory',
      targetType: 'keeper',
      icon: 'card',
      system: true,
    },
    {
      label: 'Voice Panel',
      slug: 'voice_panel',
      type: 'identity',
      targetType: 'keeper',
      icon: 'microphone',
      system: true,
    },
    {
      label: 'Echo Writer',
      slug: 'echo_writer',
      type: 'memory',
      targetType: 'keeper',
      icon: 'edit',
      system: true,
    },
    {
      label: 'Identity Logbook',
      slug: 'identity_logbook',
      type: 'timeline',
      targetType: 'keeper',
      icon: 'book',
      system: true,
    },
  ];

  console.log('🎯 Creating engagement templates...');

  for (const template of templates) {
    const engagementTemplate = await prisma.engagement_templates.upsert({
      where: { slug: template.slug },
      update: {
        label: template.label,
        type: template.type,
        targetType: template.targetType,
        icon: template.icon,
        style: {},
        config: {},
        system: template.system,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        label: template.label,
        slug: template.slug,
        type: template.type,
        targetType: template.targetType,
        icon: template.icon,
        style: {},
        config: {},
        system: template.system,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Engagement template created: ${engagementTemplate.slug}`);
  }

  // Link engagement templates to the ai-keeper-sole KeeperType
  console.log('🔗 Linking engagement templates to KeeperType...');

  const templateSlugs = [
    'reflection_journal',
    'memorycard_generator', 
    'voice_panel',
    'echo_writer',
    'identity_logbook'
  ];

  for (const slug of templateSlugs) {
    // Find the template by slug
    const template = await prisma.engagement_templates.findUnique({
      where: { slug: slug }
    });

    if (template) {
      // Link template to KeeperType (using upsert to avoid duplicates)
      await prisma.keeper_type_engagement_templates.upsert({
        where: {
          keeper_type_id_engagement_template_id: {
            keeper_type_id: 'ai-keeper-sole',
            engagement_template_id: template.id
          }
        },
        update: {}, // No update needed if exists
        create: {
          keeper_type_id: 'ai-keeper-sole',
          engagement_template_id: template.id
        }
      });

      console.log(`✅ Linked template: ${slug} to ai-keeper-sole`);
    } else {
      console.warn(`⚠️ Template not found: ${slug}`);
    }
  }

  console.log('🎉 AI SOLE Keeper seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding AI SOLE Keeper:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 