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
export declare class FeatureFlagService {
    private flags;
    private environment;
    private overrides;
    constructor(environment?: string);
    /**
     * Initialize default domain-related feature flags
     */
    private initializeDefaultFlags;
    /**
     * Check if a feature flag is enabled for the given context
     */
    isEnabled(flagKey: string, context?: FeatureFlagContext): boolean;
    /**
     * Get all enabled feature flags for the given context
     */
    getEnabledFlags(context?: FeatureFlagContext): string[];
    /**
     * Get feature flag details
     */
    getFlag(flagKey: string): FeatureFlag | null;
    /**
     * Get all feature flags
     */
    getAllFlags(): FeatureFlag[];
    /**
     * Override a feature flag (useful for testing)
     */
    override(flagKey: string, enabled: boolean): void;
    /**
     * Clear override for a feature flag
     */
    clearOverride(flagKey: string): void;
    /**
     * Clear all overrides
     */
    clearAllOverrides(): void;
    /**
     * Add or update a feature flag
     */
    setFlag(flag: FeatureFlag): void;
    /**
     * Remove a feature flag
     */
    removeFlag(flagKey: string): void;
    /**
     * Evaluate feature flag conditions
     */
    private evaluateConditions;
    /**
     * Evaluate a single condition
     */
    private evaluateCondition;
    /**
     * Determine if a user/domain is in the rollout percentage
     */
    private isInRollout;
    /**
     * Simple hash function for rollout calculation
     */
    private simpleHash;
    /**
     * Get feature flags filtered by category
     */
    getFlagsByCategory(category: string): FeatureFlag[];
    /**
     * Get feature flags filtered by environment
     */
    getFlagsByEnvironment(environment: string): FeatureFlag[];
    /**
     * Get rollout status for a flag
     */
    getRolloutStatus(flagKey: string): {
        enabled: boolean;
        rolloutPercentage: number;
        environments: string[];
        currentEnvironment: string;
        availableInCurrentEnv: boolean;
    } | null;
    /**
     * Bulk enable/disable flags by category
     */
    toggleFlagsByCategory(category: string, enabled: boolean): void;
    /**
     * Export current flag configuration
     */
    exportConfiguration(): Record<string, unknown>;
    /**
     * Import flag configuration
     */
    importConfiguration(config: Record<string, unknown>): void;
}
export declare function getFeatureFlagService(): FeatureFlagService;
export declare const domainFlags: {
    isDomainLayerEnabled: (context?: FeatureFlagContext) => boolean;
    isCustomDomainsEnabled: (context?: FeatureFlagContext) => boolean;
    isDomainVerificationEnabled: (context?: FeatureFlagContext) => boolean;
    isCrossDomainSharingEnabled: (context?: FeatureFlagContext) => boolean;
    isSoleDomainIsolationEnabled: (context?: FeatureFlagContext) => boolean;
    isDomainCachingEnabled: (context?: FeatureFlagContext) => boolean;
    isDomainAdminPanelEnabled: (context?: FeatureFlagContext) => boolean;
    isPremiumDomainFeaturesEnabled: (context?: FeatureFlagContext) => boolean;
};
export default FeatureFlagService;
//# sourceMappingURL=FeatureFlagService.d.ts.map