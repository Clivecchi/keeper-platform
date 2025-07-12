/**
 * Domain Resolution Service
 * Handles hostname-to-domain mapping, CORS configuration, and request routing
 */
import { getFeatureFlagService } from './FeatureFlagService';
export class DomainResolutionService {
    domainService;
    cacheService;
    featureFlags = getFeatureFlagService();
    // Platform domains that should resolve to default behavior
    PLATFORM_DOMAINS = [
        'keeper.tools',
        'app.keeper.tools',
        'studio.keeper.tools',
        'api.keeper.tools',
        'localhost',
        '127.0.0.1',
    ];
    // Default CORS origins for development
    DEFAULT_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://keeper.tools',
        'https://app.keeper.tools',
        'https://studio.keeper.tools',
    ];
    constructor(domainService, cacheService) {
        this.domainService = domainService;
        this.cacheService = cacheService;
    }
    /**
     * Resolve domain from hostname with comprehensive fallback logic
     */
    async resolveDomain(hostname) {
        const normalizedHostname = this.normalizeHostname(hostname);
        try {
            // 1. Check if it's a platform domain
            if (this.isPlatformDomain(normalizedHostname)) {
                return this.createPlatformResult(normalizedHostname);
            }
            // 2. Try direct custom domain lookup
            if (this.featureFlags.isEnabled('CUSTOM_DOMAINS_ENABLED')) {
                const customDomainResult = await this.resolveCustomDomain(normalizedHostname);
                if (customDomainResult.domain) {
                    return customDomainResult;
                }
            }
            // 3. Try subdomain slug resolution (subdomain.keeper.tools)
            const subdomainResult = await this.resolveSubdomain(normalizedHostname);
            if (subdomainResult.domain) {
                return subdomainResult;
            }
            // 4. No domain found
            return this.createNotFoundResult(normalizedHostname);
        }
        catch (error) {
            console.error('Domain resolution error:', error);
            return this.createErrorResult(normalizedHostname, error);
        }
    }
    /**
     * Resolve custom domain (e.g., myfamily.com)
     */
    async resolveCustomDomain(hostname) {
        const domain = await this.domainService.getDomainByHostname(hostname);
        if (!domain) {
            return this.createNotFoundResult(hostname);
        }
        // Verify domain is active and verified
        if (!domain.isActive || domain.status !== 'active' || !domain.customDomainVerified) {
            return this.createErrorResult(hostname, new Error('Domain not active or not verified'));
        }
        const allowedOrigins = this.generateAllowedOrigins(domain, hostname);
        const corsHeaders = this.generateCorsHeaders(allowedOrigins);
        return {
            domain,
            resolutionMethod: 'custom_domain',
            allowedOrigins,
            corsHeaders,
            isValid: true,
        };
    }
    /**
     * Resolve subdomain (e.g., myfamily.keeper.tools)
     */
    async resolveSubdomain(hostname) {
        const { subdomain, baseDomain } = this.parseSubdomain(hostname);
        // Only handle keeper.tools subdomains
        if (!subdomain || !this.isPlatformDomain(baseDomain)) {
            return this.createNotFoundResult(hostname);
        }
        // Try to resolve subdomain as domain slug
        const domain = await this.domainService.getDomainBySlug(subdomain);
        if (!domain) {
            return this.createNotFoundResult(hostname);
        }
        // Verify domain is active
        if (!domain.isActive || domain.status !== 'active') {
            return this.createErrorResult(hostname, new Error('Domain not active'));
        }
        const allowedOrigins = this.generateAllowedOrigins(domain, hostname);
        const corsHeaders = this.generateCorsHeaders(allowedOrigins);
        return {
            domain,
            resolutionMethod: 'slug',
            allowedOrigins,
            corsHeaders,
            isValid: true,
        };
    }
    /**
     * Create platform domain result (no specific domain)
     */
    createPlatformResult(hostname) {
        const allowedOrigins = [...this.DEFAULT_ORIGINS];
        // Add current hostname to allowed origins
        if (!allowedOrigins.some(origin => origin.includes(hostname))) {
            allowedOrigins.push(`https://${hostname}`);
            if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                allowedOrigins.push(`http://${hostname}`);
            }
        }
        return {
            domain: null,
            resolutionMethod: 'fallback',
            allowedOrigins,
            corsHeaders: this.generateCorsHeaders(allowedOrigins),
            isValid: true,
        };
    }
    /**
     * Create not found result
     */
    createNotFoundResult(hostname) {
        return {
            domain: null,
            resolutionMethod: 'not_found',
            allowedOrigins: [...this.DEFAULT_ORIGINS],
            corsHeaders: this.generateCorsHeaders(this.DEFAULT_ORIGINS),
            isValid: false,
            error: `Domain not found: ${hostname}`,
        };
    }
    /**
     * Create error result
     */
    createErrorResult(hostname, error) {
        return {
            domain: null,
            resolutionMethod: 'not_found',
            allowedOrigins: [...this.DEFAULT_ORIGINS],
            corsHeaders: this.generateCorsHeaders(this.DEFAULT_ORIGINS),
            isValid: false,
            error: error?.message || 'Unknown error',
        };
    }
    /**
     * Generate allowed origins for a domain
     */
    generateAllowedOrigins(domain, hostname) {
        const origins = [...this.DEFAULT_ORIGINS];
        // Add the current hostname
        origins.push(`https://${hostname}`);
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            origins.push(`http://${hostname}`);
        }
        // Add domain slug origin
        origins.push(`https://${domain.slug}.keeper.tools`);
        // Add custom domain if verified
        if (domain.customDomain && domain.customDomainVerified) {
            origins.push(`https://${domain.customDomain}`);
        }
        // Add any additional origins from domain settings
        const settings = domain.settings;
        if (settings?.additional_origins && Array.isArray(settings.additional_origins)) {
            origins.push(...settings.additional_origins);
        }
        // Remove duplicates and return
        return [...new Set(origins)];
    }
    /**
     * Generate CORS headers
     */
    generateCorsHeaders(allowedOrigins) {
        return {
            'Access-Control-Allow-Origin': allowedOrigins.join(','),
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Domain-Context',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24 hours
            'Vary': 'Origin',
        };
    }
    /**
     * Generate security headers for a domain
     */
    generateSecurityHeaders(domain, hostname) {
        const headers = {};
        // Content Security Policy
        const cspDirectives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.keeper.tools wss://api.keeper.tools",
        ];
        // Add domain-specific CSP rules
        if (domain?.settings && typeof domain.settings === 'object') {
            const settings = domain.settings;
            if (settings.csp_additional_sources) {
                cspDirectives.push(...settings.csp_additional_sources);
            }
        }
        headers['Content-Security-Policy'] = cspDirectives.join('; ');
        // Frame options - allow embedding for certain domains
        if (domain?.features && domain.features.allow_embedding) {
            headers['X-Frame-Options'] = 'SAMEORIGIN';
        }
        else {
            headers['X-Frame-Options'] = 'DENY';
        }
        // Other security headers
        headers['X-Content-Type-Options'] = 'nosniff';
        headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
        // Permissions policy
        const permissionsPolicies = [
            'camera=()',
            'microphone=()',
            'geolocation=()',
            'payment=()',
        ];
        headers['Permissions-Policy'] = permissionsPolicies.join(', ');
        return headers;
    }
    /**
     * Create domain context for request processing
     */
    async createDomainContext(hostname) {
        const resolution = await this.resolveDomain(hostname);
        const { subdomain } = this.parseSubdomain(hostname);
        return {
            domain: resolution.domain,
            hostname,
            subdomain,
            isCustomDomain: resolution.resolutionMethod === 'custom_domain',
            allowedOrigins: resolution.allowedOrigins,
            securityHeaders: this.generateSecurityHeaders(resolution.domain, hostname),
        };
    }
    /**
     * Middleware factory for Express.js
     */
    createMiddleware() {
        return async (req, res, next) => {
            const hostname = this.extractHostname(req);
            const context = await this.createDomainContext(hostname);
            // Add domain context to request
            req.domainContext = context;
            // Set CORS headers
            Object.entries(context.allowedOrigins.length > 0 ?
                this.generateCorsHeaders(context.allowedOrigins) : {}).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
            // Set security headers
            Object.entries(context.securityHeaders).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
            // Add domain info header
            res.setHeader('X-Domain-Context', JSON.stringify({
                domainId: context.domain?.id || null,
                slug: context.domain?.slug || null,
                isCustomDomain: context.isCustomDomain,
            }));
            next();
        };
    }
    /**
     * Utility functions
     */
    normalizeHostname(hostname) {
        return hostname.toLowerCase().replace(/^www\./, '');
    }
    isPlatformDomain(hostname) {
        return this.PLATFORM_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    }
    parseSubdomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length <= 2) {
            return { baseDomain: hostname };
        }
        // Check if it matches our platform domains
        for (const platformDomain of this.PLATFORM_DOMAINS) {
            if (hostname.endsWith(`.${platformDomain}`)) {
                const subdomain = hostname.replace(`.${platformDomain}`, '');
                return { subdomain, baseDomain: platformDomain };
            }
        }
        return { baseDomain: hostname };
    }
    extractHostname(req) {
        // Try various headers that might contain the hostname
        const hostname = req.headers.host ||
            req.headers['x-forwarded-host'] ||
            req.headers['x-original-host'] ||
            'localhost:3000';
        // Remove port if present
        return hostname.split(':')[0];
    }
    /**
     * Validate domain configuration
     */
    async validateDomainConfiguration(domainId) {
        const domain = await this.domainService.getDomainById(domainId);
        if (!domain) {
            return {
                isValid: false,
                issues: ['Domain not found'],
                recommendations: [],
            };
        }
        const issues = [];
        const recommendations = [];
        // Check domain status
        if (domain.status !== 'active') {
            issues.push(`Domain status is ${domain.status}`);
        }
        // Check custom domain verification
        if (domain.customDomain && !domain.customDomainVerified) {
            issues.push('Custom domain is not verified');
            recommendations.push('Complete domain verification to enable custom domain access');
        }
        // Check CORS configuration
        const settings = domain.settings;
        if (settings?.additional_origins && !Array.isArray(settings.additional_origins)) {
            issues.push('Invalid additional_origins configuration');
        }
        // Check security settings
        if (!domain.features || !domain.features.security_headers_enabled) {
            recommendations.push('Enable security headers for better protection');
        }
        return {
            isValid: issues.length === 0,
            issues,
            recommendations,
        };
    }
    /**
     * Get domain resolution statistics
     */
    async getResolutionStats(domainId) {
        // This would integrate with your analytics/monitoring system
        // For now, return mock data
        return {
            totalResolutions: 0,
            successfulResolutions: 0,
            failedResolutions: 0,
            averageResolutionTime: 0,
            topResolvedDomains: [],
        };
    }
}
export default DomainResolutionService;
//# sourceMappingURL=DomainResolutionService.js.map