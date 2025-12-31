#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * Domain Board Management Engagement Templates Seed
 * Creates 6 engagement templates for Domain Board operations
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
  console.log('🎨 Seeding Domain Board Management Engagement Templates...');

  const domainTypeId = await ensureKeeperType('Domain');

  const templates = [
    // ==========================================================================
    // 1. SET VIEWER MODE
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.setViewerMode',
      label: 'Set Board Viewer Mode',
      type: 'action',
      targetType: 'board',
      icon: 'eye',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/:boardId/viewer-mode',
          method: 'PATCH',
          successMessage: 'Viewer mode updated successfully',
          errorMessages: {
            'INVALID_MODE': 'Invalid viewer mode specified',
            'ACCESS_DENIED': 'You do not have permission to modify this board'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'boardId',
          type: 'text',
          label: 'Board ID',
          placeholder: 'UUID of the board',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'mode',
          type: 'select',
          label: 'Viewer Mode',
          placeholder: 'Select viewer mode',
          order: 1,
          config: {
            required: true,
            options: [
              { value: 'public', label: 'Public' },
              { value: 'member', label: 'Member' },
              { value: 'editor', label: 'Editor' }
            ]
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 2,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 3,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      ]
    },

    // ==========================================================================
    // 2. ADD FRAME
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.addFrame',
      label: 'Add Board Frame',
      type: 'form',
      targetType: 'board',
      icon: 'plus-square',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/:boardId/frames',
          method: 'POST',
          successMessage: 'Frame added successfully',
          errorMessages: {
            'INVALID_PATTERN': 'Invalid frame pattern specified',
            'ACCESS_DENIED': 'You do not have permission to modify this board'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'boardId',
          type: 'text',
          label: 'Board ID',
          placeholder: 'UUID of the board',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'pattern',
          type: 'text',
          label: 'Frame Pattern',
          placeholder: 'e.g., dialogic, wizard',
          order: 1,
          config: {
            required: true,
            minLength: 1
          }
        },
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'Frame Name',
          placeholder: 'e.g., Cover Frame',
          order: 2,
          config: {
            required: true,
            minLength: 1
          }
        },
        {
          id: randomUUID(),
          name: 'index',
          type: 'number',
          label: 'Index (optional)',
          placeholder: '0',
          order: 3,
          config: {
            required: false,
            min: 0
          }
        },
        {
          id: randomUUID(),
          name: 'props',
          type: 'textarea',
          label: 'Props (JSON)',
          placeholder: '{}',
          order: 4,
          config: {
            required: false
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 5,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 6,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      ]
    },

    // ==========================================================================
    // 3. UPDATE FRAME
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.updateFrame',
      label: 'Update Board Frame',
      type: 'form',
      targetType: 'frame',
      icon: 'edit',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/frames/:frameId',
          method: 'PATCH',
          successMessage: 'Frame updated successfully',
          errorMessages: {
            'FRAME_NOT_FOUND': 'Frame not found',
            'INVALID_PATCH': 'Invalid patch data',
            'ACCESS_DENIED': 'You do not have permission to modify this frame'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'frameId',
          type: 'text',
          label: 'Frame ID',
          placeholder: 'UUID of the frame',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'patch',
          type: 'textarea',
          label: 'Patch Data (JSON)',
          placeholder: '{"name": "Updated Frame Name"}',
          order: 1,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 2,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 3,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      ]
    },

    // ==========================================================================
    // 4. SET COVER
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.setCover',
      label: 'Set Board Cover',
      type: 'form',
      targetType: 'board',
      icon: 'image',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/:boardId/cover',
          method: 'POST',
          successMessage: 'Cover image set successfully',
          errorMessages: {
            'UPLOAD_FAILED': 'Failed to upload cover image',
            'INVALID_FORMAT': 'Invalid image format',
            'ACCESS_DENIED': 'You do not have permission to modify this board'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'boardId',
          type: 'text',
          label: 'Board ID',
          placeholder: 'UUID of the board',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'mime',
          type: 'text',
          label: 'MIME Type',
          placeholder: 'image/png',
          order: 1,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'name',
          type: 'text',
          label: 'File Name',
          placeholder: 'cover.png',
          order: 2,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'bytesBase64',
          type: 'textarea',
          label: 'Base64 Image Data',
          placeholder: 'Base64 encoded image...',
          order: 3,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 4,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 5,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      ]
    },

    // ==========================================================================
    // 5. UPSERT PATHWAY NAV
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.upsertPathwayNav',
      label: 'Upsert Pathway Navigation',
      type: 'form',
      targetType: 'board',
      icon: 'navigation',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/:boardId/nav',
          method: 'PUT',
          successMessage: 'Navigation updated successfully',
          errorMessages: {
            'INVALID_NAV': 'Invalid navigation structure',
            'ACCESS_DENIED': 'You do not have permission to modify this board'
          }
        },
        requiresConfirmation: false
      },
      fields: [
        {
          id: randomUUID(),
          name: 'boardId',
          type: 'text',
          label: 'Board ID',
          placeholder: 'UUID of the board',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'items',
          type: 'textarea',
          label: 'Navigation Items (JSON)',
          placeholder: '[{"label": "Home", "href": "/", "icon": "home"}]',
          order: 1,
          config: {
            required: true
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 2,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 3,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      ]
    },

    // ==========================================================================
    // 6. PUBLISH BOARD
    // ==========================================================================
    {
      id: randomUUID(),
      slug: 'domain.board.publish',
      label: 'Publish/Unpublish Board',
      type: 'action',
      targetType: 'board',
      icon: 'globe',
      system: true,
      config: {
        visibility: 'admin',
        action: {
          endpoint: '/api/boards/:boardId/publish',
          method: 'PATCH',
          successMessage: 'Board publish status updated',
          errorMessages: {
            'ACCESS_DENIED': 'You do not have permission to modify this board'
          }
        },
        requiresConfirmation: true
      },
      fields: [
        {
          id: randomUUID(),
          name: 'boardId',
          type: 'text',
          label: 'Board ID',
          placeholder: 'UUID of the board',
          order: 0,
          config: {
            required: true,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        },
        {
          id: randomUUID(),
          name: 'isPublic',
          type: 'checkbox',
          label: 'Make Public',
          placeholder: null,
          order: 1,
          config: {
            required: true,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'dryRun',
          type: 'checkbox',
          label: 'Dry Run',
          placeholder: null,
          order: 2,
          config: {
            required: false,
            defaultValue: false
          }
        },
        {
          id: randomUUID(),
          name: 'requestId',
          type: 'text',
          label: 'Request ID (optional)',
          placeholder: 'UUID for idempotency',
          order: 3,
          config: {
            required: false,
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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

  console.log('\n✅ Domain Board Management Engagement Templates seeded successfully!');
  console.log(`   - ${templates.length} templates created/verified`);
  console.log(`   - All linked to Domain KeeperType`);
}

// Execute seed if running directly
seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

