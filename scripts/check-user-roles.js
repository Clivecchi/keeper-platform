#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user role assignments...\n');

    // Get all users with their roles
    const users = await prisma.users.findMany({
      include: {
        user_roles: {
          include: {
            roles: {
              select: { name: true, description: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📊 User Role Assignments:');
    console.log('═══════════════════════════════════════════════════════════════');

    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      
      if (user.user_roles.length > 0) {
        console.log(`   Roles:`);
        user.user_roles.forEach((userRole) => {
          console.log(`     ✅ ${userRole.roles.name} - ${userRole.roles.description}`);
        });
      } else {
        console.log(`   Roles: None assigned`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Total users: ${users.length}`);
    console.log(`Users with roles: ${users.filter(u => u.user_roles.length > 0).length}`);

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles(); 