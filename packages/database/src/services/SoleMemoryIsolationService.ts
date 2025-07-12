/**
 * SOLE Memory Isolation Service
 * Core service for managing domain-scoped memory isolation for AI agents
 */

import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { getFeatureFlagService } from './FeatureFlagService';
import * as crypto from 'crypto';

export type MemoryCategory = 'conversational' | 'factual' | 'procedural' | 'episodic' | 'semantic';
export type AccessType = 'read' | 'write' | 'admin';
export type IsolationLevel = 'strict' | 'permissive' | 'shared';
export type ShareType = 'read_only' | 'read_write' | 'reference_only';
export type MigrationType = 'copy' | 'move' | 'merge' | 'split';

export interface MemoryContent {
  id: string;
  category: MemoryCategory;
  content: Record<string, unknown>;
  metadata: {
    timestamp: Date;
    source: string;
    confidence: number;
    tags: string[];
    relations: string[];
  };
  access: {
    level: AccessType;
    users: string[];
    expires?: Date;
  };
}

export interface MemoryQuery {
  domainId: string;
  userId: string;
  category?: MemoryCategory;
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    dateRange?: { start: Date; end: Date };
    tags?: string[];
    confidence?: { min: number; max: number };
    source?: string[];
  };
}

export interface MemoryInsert {
  domainId: string;
  userId: string;
  category: MemoryCategory;
  content: Record<string, unknown>;
  metadata?: Partial<MemoryContent['metadata']>;
  access?: Partial<MemoryContent['access']>;
}

export interface MemoryShareRequest {
  sourceMemoryId: string;
  targetMemoryId: string;
  shareType: ShareType;
  memoryCategories: MemoryCategory[];
  accessLevel: 'limited' | 'full' | 'custom';
  requestedBy: string;
  purpose?: string;
  expiresAt?: Date;
  maxAccess?: number;
}

export interface MemoryMigrationRequest {
  sourceMemoryId: string;
  targetMemoryId?: string;
  migrationType: MigrationType;
  memoryCategories: MemoryCategory[];
  preserveSource: boolean;
  transformRules?: any;
  mappingRules?: any;
  validationRules?: any;
  initiatedBy: string;
}

export interface MemoryQuota {
  domainId: string;
  maxMemorySize: number;
  currentMemorySize: number;
  usagePercentage: number;
  categoryBreakdown: Record<MemoryCategory, number>;
  recommendedCleanup: boolean;
}

export interface MemoryAnalytics {
  domainId: string;
  timeRange: { start: Date; end: Date };
  metrics: {
    totalAccesses: number;
    uniqueUsers: number;
    avgResponseTime: number;
    errorRate: number;
    popularCategories: Array<{ category: MemoryCategory; count: number }>;
  };
  usage: {
    reads: number;
    writes: number;
    shares: number;
    migrations: number;
  };
  growth: {
    memorySize: number;
    accessCount: number;
    userCount: number;
  };
}

