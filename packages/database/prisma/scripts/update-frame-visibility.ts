#!/usr/bin/env tsx
/**
 * Update Frame Visibility Script
 * Updates existing FrameInstance records to have proper visibility values
 * Run this against production to fix frames that were created before visibility column existed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating frame visibility values...\n');

  try {
    // Find the Domain Design Board template
    const template = await prisma.board.findFirst({
      where: {
        name: 'Domain Design Board',
        isTemplate: true
      },
      include: {
        frames: true
      }
    });

    if (!template) {
      console.log('❌ Domain Design Board template not found');
      console.log('   Run the seed first: pnpm run seed');
      return;
    }

    console.log(`✅ Found template: ${template.name} (${template.id})`);
    console.log(`   Frames: ${template.frames.length}\n`);

    if (template.frames.length === 0) {
      console.log('⚠️  No frames found. Run seed to create frames.');
      return;
    }

    let updatedCount = 0;

    // Update each frame based on name
    for (const frame of template.frames) {
      let targetVisibility = 'admin'; // Default

      // Board Cover (or Hero, Cover, Identity) should be public
      // Match: "Cover", "Board Cover", "Hero", "Hero / Identity"
      const nameLower = frame.name.toLowerCase();
      if (nameLower === 'cover' ||
          nameLower.includes('board cover') ||
          nameLower.includes('hero') ||
          nameLower.includes('identity')) {
        targetVisibility = 'public';
      }

      // Update if different or null
      if (frame.visibility !== targetVisibility) {
        await prisma.frameInstance.update({
          where: { id: frame.id },
          data: { visibility: targetVisibility }
        });

        console.log(`✅ Updated: "${frame.name}" → ${targetVisibility}`);
        updatedCount++;
      } else {
        console.log(`✓  Already correct: "${frame.name}" → ${targetVisibility}`);
      }
    }

    console.log(`\n🎉 Complete! Updated ${updatedCount} frame(s)`);
    console.log(`\nVisibility Summary:`);
    
    const publicFrames = template.frames.filter(f => 
      f.name.toLowerCase().includes('hero') || 
      f.name.toLowerCase().includes('board cover')
    );
    const adminFrames = template.frames.filter(f => 
      !f.name.toLowerCase().includes('hero') && 
      !f.name.toLowerCase().includes('board cover')
    );

    console.log(`   Public frames: ${publicFrames.length}`);
    publicFrames.forEach(f => console.log(`     - ${f.name}`));
    
    console.log(`   Admin frames: ${adminFrames.length}`);
    adminFrames.forEach(f => console.log(`     - ${f.name}`));

  } catch (error) {
    console.error('❌ Error updating frames:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

