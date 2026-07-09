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
  console.log('🧩 Seeding Keeper/Dialog/Agent Create Engagement Templates...');

  const keeperTypeId = await ensureKeeperType('Keeper');
  const dialogTypeId = await ensureKeeperType('Dialog');
  const agentTypeId = await ensureKeeperType('Agent');

  const templates = [
    {
      id: randomUUID(),
      slug: 'keeper.create',
      label: 'Create Keeper',
      type: 'form',
      targetType: 'domain',
      icon: 'shield',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/keepers',
          method: 'POST',
          successMessage: 'Keeper created successfully',
        },
        requiresConfirmation: false,
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Keeper Name',
          placeholder: 'Family Archive Keeper',
          order: 0,
          config: {
            required: true,
            minLength: 1,
            maxLength: 200,
          },
        },
        {
          id: randomUUID(),
          name: 'purpose',
          type: 'textarea',
          label: 'Purpose',
          placeholder: 'What does this keeper hold and protect?',
          order: 1,
          config: {
            required: true,
            minLength: 1,
            maxLength: 1000,
          },
        },
        {
          id: randomUUID(),
          name: 'domainId',
          type: 'text',
          label: 'Domain ID',
          placeholder: 'domain-id',
          order: 2,
          config: {
            required: true,
          },
        },
      ],
      keeperTypeId: keeperTypeId,
    },
    {
      id: randomUUID(),
      slug: 'dialog.create',
      label: 'Create Dialog',
      type: 'form',
      targetType: 'domain',
      icon: 'message-square',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/domains/:domainId/kip/dialogs',
          method: 'POST',
          successMessage: 'Dialog created successfully',
          body: {
            title: ':title',
            available_to: ['admin'],
            context: {
              board: 'domain',
              frame: '',
              subject: '',
            },
          },
        },
        requiresConfirmation: false,
      },
      fields: [
        {
          id: randomUUID(),
          name: 'title',
          type: 'text',
          label: 'Dialog Title',
          placeholder: 'Planning session',
          order: 0,
          config: {
            required: true,
            minLength: 1,
            maxLength: 200,
          },
        },
      ],
      keeperTypeId: dialogTypeId,
    },
    {
      id: randomUUID(),
      slug: 'agent.create',
      label: 'Create Agent',
      type: 'form',
      targetType: 'domain',
      icon: 'bot',
      system: true,
      config: {
        visibility: 'member',
        action: {
          endpoint: '/api/kip/agents',
          method: 'POST',
          successMessage: 'Agent created successfully',
          body: {
            name: ':name',
            slug: ':slug',
            purpose: ':purpose',
            model: ':model',
            model_provider: ':model_provider',
            role: ':role',
            status: 'ready',
            visibility: 'private',
            memory_enabled: false,
            tools: [],
            permissions: [],
            config: {},
            model_settings: {},
          },
        },
        requiresConfirmation: false,
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Agent Name',
          placeholder: 'Research Assistant',
          order: 0,
          config: {
            required: true,
            minLength: 1,
            maxLength: 100,
          },
        },
        {
          id: randomUUID(),
          name: 'slug',
          type: 'text',
          label: 'Slug',
          placeholder: 'research-assistant',
          order: 1,
          config: {
            required: true,
            minLength: 1,
            maxLength: 50,
            pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
            message: 'Use lowercase letters, numbers, and hyphens only',
          },
        },
        {
          id: randomUUID(),
          name: 'purpose',
          type: 'textarea',
          label: 'Purpose',
          placeholder: 'What is this agent for?',
          order: 2,
          config: {
            required: true,
            minLength: 1,
            maxLength: 500,
          },
        },
        {
          id: randomUUID(),
          name: 'model',
          type: 'text',
          label: 'Model',
          placeholder: 'claude-sonnet-4-6',
          order: 3,
          config: {
            required: true,
          },
        },
        {
          id: randomUUID(),
          name: 'model_provider',
          type: 'select',
          label: 'Model Provider',
          placeholder: 'anthropic',
          order: 4,
          config: {
            required: true,
            options: [
              { value: 'anthropic', label: 'Anthropic' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'together-ai', label: 'Together AI' },
            ],
          },
        },
        {
          id: randomUUID(),
          name: 'role',
          type: 'select',
          label: 'Agent Class',
          placeholder: 'Lead',
          order: 5,
          config: {
            required: true,
            options: [
              { value: 'Lead', label: 'Lead — appears as domain agent on Agent Board' },
              { value: 'Standard', label: 'Standard' },
            ],
          },
        },
      ],
      keeperTypeId: agentTypeId,
    },
  ];

  for (const templateData of templates) {
    const { fields, keeperTypeId: typeId, ...template } = templateData as {
      fields: Array<{
        id: string;
        name: string;
        type: string;
        label: string;
        placeholder?: string;
        order: number;
        config: Record<string, unknown>;
      }>;
      keeperTypeId: string;
      id: string;
      slug: string;
      label: string;
      type: string;
      targetType: string;
      icon: string;
      system: boolean;
      config: Record<string, unknown>;
    };

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
          config: template.config as object,
          style: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      templateId = created.id;
      console.log(`  ✅ Created template: ${template.label}`);

      if (fields.length > 0) {
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
              config: field.config as object,
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
          keeper_type_id: typeId,
          engagement_template_id: templateId,
        },
      },
    });

    if (!link) {
      await prisma.keeper_type_engagement_templates.create({
        data: {
          id: randomUUID(),
          keeper_type_id: typeId,
          engagement_template_id: templateId,
          created_at: new Date(),
        },
      });
      console.log('     - Linked to KeeperType');
    }
  }

  console.log('\n✅ Entity create engagement templates seeded successfully!');
}
