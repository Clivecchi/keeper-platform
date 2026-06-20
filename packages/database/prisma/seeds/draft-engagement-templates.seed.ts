#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function ensureKeeperType(name: string): Promise<string> {
  let keeperType = await prisma.keeperType.findFirst({
    where: { name },
  });

  if (!keeperType) {
    keeperType = await prisma.keeperType.create({
      data: {
        id: randomUUID(),
        name,
        system: true,
      },
    });
  }

  return keeperType.id;
}

export default async function seed() {
  console.log('📝 Seeding Draft Engagement Templates...');

  const draftTypeId = await ensureKeeperType('Draft');

  const templates = [
    {
      id: randomUUID(),
      slug: 'draft.create',
      label: 'Create Draft',
      type: 'form',
      targetType: 'domain',
      icon: 'file-text',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/domains/:domainId/kip/drafts',
          method: 'POST',
          successMessage: 'Draft created successfully',
          errorMessages: {
            INVALID_DRAFT_PAYLOAD: 'Please provide a valid draft title.',
            FAILED_TO_CREATE_DRAFT: 'Could not create draft. Please try again.',
          },
        },
        requiresConfirmation: false,
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Draft Title',
          placeholder: 'My draft',
          order: 0,
          config: {
            required: true,
            minLength: 1,
            maxLength: 200,
          },
        },
        {
          id: randomUUID(),
          name: 'kind',
          type: 'text',
          label: 'Kind',
          placeholder: 'journey_spec',
          order: 1,
          config: {
            required: true,
          },
        },
        {
          id: randomUUID(),
          name: 'keeperId',
          type: 'text',
          label: 'Keeper ID',
          placeholder: 'keeper-id',
          order: 2,
          config: {
            required: false,
          },
        },
        {
          id: randomUUID(),
          name: 'dialogId',
          type: 'text',
          label: 'Dialog ID',
          placeholder: 'dialog-id',
          order: 3,
          config: {
            required: false,
          },
        },
      ],
      keeperTypeId: draftTypeId,
    },
  ];

  for (const templateData of templates) {
    const { fields, keeperTypeId, ...template } = templateData as any;

    const existing = await prisma.engagement_templates.findUnique({
      where: { slug: template.slug },
    });

    let templateId: string;

    if (existing) {
      console.log(`  ⏭️  Template "${template.label}" already exists, skipping...`);
      templateId = existing.id;
    } else {
      const created = await prisma.engagement_templates.create({
        data: {
          id: template.id,
          slug: template.slug,
          label: template.label,
          type: template.type,
          targetType: template.targetType,
          icon: template.icon,
          system: template.system,
          config: template.config as any,
          style: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      templateId = created.id;
      console.log(`  ✅ Created template: ${template.label}`);

      if (fields && fields.length > 0) {
        for (const field of fields) {
          await prisma.engagement_fields.create({
            data: {
              id: field.id,
              templateId,
              name: field.name,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder || null,
              order: field.order,
              config: field.config as any,
              createdAt: new Date(),
            },
          });
        }
        console.log(`     - Added ${fields.length} fields`);
      }
    }

    const link = await prisma.keeper_type_engagement_templates.findUnique({
      where: {
        keeper_type_id_engagement_template_id: {
          keeper_type_id: keeperTypeId,
          engagement_template_id: templateId,
        },
      },
    });

    if (!link) {
      await prisma.keeper_type_engagement_templates.create({
        data: {
          id: randomUUID(),
          keeper_type_id: keeperTypeId,
          engagement_template_id: templateId,
          created_at: new Date(),
        },
      });
      console.log('     - Linked to KeeperType');
    }
  }

  console.log('\n✅ Draft Engagement Templates seeded successfully!');
}
