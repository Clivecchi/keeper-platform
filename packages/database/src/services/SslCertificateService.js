/**
 * SSL Certificate Management Service
 * Handles automated SSL certificate provisioning, renewal, and monitoring
 */
import { getFeatureFlagService } from './FeatureFlagService';
import * as crypto from 'crypto';
// Type guards
function isCertificateRecord(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'domainId' in obj &&
        'customDomain' in obj &&
        'provider' in obj &&
        'status' in obj);
}
function hasCertificateMetadata(obj) {
    return (isCertificateRecord(obj) &&
        'metadata' in obj &&
        typeof obj.metadata === 'object' &&
        obj.metadata !== null);
}
function hasDomainField(obj) {
    return (isCertificateRecord(obj) &&
        'domain' in obj &&
        typeof obj.domain === 'string');
}
export class SslCertificateService {
    constructor(prisma, cacheService) {
        this.featureFlags = getFeatureFlagService();
        // Certificate providers configuration
        this.PROVIDERS = {
            letsencrypt: {
                name: 'Let\'s Encrypt',
                apiUrl: 'https://acme-v02.api.letsencrypt.org/directory',
                staging: 'https://acme-staging-v02.api.letsencrypt.org/directory',
                maxValidityDays: 90,
                renewalDaysBefore: 30,
            },
            cloudflare: {
                name: 'Cloudflare',
                apiUrl: 'https://api.cloudflare.com/client/v4',
                maxValidityDays: 90,
                renewalDaysBefore: 30,
            },
            vercel: {
                name: 'Vercel',
                apiUrl: 'https://api.vercel.com/v1',
                maxValidityDays: 90,
                renewalDaysBefore: 30,
            },
            custom: {
                name: 'Custom Provider',
                apiUrl: '',
                maxValidityDays: 365,
                renewalDaysBefore: 30,
            },
        };
        this.prisma = prisma;
        this.cacheService = cacheService;
    }
    /**
     * Request SSL certificate for domain
     */
    async requestCertificate(request) {
        if (!this.featureFlags.isEnabled('SSL_CERTIFICATES_ENABLED')) {
            throw new Error('SSL certificate management is currently disabled');
        }
        // Validate domain
        const domain = await this.prisma.domain.findUnique({
            where: { id: request.domainId },
        });
        if (!domain) {
            throw new Error('Domain not found');
        }
        if (!domain.customDomain || !domain.customDomainVerified) {
            throw new Error('Custom domain must be verified before requesting SSL certificate');
        }
        // Check if certificate already exists
        const existingCert = await this.getCertificateByDomain(request.customDomain);
        if (existingCert && existingCert.status === 'active') {
            throw new Error('Active certificate already exists for this domain');
        }
        // Create certificate record
        const certificateInfo = await this.createCertificateRecord(request);
        // Initiate certificate provisioning
        try {
            const provisionedCert = await this.provisionCertificate(request);
            // Update certificate with provisioned data
            await this.updateCertificateRecord(certificateInfo.id, {
                status: 'active',
                issuedAt: new Date(),
                expiresAt: provisionedCert.expiresAt,
                renewalAt: provisionedCert.renewalAt,
                issuer: provisionedCert.issuer,
                serialNumber: provisionedCert.serialNumber,
                fingerprintSha256: provisionedCert.fingerprintSha256,
                metadata: provisionedCert.metadata,
            });
            // Cache certificate info
            await this.cacheService.cacheData(`ssl_cert:${request.customDomain}`, provisionedCert, 3600 // 1 hour
            );
            return provisionedCert;
        }
        catch (error) {
            // Update certificate status to failed
            await this.updateCertificateRecord(certificateInfo.id, {
                status: 'failed',
                metadata: {
                    ...certificateInfo.metadata,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            throw error;
        }
    }
    /**
     * Renew SSL certificate
     */
    async renewCertificate(certificate) {
        const daysUntilExpiry = certificate.validUntil ?
            (certificate.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 0;
        if (daysUntilExpiry > 30) {
            return certificate; // Too early to renew
        }
        try {
            const renewedCert = await this.provisionThroughProvider({
                domainId: certificate.domainId,
                customDomain: certificate.customDomain,
                provider: certificate.provider,
                autoRenewal: true,
            });
            // Update cache
            await this.cacheService.cacheData(`ssl_cert:${certificate.customDomain}`, {
                ...renewedCert,
                metadata: {
                    ...renewedCert.metadata,
                    lastRenewalAttempt: new Date(),
                }
            });
            return {
                ...renewedCert,
                status: 'valid',
                expiresAt: renewedCert.validUntil,
                renewalAt: renewedCert.validUntil,
                serialNumber: renewedCert.serialNumber,
                fingerprintSha256: renewedCert.fingerprintSha256,
                metadata: {
                    ...renewedCert.metadata,
                    issuedAt: new Date(),
                }
            };
        }
        catch (error) {
            // Update failure count
            const failureCount = (certificate.renewalFailureCount || 0) + 1;
            const updatedCert = {
                ...certificate,
                renewalFailureCount: failureCount,
                status: failureCount >= 3 ? 'failed' : certificate.status,
                metadata: {
                    ...certificate.metadata,
                    lastRenewalAttempt: new Date(),
                    error: error instanceof Error ? error.message : 'Unknown error',
                }
            };
            await this.cacheService.deleteData(`ssl_cert:${certificate.customDomain}`);
            console.log(`SSL certificate renewal failed for ${certificate.customDomain}:`, error);
            return updatedCert;
        }
    }
    /**
     * Validate SSL certificate
     */
    async validateCertificate(domain) {
        try {
            // In a real implementation, this would perform actual SSL validation
            // For now, we'll simulate validation
            const certificate = await this.getCertificateByDomain(domain);
            if (!certificate) {
                return {
                    isValid: false,
                    issues: ['No SSL certificate found'],
                    warnings: [],
                    recommendations: ['Request an SSL certificate for this domain'],
                    securityScore: 0,
                    details: {
                        domainValidated: false,
                        chainValid: false,
                        keyStrengthAdequate: false,
                        expirationWarning: false,
                        wildcardCertificate: false,
                        extendedValidation: false,
                    },
                };
            }
            const issues = [];
            const warnings = [];
            const recommendations = [];
            let securityScore = 100;
            // Check expiration
            const daysUntilExpiry = Math.ceil((certificate.expiresAt ? certificate.expiresAt.getTime() : Date.now()) - Date.now() / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 0) {
                issues.push('Certificate has expired');
                securityScore -= 50;
            }
            else if (daysUntilExpiry <= 7) {
                warnings.push('Certificate expires within 7 days');
                securityScore -= 20;
            }
            else if (daysUntilExpiry <= 30) {
                warnings.push('Certificate expires within 30 days');
                securityScore -= 10;
            }
            // Check key algorithm
            const keyAlgorithm = certificate.metadata?.keyAlgorithm || 'RSA-2048';
            if (keyAlgorithm === 'RSA-2048') {
                recommendations.push('Consider upgrading to RSA-4096 or ECDSA for better security');
                securityScore -= 5;
            }
            // Check domain validation
            const domainValidated = certificate.customDomain === domain;
            if (!domainValidated) {
                issues.push('Certificate domain does not match requested domain');
                securityScore -= 30;
            }
            // Check if wildcard certificate
            const wildcardCertificate = certificate.commonName ? certificate.commonName.startsWith('*.') : false;
            return {
                isValid: issues.length === 0,
                issues,
                warnings,
                recommendations,
                securityScore,
                details: {
                    domainValidated,
                    chainValid: true, // Simulated
                    keyStrengthAdequate: !['RSA-1024'].includes(keyAlgorithm),
                    expirationWarning: daysUntilExpiry <= 30,
                    wildcardCertificate,
                    extendedValidation: false, // Simulated
                },
            };
        }
        catch (error) {
            return {
                isValid: false,
                issues: [`Certificate validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
                recommendations: [],
                securityScore: 0,
                details: {
                    domainValidated: false,
                    chainValid: false,
                    keyStrengthAdequate: false,
                    expirationWarning: false,
                    wildcardCertificate: false,
                    extendedValidation: false,
                },
            };
        }
    }
    /**
     * Get certificate by domain
     */
    async getCertificateByDomain(domain) {
        try {
            // Check cache first
            const cached = await this.cacheService.getData(`ssl_cert:${domain}`);
            if (cached) {
                return cached;
            }
            // Query database
            const certificate = await this.prisma.sslCertificate.findFirst({
                where: { customDomain: domain },
                orderBy: { createdAt: 'desc' },
            });
            if (!certificate) {
                return null;
            }
            const certInfo = this.transformCertificateRecord(certificate);
            // Cache the result
            await this.cacheService.cacheData(`ssl_cert:${domain}`, certInfo, 3600);
            return certInfo;
        }
        catch (error) {
            console.error('Error getting certificate by domain:', error);
            return null;
        }
    }
    /**
     * Get certificate by ID
     */
    async getCertificateById(id) {
        try {
            const certificate = await this.prisma.sslCertificate.findUnique({
                where: { id },
            });
            if (!certificate) {
                return null;
            }
            return this.transformCertificateRecord(certificate);
        }
        catch (error) {
            console.error('Error getting certificate by ID:', error);
            return null;
        }
    }
    /**
     * Monitor certificate renewals
     */
    async monitorRenewals() {
        const results = [];
        let processed = 0;
        let renewed = 0;
        let failed = 0;
        try {
            // Find certificates that need renewal
            const certificatesForRenewal = await this.prisma.sslCertificate.findMany({
                where: {
                    status: 'active',
                    autoRenewal: true,
                    nextRenewalCheck: {
                        lte: new Date(),
                    },
                },
                orderBy: { validUntil: 'asc' },
            });
            for (const certificate of certificatesForRenewal) {
                processed++;
                try {
                    const renewalResult = await this.renewCertificate(this.transformCertificateRecord(certificate));
                    const result = {
                        certificateId: certificate.id,
                        success: renewalResult.status === 'valid',
                        customDomain: certificate.customDomain,
                        provider: certificate.provider,
                        status: renewalResult.status,
                        validUntil: renewalResult.validUntil,
                        error: renewalResult.status === 'failed' ? 'Renewal failed' : null,
                    };
                    results.push(result);
                    if (result.success) {
                        renewed++;
                    }
                    else {
                        failed++;
                    }
                }
                catch (error) {
                    failed++;
                    results.push({
                        certificateId: certificate.id,
                        success: false,
                        customDomain: certificate.customDomain,
                        provider: certificate.provider,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
                // Small delay between renewals
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return { processed, renewed, failed, results };
        }
        catch (error) {
            console.error('Error monitoring certificate renewals:', error);
            return { processed, renewed, failed, results };
        }
    }
    /**
     * Private helper methods
     */
    async createCertificateRecord(request) {
        const id = crypto.randomUUID();
        const renewalAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
        const certificate = await this.prisma.sslCertificate.create({
            data: {
                id,
                customDomain: request.customDomain,
                domain: {
                    connect: { id: request.domainId }
                },
                provider: request.provider,
                status: 'pending',
                commonName: request.customDomain,
                autoRenewal: request.autoRenewal || false,
                nextRenewalCheck: renewalAt,
                certificateData: '',
                privateKey: '',
                issuer: 'Let\'s Encrypt Authority X3',
                serialNumber: crypto.randomBytes(16).toString('hex'),
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
        });
        return this.transformCertificateRecord(certificate);
    }
    async updateCertificateRecord(id, updates) {
        await this.prisma.sslCertificate.update({
            where: { id },
            data: {
                status: updates.status,
                provider: updates.provider,
                validFrom: updates.validFrom,
                validUntil: updates.validUntil,
                updatedAt: new Date(),
            },
        });
    }
    async provisionCertificate(request) {
        // Validate domain exists
        const domain = await this.prisma.domain.findUnique({
            where: { id: request.domainId },
        });
        if (!domain) {
            throw new Error(`Domain not found: ${request.domainId}`);
        }
        // Check for existing certificate
        const existingCert = await this.getCertificateInfo(domain.customDomain || domain.slug);
        if (existingCert && existingCert.status === 'valid') {
            return existingCert;
        }
        try {
            // Provision certificate through provider
            const provisionedCert = await this.provisionThroughProvider(request);
            // Cache certificate info
            await this.cacheService.cacheData(`ssl_cert:${request.customDomain}`, {
                ...provisionedCert,
                metadata: {
                    ...provisionedCert.metadata,
                    issuedAt: new Date(),
                }
            });
            return provisionedCert;
        }
        catch (error) {
            return {
                id: '',
                domainId: request.domainId,
                customDomain: request.customDomain,
                provider: request.provider,
                status: 'failed',
                validFrom: new Date(),
                validUntil: new Date(),
                metadata: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
    async performRenewal(certificate) {
        // This is a simplified simulation of certificate renewal
        // In a real implementation, this would use the appropriate provider API
        const provider = this.PROVIDERS[certificate.provider];
        const expiresAt = new Date(Date.now() + provider.maxValidityDays * 24 * 60 * 60 * 1000);
        const renewalAt = new Date(expiresAt.getTime() - provider.renewalDaysBefore * 24 * 60 * 60 * 1000);
        return {
            ...certificate,
            issuedAt: new Date(),
            expiresAt,
            renewalAt,
            serialNumber: crypto.randomBytes(16).toString('hex'),
            fingerprintSha256: crypto.randomBytes(32).toString('hex'),
            metadata: {
                ...certificate.metadata,
                certificateChain: [
                    'Renewed certificate data would be here',
                    'Intermediate certificate data',
                    'Root certificate data',
                ],
            },
        };
    }
    async sendRenewalNotifications(certificate, success, error) {
        const notifications = [];
        // This would integrate with your notification system
        // For now, we'll just log the notifications
        if (success) {
            console.log(`SSL certificate renewed successfully for ${certificate.customDomain}`);
            notifications.push('renewal_success');
        }
        else {
            console.log(`SSL certificate renewal failed for ${certificate.customDomain}:`, error);
            notifications.push('renewal_failure');
        }
        return notifications;
    }
    transformCertificateRecord(record) {
        if (!isCertificateRecord(record)) {
            throw new Error('Invalid certificate record');
        }
        return {
            id: record.id,
            domainId: record.domainId,
            customDomain: record.customDomain,
            provider: record.provider,
            status: record.status,
            validFrom: record.validFrom,
            validUntil: record.validUntil,
            commonName: record.commonName,
            serialNumber: record.serialNumber,
            fingerprintSha256: record.fingerprintSha256,
            metadata: record.metadata || {},
        };
    }
    /**
     * Get certificate information with error handling
     */
    async getCertificateInfo(certificateId) {
        try {
            const certificate = await this.prisma.sslCertificate.findUnique({
                where: { id: certificateId },
                include: { domain: true },
            });
            if (!certificate) {
                return null;
            }
            const provider = this.PROVIDERS[certificate.provider];
            if (!provider) {
                return {
                    id: certificate.id,
                    domainId: certificate.domainId,
                    customDomain: certificate.customDomain,
                    provider: certificate.provider,
                    status: certificate.status,
                    validFrom: certificate.validFrom,
                    validUntil: certificate.validUntil,
                    metadata: {},
                };
            }
            return {
                id: certificate.id,
                domainId: certificate.domainId,
                customDomain: certificate.customDomain,
                provider: certificate.provider,
                status: certificate.status,
                validFrom: certificate.validFrom,
                validUntil: certificate.validUntil,
                metadata: {
                    challengeType: 'http-01',
                    validationMethod: 'automatic',
                    keyAlgorithm: 'RSA-2048',
                    certificateChain: certificate.certificateChain,
                },
            };
        }
        catch (error) {
            console.error('Error getting certificate info:', error);
            return {
                id: certificateId,
                domainId: '',
                customDomain: '',
                provider: 'custom',
                status: 'error',
                validFrom: new Date(),
                validUntil: new Date(),
                metadata: {},
            };
        }
    }
    /**
     * Check if a certificate needs renewal
     */
    async checkRenewalNeeded(certificate) {
        if (!certificate.expiresAt && !certificate.validUntil)
            return false;
        const expiryDate = certificate.expiresAt || certificate.validUntil;
        const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 30;
    }
    /**
     * Validate domain ownership for certificate
     */
    async validateDomainOwnership(certificate, domain) {
        try {
            // Basic validation - check if certificate domain matches requested domain
            const domainValidated = certificate.customDomain === domain;
            // Check if it's a wildcard certificate
            const wildcardCertificate = certificate.commonName &&
                certificate.commonName.startsWith('*.');
            if (wildcardCertificate && certificate.commonName) {
                const wildcardDomain = certificate.commonName.substring(2);
                return domain.endsWith(wildcardDomain);
            }
            return domainValidated;
        }
        catch (error) {
            console.error('Domain ownership validation failed:', error);
            return false;
        }
    }
    /**
     * Get certificates expiring soon
     */
    async getCertificatesExpiringSoon(days = 30) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        try {
            const certificates = await this.prisma.sslCertificate.findMany({
                where: {
                    validUntil: { lte: expiryDate },
                    autoRenewal: true,
                },
                orderBy: { validUntil: 'asc' },
                include: {
                    domain: true,
                },
            });
            return certificates.map(cert => this.certificateToInfo(cert));
        }
        catch (error) {
            console.error('Error fetching expiring certificates:', error);
            return [];
        }
    }
    /**
     * Create certificate in database
     */
    async createCertificate(request) {
        await this.prisma.sslCertificate.create({
            data: {
                domainId: request.domainId,
                customDomain: request.customDomain,
                certificateData: '',
                privateKey: '',
                provider: request.provider,
                commonName: request.customDomain,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                autoRenewal: request.autoRenewal || false,
                status: 'pending',
                issuer: 'Let\'s Encrypt Authority X3',
                serialNumber: Math.random().toString(36).substring(2, 15),
            },
        });
    }
    /**
     * Provision certificate through provider
     */
    async provisionThroughProvider(request) {
        // Mock implementation for now - would integrate with actual providers
        return {
            id: '',
            domainId: request.domainId,
            customDomain: request.customDomain,
            provider: request.provider,
            status: 'valid',
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            metadata: {
                challengeType: request.challengeType || 'http-01',
                issuedAt: new Date(),
            },
        };
    }
    /**
     * Convert database certificate to CertificateInfo format
     */
    certificateToInfo(cert) {
        if (!isCertificateRecord(cert)) {
            throw new Error('Invalid certificate record');
        }
        return {
            id: cert.id,
            domainId: cert.domainId,
            customDomain: cert.customDomain,
            provider: cert.provider,
            status: cert.status,
            validFrom: cert.validFrom,
            validUntil: cert.validUntil,
            commonName: cert.commonName,
            serialNumber: cert.serialNumber,
            fingerprintSha256: cert.fingerprintSha256,
            metadata: {
                challengeType: cert.challengeType || 'http-01',
                issuedAt: cert.issuedAt,
                lastRenewalAttempt: cert.lastRenewalAttempt,
            },
        };
    }
    /**
     * Bulk renewal of certificates
     */
    async bulkRenewalCertificates() {
        const certificates = await this.getCertificatesExpiringSoon();
        const results = [];
        for (const certificate of certificates) {
            try {
                const renewalResult = await this.renewCertificate(certificate);
                results.push({
                    certificateId: certificate.id,
                    success: renewalResult.status === 'valid',
                    customDomain: certificate.customDomain,
                    provider: certificate.provider,
                    status: renewalResult.status,
                    validUntil: renewalResult.validUntil,
                    error: renewalResult.status === 'failed' ? renewalResult.metadata?.error : null,
                });
            }
            catch (error) {
                results.push({
                    certificateId: certificate.id,
                    success: false,
                    customDomain: certificate.customDomain,
                    provider: certificate.provider,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    /**
     * Update certificate status
     */
    async updateCertificateStatus(certificateId, status) {
        await this.prisma.sslCertificate.update({
            where: { id: certificateId },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
    }
}
export default SslCertificateService;
//# sourceMappingURL=SslCertificateService.js.map