export class SoleMemoryIsolationService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Memory size limits (in bytes)
  private readonly DEFAULT_MEMORY_LIMITS = {
    conversational: 104857600,  // 100MB
    factual: 524288000,         // 500MB
    procedural: 209715200,      // 200MB
    episodic: 314572800,        // 300MB
    semantic: 419430400,        // 400MB
  };

  // Cache TTL settings
  private readonly CACHE_TTL = {
    memory_access: 300,         // 5 minutes
    memory_content: 1800,       // 30 minutes
    memory_metadata: 3600,      // 1 hour
    memory_permissions: 900,    // 15 minutes
  };

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Initialize memory scope for a domain
   */
  async initializeMemoryScope(domainId: string, createdBy: string): Promise<unknown> {
    if (!this.featureFlags.isEnabled('SOLE_MEMORY_ISOLATION')) {
      throw new Error('SOLE memory isolation is not enabled');
    }

    // Check if memory scope already exists
    const existingScope = await this.prisma.soleMemoryScope.findUnique({
      where: { domainId },
    });

    if (existingScope) {
      return existingScope;
    }

    // Create new memory scope
    const memoryScope = await this.prisma.soleMemoryScope.create({
      data: {
        domainId,
        createdBy,
        isolationLevel: 'strict',
        allowCrossDomain: false,
        maxMemorySize: Object.values(this.DEFAULT_MEMORY_LIMITS).reduce((a, b) => a + b, 0),
        currentMemorySize: 0,
        conversationMemory: {},
        factualMemory: {},
        proceduralMemory: {},
        episodicMemory: {},
        semanticMemory: {},
        compressionLevel: 'moderate',
        retentionPolicy: {
          conversational: { days: 30 },
          factual: { days: 365 },
          procedural: { days: 180 },
          episodic: { days: 90 },
          semantic: { days: 730 },
        },
        readAccess: [createdBy],
        writeAccess: [createdBy],
        adminAccess: [createdBy],
      },
    });

    // Cache the new memory scope
    await this.cacheService.cacheData(
      `memory_scope:${domainId}`,
      memoryScope,
      this.CACHE_TTL.memory_metadata
    );

    return memoryScope;
  }

  /**
   * Get memory scope for domain
   */
  async getMemoryScope(domainId: string): Promise<unknown> {
    // Check cache first
    const cached = await this.cacheService.getData(`memory_scope:${domainId}`);
    if (cached) {
      return cached;
    }

    // Query database
    const memoryScope = await this.prisma.soleMemoryScope.findUnique({
      where: { domainId },
      include: {
        domain: true,
        creator: true,
        sharedFrom: true,
        sharedTo: true,
      },
    });

    if (!memoryScope) {
      throw new Error(`Memory scope not found for domain: ${domainId}`);
    }

    // Cache the result
    await this.cacheService.cacheData(
      `memory_scope:${domainId}`,
      memoryScope,
      this.CACHE_TTL.memory_metadata
    );

    return memoryScope;
  }

  /**
   * Check if user has access to memory scope
   */
  async checkMemoryAccess(
    domainId: string,
    userId: string,
    accessType: AccessType
  ): Promise<boolean> {
    const cacheKey = `memory_access:${domainId}:${userId}:${accessType}`;
    
    // Check cache first
    const cached = await this.cacheService.getData(cacheKey);
    if (cached !== null) {
      return cached as boolean;
    }

    try {
      const memoryScope = await this.getMemoryScope(domainId);
      
      let hasAccess = false;
      
      switch (accessType) {
        case 'read':
          hasAccess = memoryScope.readAccess.includes(userId) ||
                     memoryScope.writeAccess.includes(userId) ||
                     memoryScope.adminAccess.includes(userId);
          break;
        case 'write':
          hasAccess = memoryScope.writeAccess.includes(userId) ||
                     memoryScope.adminAccess.includes(userId);
          break;
        case 'admin':
          hasAccess = memoryScope.adminAccess.includes(userId);
          break;
      }

      // Cache the result
      await this.cacheService.cacheData(cacheKey, hasAccess, this.CACHE_TTL.memory_permissions);
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking memory access:', error);
      return false;
    }
  }

  /**
   * Query memory content
   */
  async queryMemory(query: MemoryQuery): Promise<MemoryContent[]> {
    // Check access permissions
    const hasAccess = await this.checkMemoryAccess(query.domainId, query.userId, 'read');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to access memory');
    }

    // Log access
    await this.logMemoryAccess({
      memoryId: query.domainId,
      userId: query.userId,
      accessType: 'read',
      operation: 'query',
      accessGranted: true,
    });

    // Get memory scope
    const memoryScope = await this.getMemoryScope(query.domainId);

    // Extract relevant memory content
    const memories: MemoryContent[] = [];
    const categories = query.category ? [query.category] : Object.keys(memoryScope) as MemoryCategory[];

    for (const category of categories) {
      if (this.isValidMemoryCategory(category)) {
        const categoryMemory = memoryScope[`${category}Memory`];
        if (categoryMemory && typeof categoryMemory === 'object') {
          const filteredMemories = this.filterMemoryContent(
            categoryMemory,
            query.query,
            query.filters
          );
          memories.push(...filteredMemories);
        }
      }
    }

    // Apply pagination
    const startIndex = query.offset || 0;
    const endIndex = startIndex + (query.limit || 50);
    
    return memories.slice(startIndex, endIndex);
  }

  /**
   * Insert memory content
   */
  async insertMemory(insert: MemoryInsert): Promise<string> {
    // Check access permissions
    const hasAccess = await this.checkMemoryAccess(insert.domainId, insert.userId, 'write');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to write memory');
    }

    // Get memory scope
    const memoryScope = await this.getMemoryScope(insert.domainId);

    // Check quota
    const quota = await this.getMemoryQuota(insert.domainId);
    const contentSize = this.calculateContentSize(insert.content);
    
    if (quota.currentMemorySize + contentSize > quota.maxMemorySize) {
      throw new Error('Memory quota exceeded');
    }

    // Create memory content
    const memoryId = crypto.randomUUID();
    const memoryContent: MemoryContent = {
      id: memoryId,
      category: insert.category,
      content: insert.content,
      metadata: {
        timestamp: new Date(),
        source: insert.userId,
        confidence: 1.0,
        tags: [],
        relations: [],
        ...insert.metadata,
      },
      access: {
        level: 'read' as AccessType,
        users: [insert.userId],
        ...insert.access,
      },
    };

    // Update memory scope
    const categoryField = `${insert.category}Memory`;
    const currentMemory = memoryScope[categoryField] || {};
    currentMemory[memoryId] = memoryContent;

    await this.prisma.soleMemoryScope.update({
      where: { domainId: insert.domainId },
      data: {
        [categoryField]: currentMemory,
        currentMemorySize: memoryScope.currentMemorySize + contentSize,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.deleteData(`memory_scope:${insert.domainId}`);

    // Log access
    await this.logMemoryAccess({
      memoryId: insert.domainId,
      userId: insert.userId,
      accessType: 'write',
      operation: 'insert',
      accessGranted: true,
      dataSize: contentSize,
    });

    return memoryId;
  }

  /**
   * Update memory content
   */
  async updateMemory(
    domainId: string,
    memoryId: string,
    userId: string,
    updates: Partial<MemoryContent>
  ): Promise<void> {
    // Check access permissions
    const hasAccess = await this.checkMemoryAccess(domainId, userId, 'write');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to update memory');
    }

    // Get memory scope
    const memoryScope = await this.getMemoryScope(domainId);

    // Find and update memory content
    let updated = false;
    for (const category of Object.keys(memoryScope)) {
      if (category.endsWith('Memory')) {
        const categoryMemory = memoryScope[category];
        if (categoryMemory && categoryMemory[memoryId]) {
          categoryMemory[memoryId] = {
            ...categoryMemory[memoryId],
            ...updates,
            metadata: {
              ...categoryMemory[memoryId].metadata,
              ...updates.metadata,
            },
          };
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      throw new Error('Memory content not found');
    }

    // Update database
    await this.prisma.soleMemoryScope.update({
      where: { domainId },
      data: {
        conversationMemory: memoryScope.conversationMemory,
        factualMemory: memoryScope.factualMemory,
        proceduralMemory: memoryScope.proceduralMemory,
        episodicMemory: memoryScope.episodicMemory,
        semanticMemory: memoryScope.semanticMemory,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.deleteData(`memory_scope:${domainId}`);

    // Log access
    await this.logMemoryAccess({
      memoryId: domainId,
      userId,
      accessType: 'write',
      operation: 'update',
      accessGranted: true,
    });
  }

  /**
   * Delete memory content
   */
  async deleteMemory(domainId: string, memoryId: string, userId: string): Promise<void> {
    // Check access permissions
    const hasAccess = await this.checkMemoryAccess(domainId, userId, 'write');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to delete memory');
    }

    // Get memory scope
    const memoryScope = await this.getMemoryScope(domainId);

    // Find and delete memory content
    let deleted = false;
    let deletedSize = 0;
    
    for (const category of Object.keys(memoryScope)) {
      if (category.endsWith('Memory')) {
        const categoryMemory = memoryScope[category];
        if (categoryMemory && categoryMemory[memoryId]) {
          deletedSize = this.calculateContentSize(categoryMemory[memoryId]);
          delete categoryMemory[memoryId];
          deleted = true;
          break;
        }
      }
    }

    if (!deleted) {
      throw new Error('Memory content not found');
    }

    // Update database
    await this.prisma.soleMemoryScope.update({
      where: { domainId },
      data: {
        conversationMemory: memoryScope.conversationMemory,
        factualMemory: memoryScope.factualMemory,
        proceduralMemory: memoryScope.proceduralMemory,
        episodicMemory: memoryScope.episodicMemory,
        semanticMemory: memoryScope.semanticMemory,
        currentMemorySize: Math.max(0, memoryScope.currentMemorySize - deletedSize),
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.deleteData(`memory_scope:${domainId}`);

    // Log access
    await this.logMemoryAccess({
      memoryId: domainId,
      userId,
      accessType: 'write',
      operation: 'delete',
      accessGranted: true,
      dataSize: deletedSize,
    });
  }

  /**
   * Request memory share between domains
   */
  async requestMemoryShare(request: MemoryShareRequest): Promise<string> {
    // Validate source and target memory scopes
    const sourceMemory = await this.getMemoryScope(request.sourceMemoryId);
    const targetMemory = await this.getMemoryScope(request.targetMemoryId);

    if (!sourceMemory || !targetMemory) {
      throw new Error('Invalid memory scope for sharing');
    }

    // Check if requester has permission to share from source
    const hasSourceAccess = await this.checkMemoryAccess(
      request.sourceMemoryId,
      request.requestedBy,
      'admin'
    );

    if (!hasSourceAccess) {
      throw new Error('Insufficient permissions to share from source memory');
    }

    // Create share request
    const shareRequest = await this.prisma.memoryShare.create({
      data: {
        sourceMemoryId: request.sourceMemoryId,
        targetMemoryId: request.targetMemoryId,
        shareType: request.shareType,
        memoryCategories: request.memoryCategories,
        accessLevel: request.accessLevel,
        requestedBy: request.requestedBy,
        purpose: request.purpose,
        expiresAt: request.expiresAt,
        maxAccess: request.maxAccess,
        status: 'pending',
      },
    });

    // Create alert for target domain admin
    await this.createMemoryAlert(
      request.targetMemoryId,
      'memory_share_request',
      'info',
      `Memory share request from domain ${request.sourceMemoryId}`,
      { shareRequestId: shareRequest.id }
    );

    return shareRequest.id;
  }

  /**
   * Approve memory share request
   */
  async approveMemoryShare(shareId: string, approvedBy: string): Promise<void> {
    const share = await this.prisma.memoryShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new Error('Share request not found');
    }

    // Check if approver has permission on target memory
    const hasTargetAccess = await this.checkMemoryAccess(
      share.targetMemoryId,
      approvedBy,
      'admin'
    );

    if (!hasTargetAccess) {
      throw new Error('Insufficient permissions to approve share');
    }

    // Update share status
    await this.prisma.memoryShare.update({
      where: { id: shareId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    // Create success alert
    await this.createMemoryAlert(
      share.sourceMemoryId,
      'memory_share_approved',
      'info',
      `Memory share request approved by ${approvedBy}`,
      { shareRequestId: shareId }
    );
  }

  /**
   * Get memory quota information
   */
  async getMemoryQuota(domainId: string): Promise<MemoryQuota> {
    const memoryScope = await this.getMemoryScope(domainId);

    const categoryBreakdown: Record<MemoryCategory, number> = {
      conversational: this.calculateContentSize(memoryScope.conversationMemory),
      factual: this.calculateContentSize(memoryScope.factualMemory),
      procedural: this.calculateContentSize(memoryScope.proceduralMemory),
      episodic: this.calculateContentSize(memoryScope.episodicMemory),
      semantic: this.calculateContentSize(memoryScope.semanticMemory),
    };

    const usagePercentage = (memoryScope.currentMemorySize / memoryScope.maxMemorySize) * 100;
    const recommendedCleanup = usagePercentage > 80;

    return {
      domainId,
      maxMemorySize: memoryScope.maxMemorySize,
      currentMemorySize: memoryScope.currentMemorySize,
      usagePercentage,
      categoryBreakdown,
      recommendedCleanup,
    };
  }

  /**
   * Get memory analytics
   */
  async getMemoryAnalytics(domainId: string, days: number = 30): Promise<MemoryAnalytics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get access statistics
    const accessStats = await this.prisma.memoryAccess.groupBy({
      by: ['accessType', 'operation'],
      where: {
        memoryId: domainId,
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _avg: { responseTime: true },
    });

    // Calculate metrics
    const totalAccesses = accessStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const avgResponseTime = accessStats.reduce((sum, stat) => sum + (stat._avg.responseTime || 0), 0) / accessStats.length;

    return {
      domainId,
      timeRange: { start: startDate, end: endDate },
      metrics: {
        totalAccesses,
        uniqueUsers: 0, // Would be calculated from distinct users
        avgResponseTime,
        errorRate: 0, // Would be calculated from error logs
        popularCategories: [], // Would be calculated from category access
      },
      usage: {
        reads: accessStats.filter(s => s.accessType === 'read').reduce((sum, s) => sum + s._count.id, 0),
        writes: accessStats.filter(s => s.accessType === 'write').reduce((sum, s) => sum + s._count.id, 0),
        shares: 0, // Would be calculated from share requests
        migrations: 0, // Would be calculated from migration requests
      },
      growth: {
        memorySize: 0, // Would be calculated from historical data
        accessCount: 0, // Would be calculated from historical data
        userCount: 0, // Would be calculated from historical data
      },
    };
  }

  /**
   * Private helper methods
   */
  private isValidMemoryCategory(category: string): category is MemoryCategory {
    return ['conversational', 'factual', 'procedural', 'episodic', 'semantic'].includes(category);
  }

  private calculateContentSize(content: unknown): number {
    if (!content) return 0;
    return JSON.stringify(content).length;
  }

  private filterMemoryContent(categoryMemory: unknown,
    query: string,
    filters?: MemoryQuery['filters']
  ): MemoryContent[] {
    if (!categoryMemory || typeof categoryMemory !== 'object') {
      return [];
    }

    const memories = Object.values(categoryMemory) as MemoryContent[];
    
    return memories.filter(memory => {
      // Text search
      if (query && !JSON.stringify(memory.content).toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters?.dateRange) {
        const memoryDate = new Date(memory.metadata.timestamp);
        if (memoryDate < filters.dateRange.start || memoryDate > filters.dateRange.end) {
          return false;
        }
      }

      // Tags filter
      if (filters?.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          memory.metadata.tags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Confidence filter
      if (filters?.confidence) {
        const confidence = memory.metadata.confidence;
        if (confidence < filters.confidence.min || confidence > filters.confidence.max) {
          return false;
        }
      }

      // Source filter
      if (filters?.source && filters.source.length > 0) {
        if (!filters.source.includes(memory.metadata.source)) {
          return false;
        }
      }

      return true;
    });
  }

  private async logMemoryAccess(access: {
    memoryId: string;
    userId: string;
    accessType: AccessType;
    operation: string;
    accessGranted: boolean;
    dataSize?: number;
    responseTime?: number;
    memoryCategory?: string;
  }): Promise<void> {
    try {
      await this.prisma.memoryAccess.create({
        data: {
          memoryId: access.memoryId,
          userId: access.userId,
          accessType: access.accessType,
          operation: access.operation,
          accessGranted: access.accessGranted,
          dataSize: access.dataSize,
          responseTime: access.responseTime,
          timestamp: new Date(),
          memoryCategory: access.memoryCategory || 'unknown',
        },
      });
    } catch (error) {
      console.error('Failed to log memory access:', error);
    }
  }

  private async createMemoryAlert(
    memoryId: string,
    alertType: string,
    severity: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.memoryAlert.create({
        data: {
          memoryId,
          alertType,
          severity,
          message,
          triggerData: metadata,
          status: 'active',
        },
      });
    } catch (error) {
      console.error('Failed to create memory alert:', error);
    }
  }
}

export default SoleMemoryIsolationService; 