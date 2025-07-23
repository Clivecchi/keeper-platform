#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setPrimaryDomain() {
  try {
    console.log('🔍 Setting primary domain for Chuck Livecchi...\n');

    // Find Chuck Livecchi user
    const user = await prisma.users.findFirst({
      where: {
        email: 'clivecchi@gmail.com'
      }
    });

    if (!user) {
      console.error('❌ User Chuck Livecchi not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Find Chuck Livecchi's personal domain
    const personalDomain = await prisma.domain.findFirst({
      where: {
        name: 'Chuck Livecchi',
        ownerId: user.id
      }
    });

    if (!personalDomain) {
      console.error('❌ Personal domain not found');
      return;
    }

    console.log(`✅ Found personal domain: ${personalDomain.name}`);
    console.log(`   Domain ID: ${personalDomain.id}`);
    console.log(`   Slug: ${personalDomain.slug}\n`);

    // Update user's primary domain
    await prisma.users.update({
      where: { id: user.id },
      data: { primaryDomainId: personalDomain.id }
    });

    console.log('✅ Successfully set primary domain!');
    console.log(`   Primary Domain: ${personalDomain.name} (${personalDomain.slug})`);

    // Verify the update
    const updatedUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        primaryDomainId: true 
      }
    });

    console.log('\n📋 Verification:');
    console.log(`   User: ${updatedUser.name}`);
    console.log(`   Primary Domain ID: ${updatedUser.primaryDomainId}`);

  } catch (error) {
    console.error('❌ Error setting primary domain:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPrimaryDomain(); 