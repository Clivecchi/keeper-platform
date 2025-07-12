/**
 * SSL Certificate Management Service
 * Handles automated SSL certificate provisioning, renewal, and monitoring
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { CertificateProvider, CertificateStatus, CertificateInfo, CertificateRequest } from '../types/ssl';
export interface CertificateValidation {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
    securityScore: number;
    details: {
        domainValidated: boolean;
        chainValid: boolean;
        keyStrengthAdequate: boolean;
        expirationWarning: boolean;
        wildcardCertificate: boolean;
        extendedValidation: boolean;
    };
}
export interface RenewalResult {
    certificateId: string;
    success: boolean;
    customDomain: string;
    provider: CertificateProvider;
    status: CertificateStatus;
    validUntil?: Date;
    error?: string | null;
}
export declare class SslCertificateService {
    private prisma;
    private cacheService;
    private featureFlags;
    private readonly PROVIDERS;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Request SSL certificate for domain
     */
    requestCertificate(request: CertificateRequest): Promise<CertificateInfo>;
    /**
     * Renew SSL certificate
     */
    renewCertificate(certificate: CertificateInfo): Promise<CertificateInfo>;
    /**
     * Validate SSL certificate
     */
    validateCertificate(domain: string): Promise<CertificateValidation>;
    /**
     * Get certificate by domain
     */
    getCertificateByDomain(domain: string): Promise<CertificateInfo | null>;
    /**
     * Get certificate by ID
     */
    getCertificateById(id: string): Promise<CertificateInfo | null>;
    /**
     * Monitor certificate renewals
     */
    monitorRenewals(): Promise<{
        processed: number;
        renewed: number;
        failed: number;
        results: RenewalResult[];
    }>;
    /**
     * Private helper methods
     */
    private createCertificateRecord;
    private updateCertificateRecord;
    private provisionCertificate;
    private performRenewal;
    private sendRenewalNotifications;
    private transformCertificateRecord;
    /**
     * Get certificate information with error handling
     */
    getCertificateInfo(certificateId: string): Promise<CertificateInfo | null>;
    /**
     * Check if a certificate needs renewal
     */
    checkRenewalNeeded(certificate: CertificateInfo): Promise<boolean>;
    /**
     * Validate domain ownership for certificate
     */
    validateDomainOwnership(certificate: CertificateInfo, domain: string): Promise<boolean>;
    /**
     * Get certificates expiring soon
     */
    getCertificatesExpiringSoon(days?: number): Promise<CertificateInfo[]>;
    /**
     * Create certificate in database
     */
    private createCertificate;
    /**
     * Provision certificate through provider
     */
    private provisionThroughProvider;
    /**
     * Convert database certificate to CertificateInfo format
     */
    private certificateToInfo;
    /**
     * Bulk renewal of certificates
     */
    bulkRenewalCertificates(): Promise<RenewalResult[]>;
    /**
     * Update certificate status
     */
    updateCertificateStatus(certificateId: string, status: CertificateStatus): Promise<void>;
}
export default SslCertificateService;
//# sourceMappingURL=SslCertificateService.d.ts.map