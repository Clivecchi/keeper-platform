/**
 * Domain Verification Service
 * Handles custom domain verification through DNS, HTTP, and file-based methods
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
export type VerificationMethod = 'DNS_TXT' | 'DNS_CNAME' | 'HTTP_FILE' | 'META_TAG';
export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';
export interface VerificationConfig {
    method: VerificationMethod;
    token: string;
    expectedValue: string;
    instructions: string;
    expiresAt: Date;
}
export interface VerificationResult {
    success: boolean;
    method: VerificationMethod;
    verifiedAt?: Date;
    error?: string;
    details?: any;
    nextRetryAt?: Date;
}
export interface DomainHealthCheck {
    domain: string;
    isReachable: boolean;
    responseTime: number;
    sslValid: boolean;
    sslExpiresAt?: Date;
    dnsResolution: {
        hasARecord: boolean;
        hasCnameRecord: boolean;
        pointsToKeeper: boolean;
        resolvedIps: string[];
    };
    httpChecks: {
        httpStatus?: number;
        httpsStatus?: number;
        redirectsToHttps: boolean;
        hasKeeperHeaders: boolean;
    };
    lastChecked: Date;
    issues: string[];
    recommendations: string[];
}
export declare class DomainVerificationService {
    private prisma;
    private cacheService;
    private featureFlags;
    private readonly KEEPER_DOMAINS;
    private readonly KEEPER_IPS;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Initiate domain verification process
     */
    initiateVerification(domainId: string, customDomain: string, method?: VerificationMethod): Promise<VerificationConfig>;
    /**
     * Verify domain ownership
     */
    verifyDomain(domainId: string): Promise<VerificationResult>;
    /**
     * Verify DNS TXT record
     */
    private verifyDnsTxt;
    /**
     * Verify DNS CNAME record
     */
    private verifyDnsCname;
    /**
     * Verify HTTP file method
     */
    private verifyHttpFile;
    /**
     * Verify HTML meta tag method
     */
    private verifyMetaTag;
    /**
     * Perform comprehensive domain health check
     */
    checkDomainHealth(customDomain: string): Promise<DomainHealthCheck>;
    /**
     * Generate verification configuration
     */
    private generateVerificationConfig;
    /**
     * Check DNS resolution for domain
     */
    private checkDnsResolution;
    /**
     * Check HTTP/HTTPS endpoints
     */
    private checkHttpEndpoints;
    /**
     * Check SSL certificate
     */
    private checkSslCertificate;
    /**
     * Utility methods
     */
    private validateDomainFormat;
    private checkDomainAvailability;
    private generateVerificationToken;
    private logVerificationAttempt;
    /**
     * Batch verification for multiple domains
     */
    batchVerifyDomains(domainIds: string[]): Promise<Map<string, VerificationResult>>;
}
export default DomainVerificationService;
//# sourceMappingURL=DomainVerificationService.d.ts.map