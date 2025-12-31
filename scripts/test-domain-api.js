#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDomainAPI() {
  try {
    console.log('🔍 Testing Domain API endpoints...\n');

    // 1. Check if domain exists
    console.log('1. Checking domain existence...');
    const domain = await prisma.domain.findFirst({
      where: {
        name: 'Chuck Livecchi'
      }
    });

    if (domain) {
      console.log('✅ Domain found:', domain.name);
      console.log(`   ID: ${domain.id}`);
      console.log(`   Slug: ${domain.slug}`);
      console.log(`   Owner: ${domain.ownerId}`);
    } else {
      console.log('❌ Domain not found');
    }

    // 2. Check user
    console.log('\n2. Checking user...');
    const user = await prisma.users.findFirst({
      where: {
        email: 'clivecchi@gmail.com'
      }
    });

    if (user) {
      console.log('✅ User found:', user.name);
      console.log(`   ID: ${user.id}`);
    } else {
      console.log('❌ User not found');
    }

    // 3. Check domain permissions
    if (domain && user) {
      console.log('\n3. Checking domain permissions...');
      const permission = await prisma.domainPermission.findFirst({
        where: {
          domainId: domain.id,
          userId: user.id
        }
      });

      if (permission) {
        console.log('✅ Domain permission found');
        console.log(`   Role: ${permission.role}`);
        console.log(`   Permissions: ${permission.permissions.join(', ')}`);
      } else {
        console.log('❌ Domain permission not found');
      }
    }

    // 4. Test getUserDomains logic
    if (user) {
      console.log('\n4. Testing getUserDomains logic...');
      const userDomains = await prisma.domain.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            {
              permissions: {
                some: {
                  userId: user.id
                }
              }
            }
          ]
        },
        include: {
          permissions: {
            where: {
              userId: user.id
            }
          }
        }
      });

      console.log(`Found ${userDomains.length} domains for user`);
      userDomains.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.name} (${d.slug})`);
        console.log(`      Owner: ${d.ownerId === user.id ? 'Yes' : 'No'}`);
        console.log(`      Permissions: ${d.permissions.length}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing domain API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDomainAPI(); 