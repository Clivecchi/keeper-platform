import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeatureFlagService, FeatureFlag, FeatureFlagContext, domainFlags } from '../FeatureFlagService';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService('development');
  });

  afterEach(() => {
    service.clearAllOverrides();
  });

  describe('Basic functionality', () => {
    it('should initialize with default flags', () => {
      const flags = service.getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      
      // Check that core domain flags exist
      expect(service.getFlag('DOMAIN_LAYER_ENABLED')).toBeDefined();
      expect(service.getFlag('CUSTOM_DOMAINS_ENABLED')).toBeDefined();
      expect(service.getFlag('DOMAIN_PERMISSIONS_ENABLED')).toBeDefined();
    });

    it('should return flag details correctly', () => {
      const flag = service.getFlag('DOMAIN_LAYER_ENABLED');
      expect(flag).toMatchObject({
        key: 'DOMAIN_LAYER_ENABLED',
        name: 'Domain Layer',
        enabled: true,
        rolloutPercentage: 100,
        environments: expect.arrayContaining(['development']),
      });
    });

    it('should return null for non-existent flags', () => {
      const flag = service.getFlag('NON_EXISTENT_FLAG');
      expect(flag).toBeNull();
    });
  });

  describe('Environment-based flags', () => {
    it('should respect environment restrictions', () => {
      const devService = new FeatureFlagService('development');
      const prodService = new FeatureFlagService('production');

      // Domain debug mode should only be available in development
      expect(devService.isEnabled('DOMAIN_DEBUG_MODE_ENABLED')).toBe(true);
      expect(prodService.isEnabled('DOMAIN_DEBUG_MODE_ENABLED')).toBe(false);
    });

    it('should handle flags available in multiple environments', () => {
      const devService = new FeatureFlagService('development');
      const stagingService = new FeatureFlagService('staging');
      const prodService = new FeatureFlagService('production');

      // Domain layer should be available in all environments
      expect(devService.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);
      expect(stagingService.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);
      expect(prodService.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);
    });
  });

  describe('Rollout percentage', () => {
    it('should respect rollout percentage', () => {
      // Mock the hash function to return predictable results
      const originalHash = (service as any).simpleHash;
      (service as any).simpleHash = vi.fn();

      // Test different hash values for rollout
      const context = { userId: 'user-123' };

      // Hash that puts user in 25% rollout
      (service as any).simpleHash.mockReturnValue(20);
      expect(service.isEnabled('CROSS_DOMAIN_SHARING_ENABLED', context)).toBe(true);

      // Hash that puts user outside 25% rollout
      (service as any).simpleHash.mockReturnValue(50);
      expect(service.isEnabled('CROSS_DOMAIN_SHARING_ENABLED', context)).toBe(false);

      // Restore original hash function
      (service as any).simpleHash = originalHash;
    });

    it('should handle 100% rollout correctly', () => {
      const context = { userId: 'any-user' };
      expect(service.isEnabled('DOMAIN_LAYER_ENABLED', context)).toBe(true);
    });

    it('should handle 0% rollout correctly', () => {
      const context = { userId: 'any-user' };
      expect(service.isEnabled('DOMAIN_TRANSFERS_ENABLED', context)).toBe(false);
    });
  });

  describe('Conditions', () => {
    it('should evaluate user role conditions correctly', () => {
      const adminContext = { userRole: 'admin' };
      const userContext = { userRole: 'user' };

      expect(service.isEnabled('DOMAIN_ADMIN_PANEL_ENABLED', adminContext)).toBe(true);
      expect(service.isEnabled('DOMAIN_ADMIN_PANEL_ENABLED', userContext)).toBe(false);
    });

    it('should evaluate domain tier conditions correctly', () => {
      const premiumContext = { domainTier: 'premium' };
      const basicContext = { domainTier: 'basic' };

      expect(service.isEnabled('PREMIUM_DOMAIN_FEATURES_ENABLED', premiumContext)).toBe(true);
      expect(service.isEnabled('PREMIUM_DOMAIN_FEATURES_ENABLED', basicContext)).toBe(false);
    });

    it('should handle missing context values', () => {
      const emptyContext = {};
      // Flags with conditions should return false when context is missing
      expect(service.isEnabled('DOMAIN_ADMIN_PANEL_ENABLED', emptyContext)).toBe(false);
      expect(service.isEnabled('PREMIUM_DOMAIN_FEATURES_ENABLED', emptyContext)).toBe(false);
    });
  });

  describe('Overrides', () => {
    it('should respect overrides', () => {
      // Initially enabled
      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);

      // Override to disable
      service.override('DOMAIN_LAYER_ENABLED', false);
      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(false);

      // Clear override
      service.clearOverride('DOMAIN_LAYER_ENABLED');
      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);
    });

    it('should clear all overrides', () => {
      service.override('DOMAIN_LAYER_ENABLED', false);
      service.override('CUSTOM_DOMAINS_ENABLED', false);

      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(false);
      expect(service.isEnabled('CUSTOM_DOMAINS_ENABLED')).toBe(false);

      service.clearAllOverrides();

      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(true);
      // Note: CUSTOM_DOMAINS_ENABLED might still be false due to rollout percentage
    });
  });

  describe('Flag management', () => {
    it('should add new flags', () => {
      const newFlag: FeatureFlag = {
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'A test flag',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development'],
      };

      service.setFlag(newFlag);
      expect(service.getFlag('TEST_FLAG')).toEqual(newFlag);
      expect(service.isEnabled('TEST_FLAG')).toBe(true);
    });

    it('should update existing flags', () => {
      const updatedFlag: FeatureFlag = {
        key: 'DOMAIN_LAYER_ENABLED',
        name: 'Updated Domain Layer',
        description: 'Updated description',
        enabled: false,
        rolloutPercentage: 50,
        environments: ['development'],
      };

      service.setFlag(updatedFlag);
      const flag = service.getFlag('DOMAIN_LAYER_ENABLED');
      expect(flag?.name).toBe('Updated Domain Layer');
      expect(flag?.enabled).toBe(false);
    });

    it('should remove flags', () => {
      expect(service.getFlag('DOMAIN_LAYER_ENABLED')).toBeDefined();
      
      service.removeFlag('DOMAIN_LAYER_ENABLED');
      
      expect(service.getFlag('DOMAIN_LAYER_ENABLED')).toBeNull();
      expect(service.isEnabled('DOMAIN_LAYER_ENABLED')).toBe(false);
    });
  });

  describe('Filtering and querying', () => {
    it('should get enabled flags for context', () => {
      const context = { userRole: 'admin' };
      const enabledFlags = service.getEnabledFlags(context);
      
      expect(enabledFlags).toContain('DOMAIN_LAYER_ENABLED');
      expect(enabledFlags).toContain('DOMAIN_ADMIN_PANEL_ENABLED');
    });

    it('should filter flags by category', () => {
      const coreFlags = service.getFlagsByCategory('core');
      const securityFlags = service.getFlagsByCategory('security');
      
      expect(coreFlags.length).toBeGreaterThan(0);
      expect(securityFlags.length).toBeGreaterThan(0);
      
      expect(coreFlags.some(flag => flag.key === 'DOMAIN_LAYER_ENABLED')).toBe(true);
      expect(securityFlags.some(flag => flag.key === 'DOMAIN_VERIFICATION_ENABLED')).toBe(true);
    });

    it('should filter flags by environment', () => {
      const devFlags = service.getFlagsByEnvironment('development');
      const prodFlags = service.getFlagsByEnvironment('production');
      
      expect(devFlags.length).toBeGreaterThan(prodFlags.length);
      expect(devFlags.some(flag => flag.key === 'DOMAIN_DEBUG_MODE_ENABLED')).toBe(true);
      expect(prodFlags.some(flag => flag.key === 'DOMAIN_DEBUG_MODE_ENABLED')).toBe(false);
    });
  });

  describe('Rollout status', () => {
    it('should provide rollout status information', () => {
      const status = service.getRolloutStatus('CUSTOM_DOMAINS_ENABLED');
      
      expect(status).toMatchObject({
        enabled: expect.any(Boolean),
        rolloutPercentage: expect.any(Number),
        environments: expect.any(Array),
        currentEnvironment: 'development',
        availableInCurrentEnv: expect.any(Boolean),
      });
    });

    it('should return null for non-existent flags', () => {
      const status = service.getRolloutStatus('NON_EXISTENT_FLAG');
      expect(status).toBeNull();
    });
  });

  describe('Bulk operations', () => {
    it('should toggle flags by category', () => {
      // Get initial state
      const debugFlags = service.getFlagsByCategory('debug');
      const initialStates = debugFlags.map(flag => flag.enabled);
      
      // Disable all debug flags
      service.toggleFlagsByCategory('debug', false);
      
      const updatedFlags = service.getFlagsByCategory('debug');
      updatedFlags.forEach(flag => {
        expect(flag.enabled).toBe(false);
      });
      
      // Re-enable debug flags
      service.toggleFlagsByCategory('debug', true);
      
      const reEnabledFlags = service.getFlagsByCategory('debug');
      reEnabledFlags.forEach(flag => {
        expect(flag.enabled).toBe(true);
      });
    });
  });

  describe('Configuration export/import', () => {
    it('should export configuration', () => {
      service.override('TEST_FLAG', true);
      
      const config = service.exportConfiguration();
      
      expect(config).toHaveProperty('environment', 'development');
      expect(config).toHaveProperty('flags');
      expect(config).toHaveProperty('overrides');
      expect(config).toHaveProperty('timestamp');
      expect(config.overrides).toHaveProperty('TEST_FLAG', true);
    });

    it('should import configuration', () => {
      const testFlag: FeatureFlag = {
        key: 'IMPORTED_FLAG',
        name: 'Imported Flag',
        description: 'An imported flag',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development'],
      };

      const config = {
        flags: [testFlag],
        overrides: { 'IMPORTED_FLAG': false },
      };

      service.importConfiguration(config);
      
      expect(service.getFlag('IMPORTED_FLAG')).toEqual(testFlag);
      expect(service.isEnabled('IMPORTED_FLAG')).toBe(false); // Override should apply
    });
  });

  describe('Error handling', () => {
    it('should handle missing flags gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      const result = service.isEnabled('NON_EXISTENT_FLAG');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Feature flag 'NON_EXISTENT_FLAG' not found, defaulting to false"
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid condition types', () => {
      const invalidFlag: FeatureFlag = {
        key: 'INVALID_FLAG',
        name: 'Invalid Flag',
        description: 'Flag with invalid condition',
        enabled: true,
        rolloutPercentage: 100,
        environments: ['development'],
        conditions: [
          {
            type: 'invalid_type' as any,
            operator: 'equals',
            value: 'test',
          },
        ],
      };

      service.setFlag(invalidFlag);
      
      expect(service.isEnabled('INVALID_FLAG')).toBe(false);
    });
  });
});

