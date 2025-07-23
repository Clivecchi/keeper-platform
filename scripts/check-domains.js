#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDomains() {
  try {
    console.log('🔍 Checking current domain data...\n');

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

    // Get all domains owned by this user
    const ownedDomains = await prisma.domain.findMany({
      where: {
        ownerId: user.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${ownedDomains.length} domains owned by ${user.name}:`);
    
    ownedDomains.forEach((domain, index) => {
      console.log(`\n${index + 1}. Domain: ${domain.name}`);
      console.log(`   ID: ${domain.id}`);
      console.log(`   Slug: ${domain.slug}`);
      console.log(`   Created: ${domain.createdAt}`);
      console.log(`   Status: ${domain.status}`);
      console.log(`   Is Active: ${domain.isActive}`);
      console.log(`   Is Public: ${domain.isPublic}`);
    });

    // Get all domains where user has permissions
    const domainsWithPermissions = await prisma.domain.findMany({
      where: {
        permissions: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        permissions: {
          where: {
            userId: user.id
          }
        }
      }
    });

    console.log(`\n📋 Domains where ${user.name} has permissions:`);
    domainsWithPermissions.forEach((domain, index) => {
      console.log(`\n${index + 1}. Domain: ${domain.name}`);
      console.log(`   ID: ${domain.id}`);
      console.log(`   Slug: ${domain.slug}`);
      console.log(`   Role: ${domain.permissions[0]?.role || 'Unknown'}`);
      console.log(`   Permissions: ${domain.permissions[0]?.permissions?.join(', ') || 'None'}`);
    });

    // Determine which domain should be primary
    console.log('\n🎯 Primary Domain Analysis:');
    
    if (ownedDomains.length === 0) {
      console.log('❌ No domains owned by user');
      return;
    }

    // Primary domain should be the first created domain that matches user's name
    const primaryCandidate = ownedDomains.find(d => 
      d.name.toLowerCase().includes(user.name?.toLowerCase() || '') ||
      d.slug.toLowerCase().includes(user.name?.toLowerCase().replace(/\s+/g, '-') || '')
    );

    if (primaryCandidate) {
      console.log(`✅ Primary domain identified: ${primaryCandidate.name}`);
      console.log(`   This domain should be marked as primary for ${user.name}`);
      console.log(`   Current slug: ${primaryCandidate.slug}`);
    } else {
      console.log(`⚠️ No domain found matching user name pattern`);
      console.log(`   First created domain will be used as primary: ${ownedDomains[0].name}`);
    }

  } catch (error) {
    console.error('❌ Error checking domains:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDomains(); 