#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * Domain Engagement Templates Seed
 * Creates 6 engagement templates for the Domain KeeperType
 */

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
  console.log('🎨 Seeding Domain Engagement Templates...');

  const domainTypeId = await ensureKeeperType('Domain');

  const templates = [
    // ==========================================================================
    // 1. PUBLIC CONTACT
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.public.contact',
      label: 'Contact Domain',
      type: 'form',
      targetType: 'domain',
      icon: 'envelope',
      system: true,
      config: {
        visibility: 'public',
        action: {
          endpoint: '/api/domains/:domainId/contact',
          method: 'POST',
          successMessage: 'Message sent! We\'ll get back to you soon.',
          errorMessages: {
            'RATE_LIMIT': 'Too many messages. Please try again later.',
            'INVALID_EMAIL': 'Please provide a valid email address.'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Your Name',
          placeholder: 'John Doe',
          order: 0,
          config: {
            required: true,
            minLength: 2,
            maxLength: 100
          }
        },
        {
          id: randomUUID(),
          name: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'john@example.com',
          order: 1,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'message',
          type: 'textarea',
          label: 'Message',
          placeholder: 'Your message...',
          order: 2,
          config: {
            required: true,
            minLength: 10,
            maxLength: 1000
          }
        }
      ]
    },

    // ==========================================================================
    // 2. ADMIN UPDATE
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.admin.update',
      label: 'Update Domain Info',
      type: 'form',
      targetType: 'domain',
      icon: 'pencil',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/domains/:domainId',
          method: 'PATCH',
          successMessage: 'Domain updated successfully',
          errorMessages: {
            'SLUG_EXISTS': 'That slug is already taken',
            'INVALID_SLUG': 'Slug must contain only lowercase letters, numbers, and hyphens'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Domain Name',
          placeholder: 'My Domain',
          order: 0,
          config: {
            required: true,
            minLength: 1,
            maxLength: 100,
            dataSource: 'domain.name'
          }
        },
        {
          id: randomUUID(),
          name: 'slug',
          type: 'text',
          label: 'Domain Slug',
          placeholder: 'my-domain',
          order: 1,
          config: {
            required: true,
            pattern: '^[a-z0-9-]+$',
            message: 'Slug must contain only lowercase letters, numbers, and hyphens',
            dataSource: 'domain.slug'
          }
        },
        {
          id: randomUUID(),
          name: 'description',
          type: 'textarea',
          label: 'Description',
          placeholder: 'Describe your domain...',
          order: 2,
          config: {
            maxLength: 500,
            dataSource: 'domain.description'
          }
        }
      ]
    },

    // ==========================================================================
    // 3. VERIFY DOMAIN
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.admin.verify',
      label: 'Verify Domain',
      type: 'action',
      targetType: 'domain',
      icon: 'check-circle',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/domains/:domainId/custom-domain/verify',
          method: 'POST',
          successMessage: 'Domain verified successfully!',
          errorMessages: {
            'DNS_NOT_CONFIGURED': 'DNS records not configured properly. Please check nameservers.',
            'VERIFICATION_FAILED': 'Verification failed. DNS may need more time to propagate (up to 48h).',
            'NO_CUSTOM_DOMAIN': 'No custom domain configured'
          }
        },
        requiresConfirmation: true
      },
      fields: [] // No inputs needed
    },

    // ==========================================================================
    // 4. ADD CUSTOM DOMAIN
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.admin.addCustomDomain',
      label: 'Add Custom Domain',
      type: 'form',
      targetType: 'domain',
      icon: 'globe',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/domains/:domainId/custom-domain',
          method: 'POST',
          successMessage: 'Custom domain added. Configure your DNS with the provided records.',
          errorMessages: {
            'DOMAIN_EXISTS': 'This domain is already registered',
            'INVALID_DOMAIN': 'Invalid domain format',
            'VERCEL_ERROR': 'Failed to add domain to Vercel. Please check configuration.'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'customDomain',
          type: 'text',
          label: 'Custom Domain',
          placeholder: 'yourdomain.com',
          order: 0,
          config: {
            required: true,
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]*\\.[a-zA-Z]{2,}$',
            message: 'Must be a valid domain (e.g., example.com)'
          }
        }
      ]
    },

    // ==========================================================================
    // 5. EDIT API KEY
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.admin.editApiKey',
      label: 'Edit API Key',
      type: 'form',
      targetType: 'domain',
      icon: 'key',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/kip/user-keys',
          method: 'POST',
          successMessage: 'API key saved successfully',
          errorMessages: {
            'INVALID_KEY': 'Invalid API key format',
            'PROVIDER_ERROR': 'Failed to validate key with provider'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'provider',
          type: 'select',
          label: 'Provider',
          placeholder: 'Select provider',
          order: 0,
          config: {
            required: true,
            options: [
              { value: 'openai', label: 'OpenAI' },
              { value: 'anthropic', label: 'Anthropic' },
              { value: 'together', label: 'Together AI' },
              { value: 'elevenlabs', label: 'ElevenLabs' }
            ]
          }
        },
        {
          id: randomUUID(),
          name: 'apiKey',
          type: 'password',
          label: 'API Key',
          placeholder: 'sk-...',
          order: 1,
          config: {
            required: true,
            minLength: 10
          }
        }
      ]
    },

    // ==========================================================================
    // 6. ASSIGN AGENT
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.admin.assignAgent',
      label: 'Assign Primary Agent',
      type: 'form',
      targetType: 'domain',
      icon: 'robot',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/domains/:domainId',
          method: 'PATCH',
          body: {
            settings: {
              primaryAgentId: ':agentId'
            }
          },
          successMessage: 'Primary agent assigned successfully',
          errorMessages: {
            'AGENT_NOT_FOUND': 'Agent not found'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'agentId',
          type: 'select',
          label: 'Select Agent',
          placeholder: 'Choose an agent',
          order: 0,
          config: {
            required: true,
            dataSource: '/api/kip/agents',
            displayField: 'name',
            valueField: 'id'
          }
        }
      ]
    }
  ];

  // Create templates and their fields
  for (const templateData of templates) {
    const { fields, ...template } = templateData;

    // Check if template already exists
    const existing = await prisma.engagement_templates.findUnique({
      where: { slug: template.slug }
    });

    let templateId: string;

    if (existing) {
      console.log(`  ⏭️  Template "${template.label}" already exists, skipping...`);
      templateId = existing.id;
    } else {
      // Create template
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

      // Create fields
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

    // Link to Domain KeeperType
    const link = await prisma.keeper_type_engagement_templates.findUnique({
      where: {
        keeper_type_id_engagement_template_id: {
          keeper_type_id: domainTypeId,
          engagement_template_id: templateId
        }
      }
    });

    if (!link) {
      await prisma.keeper_type_engagement_templates.create({
        data: {
          id: randomUUID(),
          keeper_type_id: domainTypeId,
          engagement_template_id: templateId,
          created_at: new Date()
        }
      });
      console.log(`     - Linked to Domain KeeperType`);
    }
  }

  console.log('\n✅ Domain Engagement Templates seeded successfully!');
  console.log(`   - ${templates.length} templates created/verified`);
  console.log(`   - All linked to Domain KeeperType`);
}

