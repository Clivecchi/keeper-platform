#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function ensureKeeperType(name: string): Promise<string> {
  let keeperType = await prisma.keeperType.findFirst({
    where: { name }
  });

  if (!keeperType) {
    keeperType = await prisma.keeperType.create({
      data: {
        id: randomUUID(),
        name,
        system: true,
      }
    });
  }

  return keeperType.id;
}

export default async function seed() {
  console.log('🧭 Seeding Journey/Path/Moment Engagement Templates...');

  const journeyTypeId = await ensureKeeperType('Journey');
  const pathTypeId = await ensureKeeperType('Path');
  const momentTypeId = await ensureKeeperType('Moment');

  const templates = [
    {
      id: randomUUID(),
      slug: 'journey.create',
      label: 'Create Journey',
      type: 'form',
      targetType: 'domain',
      icon: 'map',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/journeys',
          method: 'POST',
          successMessage: 'Journey created successfully',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Journey Name',
          placeholder: 'Family Archive',
          order: 0,
          config: {
            required: true,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'forward',
          type: 'textarea',
          label: 'Forward',
          placeholder: 'What is this journey for?',
          order: 1,
          config: {
            required: true,
            minLength: 10,
            maxLength: 1000
          }
        },
        {
          id: randomUUID(),
          name: 'keeperId',
          type: 'text',
          label: 'Keeper ID',
          placeholder: 'keeper-id',
          order: 2,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'domainId',
          type: 'text',
          label: 'Domain ID',
          placeholder: 'domain-id',
          order: 3,
          config: {
            required: false
          }
        }
      ],
      keeperTypeId: journeyTypeId
    },
    {
      id: randomUUID(),
      slug: 'journey.addMoment',
      label: 'Add Moment to Journey',
      type: 'form',
      targetType: 'journey',
      icon: 'plus',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/journeys/:entityId/moments',
          method: 'POST',
          successMessage: 'Moment added to journey',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Moment Title',
          placeholder: 'A turning point',
          order: 0,
          config: {
            required: true,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'narrative',
          type: 'textarea',
          label: 'Narrative',
          placeholder: 'Capture what happened...',
          order: 1,
          config: {
            required: true,
            minLength: 10,
            maxLength: 2000
          }
        }
      ],
      keeperTypeId: journeyTypeId
    },
    {
      id: randomUUID(),
      slug: 'path.create',
      label: 'Create Path',
      type: 'form',
      targetType: 'journey',
      icon: 'route',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/paths',
          method: 'POST',
          successMessage: 'Path created successfully',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Path Name',
          placeholder: 'Winter rituals',
          order: 0,
          config: {
            required: true,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'prelude',
          type: 'textarea',
          label: 'Prelude',
          placeholder: 'What this path gathers...',
          order: 1,
          config: {
            maxLength: 1000
          }
        },
        {
          id: randomUUID(),
          name: 'domainId',
          type: 'text',
          label: 'Domain ID',
          placeholder: 'domain-id',
          order: 2,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'journeyId',
          type: 'text',
          label: 'Journey ID',
          placeholder: 'journey-id',
          order: 3,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'keeperId',
          type: 'text',
          label: 'Keeper ID',
          placeholder: 'keeper-id',
          order: 4,
          config: {
            required: true
          }
        }
      ],
      keeperTypeId: pathTypeId
    },
    {
      id: randomUUID(),
      slug: 'path.update',
      label: 'Update Path',
      type: 'form',
      targetType: 'path',
      icon: 'pencil',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/paths/:entityId',
          method: 'PUT',
          successMessage: 'Path updated successfully',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Path Name',
          placeholder: 'Path name',
          order: 0,
          config: {
            required: false,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'prelude',
          type: 'textarea',
          label: 'Prelude',
          placeholder: 'Path prelude',
          order: 1,
          config: {
            maxLength: 1000
          }
        }
      ],
      keeperTypeId: pathTypeId
    },
    {
      id: randomUUID(),
      slug: 'moment.create',
      label: 'Create Moment',
      type: 'form',
      targetType: 'journey',
      icon: 'sparkles',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/moments',
          method: 'POST',
          successMessage: 'Moment created successfully',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Moment Title',
          placeholder: 'A quiet decision',
          order: 0,
          config: {
            required: true,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'content',
          type: 'textarea',
          label: 'Narrative',
          placeholder: 'Capture the story...',
          order: 1,
          config: {
            required: true,
            minLength: 10,
            maxLength: 2000
          }
        },
        {
          id: randomUUID(),
          name: 'journeyId',
          type: 'text',
          label: 'Journey ID',
          placeholder: 'journey-id',
          order: 2,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'keeperId',
          type: 'text',
          label: 'Keeper ID',
          placeholder: 'keeper-id',
          order: 3,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'domainId',
          type: 'text',
          label: 'Domain ID',
          placeholder: 'domain-id',
          order: 4,
          config: {
            required: true
          }
        }
      ],
      keeperTypeId: momentTypeId
    },
    {
      id: randomUUID(),
      slug: 'moment.update',
      label: 'Update Moment',
      type: 'form',
      targetType: 'moment',
      icon: 'pencil',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/moments/:entityId',
          method: 'PUT',
          successMessage: 'Moment updated successfully',
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Moment Title',
          placeholder: 'Moment title',
          order: 0,
          config: {
            required: false,
            minLength: 2,
            maxLength: 200
          }
        },
        {
          id: randomUUID(),
          name: 'content',
          type: 'textarea',
          label: 'Narrative',
          placeholder: 'Update the story...',
          order: 1,
          config: {
            required: false,
            minLength: 10,
            maxLength: 2000
          }
        }
      ],
      keeperTypeId: momentTypeId
    }
  ];

  for (const templateData of templates) {
    const { fields, keeperTypeId, ...template } = templateData as any;

    const existing = await prisma.engagement_templates.findUnique({
      where: { slug: template.slug }
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
        }
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
            }
          });
        }
        console.log(`     - Added ${fields.length} fields`);
      }
    }

    const link = await prisma.keeper_type_engagement_templates.findUnique({
      where: {
        keeper_type_id_engagement_template_id: {
          keeper_type_id: keeperTypeId,
          engagement_template_id: templateId
        }
      }
    });

    if (!link) {
      await prisma.keeper_type_engagement_templates.create({
        data: {
          id: randomUUID(),
          keeper_type_id: keeperTypeId,
          engagement_template_id: templateId,
          created_at: new Date()
        }
      });
      console.log(`     - Linked to KeeperType`);
    }
  }

  console.log('\n✅ Journey/Path/Moment Engagement Templates seeded successfully!');
  console.log(`   - ${templates.length} templates created/verified`);
}
