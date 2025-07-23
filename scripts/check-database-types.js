#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseTypes() {
  try {
    console.log('🔍 Checking database schema and types...\n');

    // Check users table structure
    console.log('📋 Users table structure:');
    const userSample = await prisma.users.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    
    if (userSample) {
      console.log(`   User ID type: ${typeof userSample.id}`);
      console.log(`   User ID value: ${userSample.id}`);
      console.log(`   User ID length: ${userSample.id.length}`);
      console.log(`   Is UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userSample.id)}`);
    }

    // Check user_roles table structure
    console.log('\n📋 User_roles table structure:');
    const userRoleSample = await prisma.user_roles.findFirst({
      select: {
        userId: true,
        roleId: true
      }
    });
    
    if (userRoleSample) {
      console.log(`   UserRole userId type: ${typeof userRoleSample.userId}`);
      console.log(`   UserRole userId value: ${userRoleSample.userId}`);
      console.log(`   UserRole userId length: ${userRoleSample.userId.length}`);
      console.log(`   Is UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userRoleSample.userId)}`);
    }

    // Check domains table structure
    console.log('\n📋 Domains table structure:');
    const domainSample = await prisma.domain.findFirst({
      select: {
        id: true,
        name: true,
        ownerId: true
      }
    });
    
    if (domainSample) {
      console.log(`   Domain ID type: ${typeof domainSample.id}`);
      console.log(`   Domain ID value: ${domainSample.id}`);
      console.log(`   Domain ownerId type: ${typeof domainSample.ownerId}`);
      console.log(`   Domain ownerId value: ${domainSample.ownerId}`);
    }

    // Check if primaryDomainId column exists
    console.log('\n📋 Checking for primaryDomainId column:');
    try {
      const userWithPrimary = await prisma.users.findFirst({
        select: {
          id: true,
          primaryDomainId: true
        }
      });
      console.log('   ✅ primaryDomainId column exists');
      console.log(`   Sample primaryDomainId: ${userWithPrimary?.primaryDomainId || 'null'}`);
    } catch (error) {
      console.log('   ❌ primaryDomainId column does not exist');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🎯 Analysis:');
    console.log('   - We need to understand the type mismatches before proceeding');
    console.log('   - We should avoid changing existing column types');
    console.log('   - We can add primaryDomainId as a simple text field without foreign key constraints');

  } catch (error) {
    console.error('❌ Error checking database types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseTypes(); 