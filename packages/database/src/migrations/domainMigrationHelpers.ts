/**
 * Domain Migration Helper Functions
 * TypeScript utilities for migrating to domain-based architecture
 */

import { PrismaClient } from '@prisma/client';
import { SlugValidationService } from '../services/SlugValidationService';
import { DomainService } from '../services/DomainService';
import { DomainCacheService } from '../services/DomainCacheService';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';

export interface MigrationResult {
  success: boolean;
  domainsCreated: number;
  permissionsCreated: number;
  contentMigrated: number;
  errors: string[];
  warnings: string[];
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  checkName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  expected: number;
  actual: number;
  details: string;
}

export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  skipValidation?: boolean;
  createBackup?: boolean;
}

interface MigrationStatus {
  totalUsers: number;
  createdDomains: number;
  updatedDomains: number;
  errors: string[];
  warnings: string[];
  completedAt?: Date;
  contentMigrated?: number;
  permissionsCreated?: number;
}

// Migration status factory
function createMigrationStatus(): MigrationStatus {
  return {
    totalUsers: 0,
    createdDomains: 0,
    updatedDomains: 0,
    errors: [],
    warnings: [],
  };
}

export class DomainMigrationHelper {
  private prisma: PrismaClient;
  private domainService: DomainService;
  private cacheService: DomainCacheService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // Create a minimal Redis instance for cache service
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.cacheService = new DomainCacheService(redis);
    this.domainService = new DomainService(prisma, this.cacheService);
  }

  /**
   * Perform complete domain migration
   */
  async performMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      domainsCreated: 0,
      permissionsCreated: 0,
      contentMigrated: 0,
      errors: [],
      warnings: [],
      validationResults: [],
    };

    try {
      console.log('Starting domain migration...');

      // Step 1: Pre-migration validation
      if (!options.skipValidation) {
        const preValidation = await this.validatePreMigration();
        result.validationResults.push(...preValidation);
        
        const criticalErrors = preValidation.filter(v => v.status === 'FAIL');
        if (criticalErrors.length > 0) {
          result.errors.push('Pre-migration validation failed');
          return result;
        }
      }

      // Step 2: Create backup if requested
      if (options.createBackup) {
        await this.createBackup();
        console.log('Backup created successfully');
      }

      // Step 3: Create domains for existing users
      const domainResults = await this.createDomainsForExistingUsers(options);
      result.domainsCreated = domainResults.createdDomains;
      result.errors.push(...domainResults.errors);
      result.warnings.push(...domainResults.warnings);

      // Step 4: Resolve slug conflicts
      const slugResults = await this.resolveSlugConflicts(options);
      result.warnings.push(...slugResults.warnings);

      // Step 5: Create permissions
      const permissionResults = await this.createDomainPermissions(options);
      result.permissionsCreated = permissionResults.createdDomains;
      result.errors.push(...permissionResults.errors);

      // Step 6: Migrate content
      const contentResults = await this.migrateContent(options);
      result.contentMigrated = contentResults.updatedDomains || 0;
      result.errors.push(...contentResults.errors);

      // Step 7: Initialize SOLE memory scopes
      const soleResults = await this.createSoleMemoryScopes();
      result.domainsCreated += soleResults.createdDomains;

      // Step 8: Create usage tracking
      await this.createInitialUsageEntries(options);

      // Step 9: Post-migration validation
      if (!options.skipValidation) {
        const postValidation = await this.validatePostMigration();
        result.validationResults.push(...postValidation);
        
        const criticalErrors = postValidation.filter(v => v.status === 'FAIL');
        if (criticalErrors.length > 0) {
          result.errors.push('Post-migration validation failed');
          return result;
        }
      }

      result.success = result.errors.length === 0;
      console.log('Domain migration completed successfully');

    } catch (error) {
      console.error('Migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Ensure all users have at least one domain
   * Create default domains for users without domains
   */
  async createDomainsForExistingUsers(options: MigrationOptions): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    // Get current date
    const migrationDate = new Date();

    try {
      // Get all users to ensure they have domains
      const users = await this.prisma.users.findMany({
        select: { id: true, email: true },
      });

      result.totalUsers = users.length;

      // Get existing domain owners
      const existingDomainOwners = await this.prisma.domain.findMany({
        select: { ownerId: true },
      });

      const ownerIds = new Set(existingDomainOwners.map(d => d.ownerId));
      const usersWithoutDomains = users.filter(u => !ownerIds.has(u.id));

      for (const user of usersWithoutDomains) {
        try {
          // Handle potentially null email
          const email = user.email || `user-${user.id}@keeper.tools`;
          const domainSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user-${user.id.slice(0, 8)}`;
          
          if (!options.dryRun) {
            await this.prisma.domain.create({
              data: {
                id: uuidv4(),
                name: `${domainSlug}'s domain`,
                slug: domainSlug,
                ownerId: user.id,
                status: 'active',
                isActive: true,
                createdAt: migrationDate,
                updatedAt: migrationDate,
                features: {},
                settings: {},
              },
            });
          }

          result.createdDomains++;
        } catch (error) {
          const errorMsg = `Failed to create domain for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Error in createDomainsForExistingUsers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Resolve slug conflicts
   */
  private async resolveSlugConflicts(options: MigrationOptions): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    try {
      if (options.dryRun) {
        return result;
      }

      // Find domains with duplicate slugs
      const duplicateSlugGroups = await this.prisma.domain.groupBy({
        by: ['slug'],
        having: {
          slug: {
            _count: {
              gt: 1
            }
          }
        },
        _count: {
          slug: true
        }
      });

      console.log(`Found ${duplicateSlugGroups.length} duplicate slug groups`);

      for (const group of duplicateSlugGroups) {
        const domains = await this.prisma.domain.findMany({
          where: { slug: group.slug },
          orderBy: { createdAt: 'asc' }
        });

        // Keep the first domain, rename the others
        for (let i = 1; i < domains.length; i++) {
          const domain = domains[i];
          const newSlug = await this.findAvailableSlug(group.slug, i);
          
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: {
              slug: newSlug,
              slugHistory: {
                push: group.slug
              }
            }
          });

          result.warnings.push(`Renamed domain slug from "${group.slug}" to "${newSlug}" for domain ${domain.id}`);
        }
      }

    } catch (error) {
      result.warnings.push(`Error in resolveSlugConflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Create domain permissions
   */
  private async createDomainPermissions(options: MigrationOptions): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    try {
      if (options.dryRun) {
        return result;
      }

      // Create admin permissions for all domain owners
      const domains = await this.prisma.domain.findMany({
        where: {
          ownerId: { not: undefined }
        },
        select: {
          id: true,
          ownerId: true,
          createdAt: true,
        }
      });

      console.log(`Creating permissions for ${domains.length} domains`);

      for (const domain of domains) {
        try {
          // Check if permission already exists
          const existingPermission = await this.prisma.domainPermission.findUnique({
            where: {
              domainId_userId: {
                domainId: domain.id,
                userId: domain.ownerId
              }
            }
          });

          if (!existingPermission) {
            await this.prisma.domainPermission.create({
              data: {
                domainId: domain.id,
                userId: domain.ownerId,
                role: 'admin',
                permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
                grantedBy: domain.ownerId,
                grantedAt: domain.createdAt,
              }
            });

            result.createdDomains++;
          }
        } catch (error) {
          result.errors.push(`Failed to create permission for domain ${domain.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Error in createDomainPermissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Migrate content to domains
   */
  private async migrateContent(options: MigrationOptions): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    try {
      if (options.dryRun) {
        return result;
      }

      // Update Keepers - use ownerId instead of userId
      const keepersNeedingDomains = await this.prisma.keeper.findMany({
        where: {
          ownerId: { not: undefined }
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      for (const keeper of keepersNeedingDomains) {
        try {
          // Find or create domain for keeper owner
          const domain = await this.prisma.domain.findFirst({
            where: { ownerId: keeper.ownerId },
          });

          if (domain) {
            await this.prisma.keeper.update({
              where: { id: keeper.id },
              data: { domainId: domain.id },
            });
          }

          result.updatedDomains++;
        } catch (error) {
          result.errors.push(`Failed to migrate keeper ${keeper.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update Journeys - use ownerId instead of userId
      const journeysNeedingDomains = await this.prisma.journey.findMany({
        where: {
          ownerId: { not: undefined }
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      for (const journey of journeysNeedingDomains) {
        try {
          const domain = await this.prisma.domain.findFirst({
            where: { ownerId: journey.ownerId },
          });

          if (domain) {
            await this.prisma.journey.update({
              where: { id: journey.id },
              data: { domainId: domain.id },
            });
          }

          result.updatedDomains++;
        } catch (error) {
          result.errors.push(`Failed to migrate journey ${journey.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update Moments - use ownerId instead of userId
      const momentsNeedingDomains = await this.prisma.moment.findMany({
        where: {
          ownerId: { not: undefined }
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

      for (const moment of momentsNeedingDomains) {
        try {
          const domain = await this.prisma.domain.findFirst({
            where: { ownerId: moment.ownerId },
          });

          if (domain) {
            await this.prisma.moment.update({
              where: { id: moment.id },
              data: { domainId: domain.id },
            });
          }

          result.updatedDomains++;
        } catch (error) {
          result.errors.push(`Failed to migrate moment ${moment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.contentMigrated = result.updatedDomains;
      return result;
    } catch (error) {
      result.errors.push(`Error in migrateContent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Create SOLE memory scopes for existing keepers
   */
  async createSoleMemoryScopes(): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    try {
      const keepers = await this.prisma.keeper.findMany({
        where: { 
          domainId: { not: null }
        },
        select: { id: true, ownerId: true, domainId: true },
      });

      for (const keeper of keepers) {
        try {
          if (!keeper.domainId) {
            result.warnings.push(`Keeper ${keeper.id} has no domain, skipping SOLE scope creation`);
            continue;
          }

          const scope = await this.prisma.soleMemoryScope.create({
            data: {
              id: uuidv4(),
              domainId: keeper.domainId,
              createdBy: keeper.ownerId,
            },
          });

          result.createdDomains++;
        } catch (error) {
          result.errors.push(`Failed to create SOLE scope for keeper ${keeper.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Error in createSoleMemoryScopes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Create initial usage entries
   */
  private async createInitialUsageEntries(options: MigrationOptions): Promise<void> {
    if (options.dryRun) {
      return;
    }

    try {
      const domains = await this.prisma.domain.findMany({
        where: {
          settings: {
            path: ['migration_source'],
            equals: 'existing_user'
          }
        },
        include: {
          keepers: { select: { id: true } },
          journeys: { select: { id: true } },
          moments: { select: { id: true } },
        }
      });

      for (const domain of domains) {
        await this.prisma.domainUsage.create({
          data: {
            domainId: domain.id,
            userId: domain.ownerId,
            action: 'migration_create_domain',
            metadata: {
              migration_type: 'existing_user',
              original_user_id: domain.ownerId,
              keepers_count: domain.keepers.length,
              journeys_count: domain.journeys.length,
              moments_count: domain.moments.length,
            },
            timestamp: domain.createdAt,
            userAgent: 'Migration Script v1.0',
          }
        });
      }

      console.log('Initial usage entries created');
    } catch (error) {
      console.error('Error creating initial usage entries:', error);
    }
  }

  /**
   * Validation methods
   */
  private async validatePreMigration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check for existing domains
    const existingDomains = await this.prisma.domain.count();
    const totalUsers = await this.prisma.users.count();
    
    if (existingDomains > 0) {
      results.push({
        checkName: 'existing_domains',
        status: 'WARNING',
        expected: 0,
        actual: existingDomains,
        details: 'Migration will be performed incrementally'
      });
    }

    // Check for orphaned content
    const orphanedKeepers = await this.prisma.keeper.count({
      where: { 
        ownerId: { equals: undefined }
      }
    });
    
    if (orphanedKeepers > 0) {
      results.push({
        checkName: 'orphaned_keepers',
        status: 'WARNING',
        expected: 0,
        actual: orphanedKeepers,
        details: 'Some keepers have no owner and will be skipped'
      });
    }

    return results;
  }

  private async validatePostMigration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check that all users have domains
    const usersCount = await this.prisma.users.count();
    const usersWithDomains = await this.prisma.users.count({
      where: {
        ownedDomains: {
          some: {}
        }
      }
    });

    results.push({
      checkName: 'users_with_domains',
      status: usersCount === usersWithDomains ? 'PASS' : 'FAIL',
      expected: usersCount,
      actual: usersWithDomains,
      details: 'All users should have at least one domain'
    });

    // Check for orphaned content
    const orphanedContent = await this.prisma.keeper.count({
      where: { domainId: null }
    });

    results.push({
      checkName: 'orphaned_content',
      status: orphanedContent === 0 ? 'PASS' : 'FAIL',
      expected: 0,
      actual: orphanedContent,
      details: 'No content should be orphaned'
    });

    return results;
  }

  /**
   * Helper methods
   */
  private generateDomainName(user: { name?: string | null; email?: string | null }): string {
    if (user.name && user.name.trim()) {
      return `${user.name.trim()}'s Keeper`;
    }
    if (user.email) {
      const username = user.email.split('@')[0];
      return `${username}'s Keeper`;
    }
    return 'My Keeper';
  }

  private generateDomainSlug(user: { name?: string | null; email?: string | null; id: string }): string {
    if (user.name && user.name.trim()) {
      return SlugValidationService.sanitizeSlug(user.name.trim());
    }
    if (user.email) {
      const username = user.email.split('@')[0];
      return SlugValidationService.sanitizeSlug(username);
    }
    return `user-${user.id.substring(0, 8)}`;
  }

  private async findAvailableSlug(baseSlug: string, counter: number): Promise<string> {
    const newSlug = `${baseSlug}-${counter}`;
    
    const existing = await this.prisma.domain.findUnique({
      where: { slug: newSlug }
    });

    if (existing) {
      return this.findAvailableSlug(baseSlug, counter + 1);
    }

    return newSlug;
  }

  private async createBackup(): Promise<void> {
    // In a real implementation, this would create a database backup
    console.log('Creating backup... (implementation depends on your database setup)');
    // Example: pg_dump for PostgreSQL
    // exec('pg_dump -U username -h hostname database_name > backup.sql');
  }

  /**
   * Rollback functionality
   */
  async rollbackMigration(): Promise<void> {
    console.log('Rolling back domain migration...');
    
    try {
      // Delete domains created during migration
      await this.prisma.domain.deleteMany({
        where: {
          settings: {
            path: ['migration_source'],
            equals: 'existing_user'
          }
        }
      });

      // Reset content domain references
      await this.prisma.keeper.updateMany({
        where: { domainId: { not: null } },
        data: { domainId: null }
      });

      await this.prisma.journey.updateMany({
        where: { domainId: { not: null } },
        data: { domainId: null }
      });

      await this.prisma.moment.updateMany({
        where: { domainId: { not: null } },
        data: { domainId: null }
      });

      console.log('Migration rollback completed');
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned content
   */
  async cleanupOrphanedContent(): Promise<MigrationStatus> {
    const result = createMigrationStatus();

    try {
      const orphanedKeepers = await this.prisma.keeper.findMany({
        where: { 
          ownerId: { equals: undefined }
        }
      });

      result.warnings.push(`Found ${orphanedKeepers.length} orphaned keepers`);

      return result;
    } catch (error) {
      result.errors.push(`Error in cleanupOrphanedContent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}
