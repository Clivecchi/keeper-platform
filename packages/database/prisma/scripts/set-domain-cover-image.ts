#!/usr/bin/env tsx
/**
 * Set cover image for a domain's theme
 * Usage: tsx set-domain-cover-image.ts <domainId> <imageUrl>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setDomainCoverImage(domainId: string, coverImageUrl: string) {
  try {
    console.log(`Setting cover image for domain ${domainId}...`);
    console.log(`Image URL: ${coverImageUrl}`);

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select: { id: true, name: true, theme: true }
    });

    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    console.log(`Found domain: ${domain.name}`);
    console.log(`Current theme:`, domain.theme);

    // Update theme with coverImage
    const currentTheme = domain.theme as Record<string, any> || {};
    const updatedTheme = {
      ...currentTheme,
      coverImage: coverImageUrl
    };

    await prisma.domain.update({
      where: { id: domainId },
      data: {
        theme: updatedTheme,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Cover image updated successfully!`);
    console.log(`New theme:`, updatedTheme);

    // Verify
    const updated = await prisma.domain.findUnique({
      where: { id: domainId },
      select: { theme: true }
    });

    console.log(`Verified theme:`, updated?.theme);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get args
const domainId = process.argv[2];
const imageUrl = process.argv[3];

if (!domainId || !imageUrl) {
  console.error('Usage: tsx set-domain-cover-image.ts <domainId> <imageUrl>');
  console.error('Example: tsx set-domain-cover-image.ts 9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9 https://...blob.vercel-storage.com/...');
  process.exit(1);
}

setDomainCoverImage(domainId, imageUrl);