describe('Domain flags convenience functions', () => {
  beforeEach(() => {
    // Reset the singleton service
    (domainFlags as any).getFeatureFlagService = () => new FeatureFlagService('development');
  });

  it('should provide convenient access to domain flags', () => {
    expect(typeof domainFlags.isDomainLayerEnabled()).toBe('boolean');
    expect(typeof domainFlags.isCustomDomainsEnabled()).toBe('boolean');
    expect(typeof domainFlags.isDomainVerificationEnabled()).toBe('boolean');
    expect(typeof domainFlags.isCrossDomainSharingEnabled()).toBe('boolean');
    expect(typeof domainFlags.isSoleDomainIsolationEnabled()).toBe('boolean');
    expect(typeof domainFlags.isDomainCachingEnabled()).toBe('boolean');
  });

  it('should pass context to underlying service', () => {
    const context = { userRole: 'admin' };
    
    // This should work with context
    expect(typeof domainFlags.isDomainAdminPanelEnabled(context)).toBe('boolean');
    expect(typeof domainFlags.isPremiumDomainFeaturesEnabled({ domainTier: 'premium' })).toBe('boolean');
  });
});

describe('Hash function', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService('development');
  });

  it('should produce consistent hashes', () => {
    const hash1 = (service as any).simpleHash('test:user-123');
    const hash2 = (service as any).simpleHash('test:user-123');
    
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = (service as any).simpleHash('test:user-123');
    const hash2 = (service as any).simpleHash('test:user-456');
    
    expect(hash1).not.toBe(hash2);
  });

  it('should always return positive numbers', () => {
    const testStrings = [
      'test:user-123',
      'flag:domain-abc',
      'rollout:special-chars-!@#$%',
      '',
    ];

    testStrings.forEach(str => {
      const hash = (service as any).simpleHash(str);
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Condition evaluation', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService('development');
  });

  it('should evaluate equals operator correctly', () => {
    const condition = { type: 'user_id' as const, operator: 'equals' as const, value: 'user-123' };
    
    expect((service as any).evaluateCondition(condition, { userId: 'user-123' })).toBe(true);
    expect((service as any).evaluateCondition(condition, { userId: 'user-456' })).toBe(false);
  });

  it('should evaluate contains operator correctly', () => {
    const condition = { type: 'user_email' as const, operator: 'contains' as const, value: '@example.com' };
    
    expect((service as any).evaluateCondition(condition, { userEmail: 'test@example.com' })).toBe(true);
    expect((service as any).evaluateCondition(condition, { userEmail: 'test@other.com' })).toBe(false);
  });

  it('should evaluate in operator correctly', () => {
    const condition = { type: 'user_role' as const, operator: 'in' as const, value: ['admin', 'moderator'] };
    
    expect((service as any).evaluateCondition(condition, { userRole: 'admin' })).toBe(true);
    expect((service as any).evaluateCondition(condition, { userRole: 'user' })).toBe(false);
  });

  it('should evaluate not_in operator correctly', () => {
    const condition = { type: 'user_role' as const, operator: 'not_in' as const, value: ['banned', 'suspended'] };
    
    expect((service as any).evaluateCondition(condition, { userRole: 'user' })).toBe(true);
    expect((service as any).evaluateCondition(condition, { userRole: 'banned' })).toBe(false);
  });
}); 