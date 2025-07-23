#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDomain() {
  try {
    console.log('🔍 Checking domain details...\n');

    // Find the domain
    const domain = await prisma.domain.findFirst({
      where: {
        name: 'Chuck Livecchi'
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        keepers: {
          select: {
            id: true,
            title: true,
            purpose: true
          }
        }
      }
    });

    if (!domain) {
      console.log('❌ Domain not found');
      return;
    }

    console.log('📊 Domain Details:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Name: ${domain.name}`);
    console.log(`Slug: ${domain.slug}`);
    console.log(`ID: ${domain.id}`);
    console.log(`Status: ${domain.status}`);
    console.log(`Owner: ${domain.owner.name} (${domain.owner.email})`);
    console.log(`Created: ${domain.createdAt.toISOString()}`);
    console.log(`Description: ${domain.description || 'No description'}`);
    console.log(`Public: ${domain.isPublic}`);
    console.log(`Allow Requests: ${domain.allowRequests}`);

    console.log('\n👥 Domain Permissions:');
    domain.permissions.forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm.user.name} (${perm.user.email})`);
      console.log(`     Role: ${perm.role}`);
      console.log(`     Permissions: ${perm.permissions.join(', ')}`);
    });

    console.log('\n📝 Associated Keepers:');
    if (domain.keepers.length > 0) {
      domain.keepers.forEach((keeper, index) => {
        console.log(`  ${index + 1}. ${keeper.title}`);
        console.log(`     Purpose: ${keeper.purpose}`);
        console.log(`     ID: ${keeper.id}`);
      });
    } else {
      console.log('  No keepers associated yet');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error checking domain:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDomain(); 