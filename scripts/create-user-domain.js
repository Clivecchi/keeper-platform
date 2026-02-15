#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createUserDomain() {
  try {
    console.log('🔍 Finding user Chuck Livecchi...');
    
    // Find the user
    const user = await prisma.users.findFirst({
      where: {
        email: 'clivecchi@gmail.com'
      }
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Check if domain already exists
    const existingDomain = await prisma.domain.findFirst({
      where: {
        OR: [
          { name: 'Chuck Livecchi' },
          { slug: 'chuck-livecchi' }
        ]
      }
    });

    if (existingDomain) {
      console.log('⚠️ Domain already exists:', existingDomain.name);
      return;
    }

    // Create the domain
    const domain = await prisma.domain.create({
      data: {
        id: randomUUID(),
        name: 'Chuck Livecchi',
        slug: 'chuck-livecchi',
        ownerId: user.id,
        description: 'Personal domain for Chuck Livecchi',
        isPublic: false,
        allowRequests: false,
        status: 'active',
        features: {
          kip_enabled: true,
          custom_themes: true,
          memory_enabled: true
        },
        limits: {
          max_keepers: 100,
          max_users: 50
        },
        theme: {
          primary_color: '#3B82F6',
          secondary_color: '#1F2937'
        },
        settings: {
          default_visibility: 'private',
          allow_cross_domain_sharing: true
        }
      }
    });

    console.log('✅ Domain created successfully!');
    console.log(`   Name: ${domain.name}`);
    console.log(`   Slug: ${domain.slug}`);
    console.log(`   ID: ${domain.id}`);
    console.log(`   Owner: ${user.name}`);

    // Ensure domain has agent policy (governance)
    try {
      const contract = await prisma.agentContract.findFirst({ where: { version: '1.1' }, select: { id: true } });
      if (contract) {
        await prisma.domainAgentPolicy.upsert({
          where: { domainId: domain.id },
          create: { domainId: domain.id, contractId: contract.id, enforcementMode: 'warn' },
          update: {},
        });
        console.log('✅ Domain agent policy assigned (Contract v1.1, warn mode)');
      }
    } catch (e) {
      console.warn('⚠️ Could not assign agent policy (run API backfill if needed):', e?.message || e);
    }

    // Create domain permission for the owner
    const permission = await prisma.domainPermission.create({
      data: {
        id: randomUUID(),
        domainId: domain.id,
        userId: user.id,
        role: 'admin', // Owner gets admin role
        permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
        grantedBy: user.id
      }
    });

    console.log('✅ Domain permission created for owner');
    console.log(`   Role: ${permission.role}`);
    console.log(`   Permissions: ${permission.permissions.join(', ')}`);

    // Check for existing keepers to associate
    const existingKeepers = await prisma.keeper.findMany({
      where: {
        ownerId: user.id
      }
    });

    if (existingKeepers.length > 0) {
      console.log(`📝 Found ${existingKeepers.length} existing keepers to associate with domain`);
      
      for (const keeper of existingKeepers) {
        await prisma.keeper.update({
          where: { id: keeper.id },
          data: { domainId: domain.id }
        });
        console.log(`   ✅ Associated keeper: ${keeper.name}`);
      }
    }

    console.log('\n🎉 Domain setup complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Domain: ${domain.name} (${domain.slug})`);
    console.log(`Owner: ${user.name}`);
    console.log(`Keepers: ${existingKeepers.length} associated`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating domain:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserDomain(); 