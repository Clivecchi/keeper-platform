/**
 * Feature Flag Service
 * Manages feature flags for domain functionality and progressive rollout
 */

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: string[];
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'domain_id' | 'user_email' | 'domain_slug' | 'user_role' | 'domain_tier';
  operator: 'equals' | 'contains' | 'starts_with' | 'in' | 'not_in';
  value: string | string[];
}

export interface FeatureFlagContext {
  userId?: string;
  domainId?: string;
  userEmail?: string;
  domainSlug?: string;
  userRole?: string;
  domainTier?: string;
  environment?: string;
}

export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private environment: string;
  private overrides: Map<string, boolean> = new Map();

  constructor(environment: string = process.env.NODE_ENV || 'development') {
    this.environment = environment;
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default domain-related feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      // Core Domain Features
      {
        key: 'DOMAIN_LAYER_ENABLED',
        name: 'Domain Layer',
        description: 'Enable the domain layer architecture',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: { category: 'core', priority: 'high' }
      },
      {
        key: 'CUSTOM_DOMAINS_ENABLED',
        name: 'Custom Domains',
        description: 'Allow users to configure custom domains',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: { category: 'domains', priority: 'medium' }
      },
      {
        key: 'DOMAIN_VERIFICATION_ENABLED',
        name: 'Domain Verification',
        description: 'Enable domain ownership verification',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        metadata: { category: 'security', priority: 'high' }
      },
      
      // Permission System
      {
        key: 'DOMAIN_PERMISSIONS_ENABLED',
        name: 'Domain Permissions',
        description: 'Enable domain-based permission system',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: { category: 'permissions', priority: 'high' }
      },
      {
        key: 'CROSS_DOMAIN_SHARING_ENABLED',
        name: 'Cross-Domain Sharing',
        description: 'Enable sharing content between domains',
        enabled: true,
        rolloutPercentage: 25,
        environments: ['development', 'staging'],
        metadata: { category: 'sharing', priority: 'medium' }
      },
      {
        key: 'DOMAIN_INVITATIONS_ENABLED',
        name: 'Domain Invitations',
        description: 'Enable inviting users to domains',
        enabled: true,
        rolloutPercentage: 75,
        environments: ['development', 'staging'],
        metadata: { category: 'collaboration', priority: 'medium' }
      },
      
      // SOLE Integration
      {
        key: 'SOLE_DOMAIN_ISOLATION_ENABLED',
        name: 'SOLE Domain Isolation',
        description: 'Enable domain-scoped SOLE memory isolation',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        metadata: { category: 'ai', priority: 'high' }
      },
      {
        key: 'DOMAIN_AWARE_KIP_ENABLED',
        name: 'Domain-Aware KIP',
        description: 'Enable domain context in KIP interactions',
        enabled: true,
        rolloutPercentage: 80,
        environments: ['development', 'staging'],
        metadata: { category: 'ai', priority: 'medium' }
      },
      
      // Advanced Features
      {
        key: 'DOMAIN_ANALYTICS_ENABLED',
        name: 'Domain Analytics',
        description: 'Enable usage analytics for domains',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        metadata: { category: 'analytics', priority: 'low' }
      },
      {
        key: 'DOMAIN_TRANSFERS_ENABLED',
        name: 'Domain Transfers',
        description: 'Enable domain ownership transfers',
        enabled: false,
        rolloutPercentage: 0,
        environments: ['development'],
        metadata: { category: 'admin', priority: 'low' }
      },
      {
        key: 'PREMIUM_DOMAIN_FEATURES_ENABLED',
        name: 'Premium Domain Features',
        description: 'Enable premium domain features',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        conditions: [
          {
            type: 'domain_tier',
            operator: 'equals',
            value: 'premium'
          }
        ],
        metadata: { category: 'premium', priority: 'medium' }
      },
      
      // Security & Performance
      {
        key: 'DOMAIN_CACHING_ENABLED',
        name: 'Domain Caching',
        description: 'Enable Redis caching for domain resolution',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: { category: 'performance', priority: 'high' }
      },
      {
        key: 'DOMAIN_RATE_LIMITING_ENABLED',
        name: 'Domain Rate Limiting',
        description: 'Enable rate limiting per domain',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['staging', 'production'],
        metadata: { category: 'security', priority: 'high' }
      },
      {
        key: 'DOMAIN_SLUG_VALIDATION_ENABLED',
        name: 'Domain Slug Validation',
        description: 'Enable strict slug validation and reserved word protection',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging', 'production'],
        metadata: { category: 'security', priority: 'high' }
      },
      
      // UI/UX Features
      {
        key: 'DOMAIN_SWITCHER_UI_ENABLED',
        name: 'Domain Switcher UI',
        description: 'Enable domain switching interface',
        enabled: true,
        rolloutPercentage: 50,
        environments: ['development', 'staging'],
        metadata: { category: 'ui', priority: 'medium' }
      },
      {
        key: 'DOMAIN_ADMIN_PANEL_ENABLED',
        name: 'Domain Admin Panel',
        description: 'Enable domain administration interface',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        conditions: [
          {
            type: 'user_role',
            operator: 'in',
            value: ['admin', 'super_admin']
          }
        ],
        metadata: { category: 'admin', priority: 'high' }
      },
      
      // Development & Testing
      {
        key: 'DOMAIN_DEBUG_MODE_ENABLED',
        name: 'Domain Debug Mode',
        description: 'Enable detailed logging and debug information for domains',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development'],
        metadata: { category: 'debug', priority: 'low' }
      },
      {
        key: 'DOMAIN_TEST_DATA_ENABLED',
        name: 'Domain Test Data',
        description: 'Enable test data generation for domains',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development', 'staging'],
        metadata: { category: 'testing', priority: 'low' }
      }
    ];

    // Load flags into the map
    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Check if a feature flag is enabled for the given context
   */
  isEnabled(flagKey: string, context: FeatureFlagContext = {}): boolean {
    // Check for override first
    if (this.overrides.has(flagKey)) {
      return this.overrides.get(flagKey)!;
    }

    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`Feature flag '${flagKey}' not found, defaulting to false`);
      return false;
    }

    // Check environment
    if (!flag.environments.includes(this.environment)) {
      return false;
    }

    // Check base enabled state
    if (!flag.enabled) {
      return false;
    }

    // Check conditions
    if (flag.conditions && !this.evaluateConditions(flag.conditions, context)) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      return this.isInRollout(flagKey, context, flag.rolloutPercentage);
    }

    return true;
  }

  /**
   * Get all enabled feature flags for the given context
   */
  getEnabledFlags(context: FeatureFlagContext = {}): string[] {
    return Array.from(this.flags.keys()).filter(key => this.isEnabled(key, context));
  }

  /**
   * Get feature flag details
   */
  getFlag(flagKey: string): FeatureFlag | null {
    return this.flags.get(flagKey) || null;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Override a feature flag (useful for testing)
   */
  override(flagKey: string, enabled: boolean): void {
    this.overrides.set(flagKey, enabled);
  }

  /**
   * Clear override for a feature flag
   */
  clearOverride(flagKey: string): void {
    this.overrides.delete(flagKey);
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
  }

  /**
   * Add or update a feature flag
   */
  setFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  /**
   * Remove a feature flag
   */
  removeFlag(flagKey: string): void {
    this.flags.delete(flagKey);
    this.overrides.delete(flagKey);
  }

  /**
   * Evaluate feature flag conditions
   */
  private evaluateConditions(conditions: FeatureFlagCondition[], context: FeatureFlagContext): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    let contextValue: string | undefined;

    switch (condition.type) {
      case 'user_id':
        contextValue = context.userId;
        break;
      case 'domain_id':
        contextValue = context.domainId;
        break;
      case 'user_email':
        contextValue = context.userEmail;
        break;
      case 'domain_slug':
        contextValue = context.domainSlug;
        break;
      case 'user_role':
        contextValue = context.userRole;
        break;
      case 'domain_tier':
        contextValue = context.domainTier;
        break;
      default:
        return false;
    }

    if (!contextValue) {
      return false;
    }

    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return contextValue === conditionValue;
      case 'contains':
        return typeof conditionValue === 'string' && contextValue.includes(conditionValue);
      case 'starts_with':
        return typeof conditionValue === 'string' && contextValue.startsWith(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(contextValue);
      default:
        return false;
    }
  }

  /**
   * Determine if a user/domain is in the rollout percentage
   */
  private isInRollout(flagKey: string, context: FeatureFlagContext, percentage: number): boolean {
    // Create a deterministic hash based on flag key and context
    const identifier = context.userId || context.domainId || 'anonymous';
    const hash = this.simpleHash(`${flagKey}:${identifier}`);
    const rolloutValue = hash % 100;
    
    return rolloutValue < percentage;
  }

  /**
   * Simple hash function for rollout calculation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get feature flags filtered by category
   */
  getFlagsByCategory(category: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(
      flag => flag.metadata?.category === category
    );
  }

  /**
   * Get feature flags filtered by environment
   */
  getFlagsByEnvironment(environment: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(
      flag => flag.environments.includes(environment)
    );
  }

  /**
   * Get rollout status for a flag
   */
  getRolloutStatus(flagKey: string): {
    enabled: boolean;
    rolloutPercentage: number;
    environments: string[];
    currentEnvironment: string;
    availableInCurrentEnv: boolean;
  } | null {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      return null;
    }

    return {
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      environments: flag.environments,
      currentEnvironment: this.environment,
      availableInCurrentEnv: flag.environments.includes(this.environment),
    };
  }

  /**
   * Bulk enable/disable flags by category
   */
  toggleFlagsByCategory(category: string, enabled: boolean): void {
    const flags = this.getFlagsByCategory(category);
    flags.forEach(flag => {
      flag.enabled = enabled;
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Export current flag configuration
   */
  exportConfiguration(): Record<string, unknown> {
    return {
      environment: this.environment,
      flags: Array.from(this.flags.values()),
      overrides: Object.fromEntries(this.overrides),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import flag configuration
   */
  importConfiguration(config: Record<string, unknown>): void {
    if (config.flags && Array.isArray(config.flags)) {
      this.flags.clear();
      config.flags.forEach((flag: FeatureFlag) => {
        this.flags.set(flag.key, flag);
      });
    }

    if (config.overrides) {
      this.overrides.clear();
      Object.entries(config.overrides).forEach(([key, value]) => {
        this.overrides.set(key, value as boolean);
      });
    }
  }
}

// Singleton instance
let featureFlagService: FeatureFlagService | null = null;

export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagService) {
    featureFlagService = new FeatureFlagService();
  }
  return featureFlagService;
}

// Convenience functions for common domain flags
export const domainFlags = {
  isDomainLayerEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('DOMAIN_LAYER_ENABLED', context),
  
  isCustomDomainsEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('CUSTOM_DOMAINS_ENABLED', context),
  
  isDomainVerificationEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('DOMAIN_VERIFICATION_ENABLED', context),
  
  isCrossDomainSharingEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('CROSS_DOMAIN_SHARING_ENABLED', context),
  
  isSoleDomainIsolationEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('SOLE_DOMAIN_ISOLATION_ENABLED', context),
  
  isDomainCachingEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('DOMAIN_CACHING_ENABLED', context),
  
  isDomainAdminPanelEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('DOMAIN_ADMIN_PANEL_ENABLED', context),
  
  isPremiumDomainFeaturesEnabled: (context?: FeatureFlagContext) => 
    getFeatureFlagService().isEnabled('PREMIUM_DOMAIN_FEATURES_ENABLED', context),
};

export default FeatureFlagService; 