#!/usr/bin/env tsx

/**
 * Add Manifesto Frame to Existing Domain Boards
 * 
 * This script adds "The Clean Surface Doctrine" manifesto frame
 * to all existing domain boards that don't already have it.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function addManifestoFrame() {
  console.log('📝 Adding Manifesto Frame to Domain Boards...');

  try {
    // Find all domain boards (both templates and instances)
    const domainBoards = await prisma.board.findMany({
      where: {
        OR: [
          { slug: { contains: 'domain' } },
          { name: { contains: 'Domain' } },
        ],
      },
      include: {
        frames: {
          where: {
            name: 'The Clean Surface Doctrine'
          }
        }
      }
    });

    console.log(`Found ${domainBoards.length} domain board(s)`);

    for (const board of domainBoards) {
      // Skip if manifesto frame already exists
      if (board.frames.length > 0) {
        console.log(`  ⏭️  Board "${board.name}" already has manifesto frame, skipping...`);
        continue;
      }

      console.log(`  ➕ Adding manifesto frame to "${board.name}"...`);

      // Get or create frame config
      let frameConfig = await prisma.frameConfig.findFirst({
        where: { name: 'manifesto-frame-config' }
      });

      if (!frameConfig) {
        frameConfig = await prisma.frameConfig.create({
          data: {
            id: randomUUID(),
            name: 'manifesto-frame-config',
            description: 'Config for manifesto frames',
            theme: {},
            updatedAt: new Date(),
          }
        });
      }

      // Create the manifesto frame
      await prisma.frameInstance.create({
        data: {
          id: randomUUID(),
          boardId: board.id,
          entityType: 'board',
          entityId: board.id,
          configId: frameConfig.id,
          name: 'The Clean Surface Doctrine',
          pattern: 'focus',
          frameType: 'media_card',
          orderIndex: 1, // After cover (0), before other frames
          layoutKind: 'canvas',
          layoutData: { x: 0, y: 4, w: 12, h: 6 },
          visibility: 'public',
          props: [
            {
              id: 'clean-surface-manifesto',
              type: 'manifesto',
              config: {
                title: 'The Clean Surface Doctrine',
                kicker: 'Keeper Design Manifesto',
                quote: 'If the surface isn\'t calm, the depth can\'t be seen.',
                content: 'Keeper exists to preserve what\'s worthy of effort. Every screen, panel, and interaction must serve that mission. When the interface feels like administration instead of creation, we lose the spirit of what we\'re building. The Clean Surface Doctrine keeps us honest — to ensure everything we design reflects calm, clarity, and creative dignity.\n\nClarity is sacred. Every surface should feel worth keeping. Build only what serves creation. Emotionally clean equals functionally clear. Kip should feel present, not panels. Preserve creative dignity. These are our design laws.\n\nTo build worth keeping, we must first design worth keeping — surfaces that honor the soul of creation, not the noise of control.',
                cta: {
                  label: 'Read Full Doctrine',
                  href: '/manifestos/clean-surface-doctrine'
                },
                themeVariant: 'system'
              },
              orderIndex: 0
            }
          ]
        }
      });

      console.log(`  ✅ Manifesto frame added to "${board.name}"`);
    }

    console.log('✅ Manifesto frames added successfully!');
  } catch (error) {
    console.error('❌ Error adding manifesto frames:', error);
    throw error;
  }
}

addManifestoFrame()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

