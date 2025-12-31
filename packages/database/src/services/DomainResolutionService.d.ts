/**
 * Domain Resolution Service
 * Handles hostname-to-domain mapping, CORS configuration, and request routing
 */
import type { Domain } from '@prisma/client';
import { DomainService } from './DomainService';
import { DomainCacheService } from './DomainCacheService';
import type { Request, Response, NextFunction } from 'express';
export interface DomainResolutionResult {
    domain: Domain | null;
    resolutionMethod: 'slug' | 'custom_domain' | 'fallback' | 'not_found';
    allowedOrigins: string[];
    corsHeaders: Record<string, string>;
    isValid: boolean;
    error?: string;
}
export interface SecurityHeaders {
    'Content-Security-Policy'?: string;
    'X-Frame-Options'?: string;
    'X-Content-Type-Options'?: string;
    'Referrer-Policy'?: string;
    'Permissions-Policy'?: string;
}
export interface DomainContext {
    domain: Domain | null;
    hostname: string;
    subdomain?: string;
    isCustomDomain: boolean;
    allowedOrigins: string[];
    securityHeaders: SecurityHeaders;
}
export declare class DomainResolutionService {
    private domainService;
    private cacheService;
    private featureFlags;
    private readonly PLATFORM_DOMAINS;
    private readonly DEFAULT_ORIGINS;
    constructor(domainService: DomainService, cacheService: DomainCacheService);
    /**
     * Resolve domain from hostname with comprehensive fallback logic
     */
    resolveDomain(hostname: string): Promise<DomainResolutionResult>;
    /**
     * Resolve custom domain (e.g., myfamily.com)
     */
    private resolveCustomDomain;
    /**
     * Resolve subdomain (e.g., myfamily.keeper.tools)
     */
    private resolveSubdomain;
    /**
     * Create platform domain result (no specific domain)
     */
    private createPlatformResult;
    /**
     * Create not found result
     */
    private createNotFoundResult;
    /**
     * Create error result
     */
    private createErrorResult;
    /**
     * Generate allowed origins for a domain
     */
    private generateAllowedOrigins;
    /**
     * Generate CORS headers
     */
    private generateCorsHeaders;
    /**
     * Generate security headers for a domain
     */
    generateSecurityHeaders(domain: Domain | null, hostname: string): SecurityHeaders;
    /**
     * Create domain context for request processing
     */
    createDomainContext(hostname: string): Promise<DomainContext>;
    /**
     * Middleware factory for Express.js
     */
    createMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Utility functions
     */
    private normalizeHostname;
    private isPlatformDomain;
    private parseSubdomain;
    private extractHostname;
    /**
     * Validate domain configuration
     */
    validateDomainConfiguration(domainId: string): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }>;
    /**
     * Get domain resolution statistics
     */
    getResolutionStats(domainId?: string): Promise<{
        totalResolutions: number;
        successfulResolutions: number;
        failedResolutions: number;
        averageResolutionTime: number;
        topResolvedDomains: Array<{
            domainId: string;
            count: number;
        }>;
    }>;
}
export default DomainResolutionService;
//# sourceMappingURL=DomainResolutionService.d.ts.map