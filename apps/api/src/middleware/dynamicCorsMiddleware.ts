/**
 * Dynamic CORS Middleware
 * Dynamically configures CORS based on domain configuration
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import { Redis } from 'ioredis';
import { 
  DomainService, 
  DomainCacheService,
  DomainResolutionService,
  FeatureFlagService
} from '@keeper/database';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlagService = new FeatureFlagService(prisma);
const resolutionService = new DomainResolutionService(domainService, cacheService);

// Basic feature flag service implementation
const getFeatureFlagService = () => ({
  isEnabled: (flag: string, domainId?: string) => {
    switch (flag) {
      case 'dynamic_cors':
      case 'custom_domains':
        return true;
      default:
        return false;
    }
  }
});

// Create a basic resolution service implementation
const resolutionService = {
  async resolveDomain(hostname: string) {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return { domain: null, isCustomDomain: false };
    }
    
    const domain = await domainService.getDomainByHostname(hostname);
    return { 
      domain, 
      isCustomDomain: !!domain?.customDomain,
      originalHostname: hostname,
      resolvedSlug: domain?.slug || ''
    };
  }
};

interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

interface DomainCorsSettings {
  additionalOrigins?: string[];
  restrictedMethods?: string[];
  customHeaders?: string[];
  allowCredentials?: boolean;
  corsMaxAge?: number;
  embedAllowed?: boolean;
  apiAccessAllowed?: boolean;
  developmentMode?: boolean;
}

export class DynamicCorsManager {
  private prisma: PrismaClient;
  private domainService: DomainService;
  private resolutionService: DomainResolutionService;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Default platform origins
  private readonly PLATFORM_ORIGINS = [
    'https://keeper.tools',
    'https://app.keeper.tools',
    'https://studio.keeper.tools',
    'https://api.keeper.tools',
  ];

  // Development origins
  private readonly DEVELOPMENT_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  // Default CORS configuration
  private readonly DEFAULT_CONFIG: CorsConfig = {
    allowedOrigins: [...this.PLATFORM_ORIGINS],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'X-Domain-Context',
      'X-API-Key',
      'X-Client-Version',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Domain-Context',
      'X-Request-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  constructor(
    prisma: PrismaClient,
    domainService: DomainService,
    resolutionService: DomainResolutionService,
    cacheService: DomainCacheService
  ) {
    this.prisma = prisma;
    this.domainService = domainService;
    this.resolutionService = resolutionService;
    this.cacheService = cacheService;
  }

  /**
   * Create dynamic CORS middleware
   */
  createMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const origin = this.extractOrigin(req);
        const hostname = this.extractHostname(req);
        
        // Get domain context
        const domainContext = await this.resolutionService.createDomainContext(hostname);
        
        // Generate CORS configuration
        const corsConfig = await this.generateCorsConfig(domainContext.domain, origin);
        
        // Apply CORS headers
        this.applyCorsHeaders(req, res, corsConfig, origin);
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          return res.status(corsConfig.optionsSuccessStatus).end();
        }
        
        next();
      } catch (error) {
        console.error('CORS middleware error:', error);
        // Fall back to default CORS on error
        this.applyCorsHeaders(req, res, this.DEFAULT_CONFIG, this.extractOrigin(req));
        
        if (req.method === 'OPTIONS') {
          return res.status(204).end();
        }
        
        next();
      }
    };
  }

  /**
   * Generate CORS configuration for domain
   */
  private async generateCorsConfig(domain: any, requestOrigin?: string): Promise<CorsConfig> {
    // Start with default configuration
    const config: CorsConfig = { ...this.DEFAULT_CONFIG };
    
    // Add development origins in development mode
    if (process.env.NODE_ENV === 'development') {
      config.allowedOrigins.push(...this.DEVELOPMENT_ORIGINS);
    }

    // If no domain context, return default + development origins
    if (!domain) {
      return config;
    }

    // Get domain-specific CORS settings
    const domainSettings = this.extractDomainCorsSettings(domain);
    
    // Add domain-specific origins
    const domainOrigins = this.generateDomainOrigins(domain, domainSettings);
    config.allowedOrigins.push(...domainOrigins);

    // Apply domain-specific settings
    if (domainSettings.additionalOrigins) {
      config.allowedOrigins.push(...domainSettings.additionalOrigins);
    }

    if (domainSettings.restrictedMethods) {
      config.allowedMethods = config.allowedMethods.filter(
        method => !domainSettings.restrictedMethods!.includes(method)
      );
    }

    if (domainSettings.customHeaders) {
      config.allowedHeaders.push(...domainSettings.customHeaders);
    }

    if (domainSettings.allowCredentials !== undefined) {
      config.credentials = domainSettings.allowCredentials;
    }

    if (domainSettings.corsMaxAge) {
      config.maxAge = domainSettings.corsMaxAge;
    }

    // Handle embedding permissions
    if (domainSettings.embedAllowed) {
      config.allowedHeaders.push('X-Frame-Options', 'X-Embed-Context');
      config.exposedHeaders.push('X-Frame-Options');
    }

    // Handle API access permissions
    if (!domainSettings.apiAccessAllowed) {
      config.allowedMethods = config.allowedMethods.filter(
        method => ['GET', 'OPTIONS'].includes(method)
      );
    }

    // Remove duplicates and sort
    config.allowedOrigins = [...new Set(config.allowedOrigins)].sort();
    config.allowedHeaders = [...new Set(config.allowedHeaders)].sort();
    config.exposedHeaders = [...new Set(config.exposedHeaders)].sort();

    return config;
  }

  /**
   * Generate origins for domain
   */
  private generateDomainOrigins(domain: any, settings: DomainCorsSettings): string[] {
    const origins: string[] = [];

    // Add domain slug origin
    if (domain.slug) {
      origins.push(`https://${domain.slug}.keeper.tools`);
      
      // Add development variant
      if (settings.developmentMode) {
        origins.push(`http://${domain.slug}.localhost:3000`);
      }
    }

    // Add custom domain origin
    if (domain.customDomain && domain.customDomainVerified) {
      origins.push(`https://${domain.customDomain}`);
      
      // Add HTTP variant for development
      if (settings.developmentMode) {
        origins.push(`http://${domain.customDomain}`);
      }
    }

    return origins;
  }

  /**
   * Extract domain CORS settings
   */
  private extractDomainCorsSettings(domain: any): DomainCorsSettings {
    const settings = domain.settings || {};
    const features = domain.features || {};
    
    return {
      additionalOrigins: settings.cors?.additional_origins || settings.additional_origins,
      restrictedMethods: settings.cors?.restricted_methods,
      customHeaders: settings.cors?.custom_headers,
      allowCredentials: settings.cors?.allow_credentials ?? true,
      corsMaxAge: settings.cors?.max_age,
      embedAllowed: features.allow_embedding ?? false,
      apiAccessAllowed: features.api_access_enabled ?? true,
      developmentMode: settings.development_mode ?? (process.env.NODE_ENV === 'development'),
    };
  }

  /**
   * Apply CORS headers to response
   */
  private applyCorsHeaders(
    req: Request,
    res: Response,
    config: CorsConfig,
    requestOrigin?: string
  ): void {
    // Check if origin is allowed
    const isOriginAllowed = !requestOrigin || 
      config.allowedOrigins.includes('*') ||
      config.allowedOrigins.includes(requestOrigin) ||
      this.isOriginAllowedByPattern(requestOrigin, config.allowedOrigins);

    // Access-Control-Allow-Origin
    if (isOriginAllowed) {
      if (config.credentials && requestOrigin) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      } else if (config.allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      }
    }

    // Access-Control-Allow-Methods
    res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '));

    // Access-Control-Allow-Headers
    if (req.method === 'OPTIONS' || config.allowedHeaders.length > 0) {
      const requestedHeaders = req.headers['access-control-request-headers'];
      if (requestedHeaders) {
        // Allow requested headers if they're in our allowed list
        const requestedHeadersArray = requestedHeaders
          .split(',')
          .map(h => h.trim())
          .filter(h => config.allowedHeaders.includes(h));
        
        if (requestedHeadersArray.length > 0) {
          res.setHeader('Access-Control-Allow-Headers', 
            [...new Set([...config.allowedHeaders, ...requestedHeadersArray])].join(', ')
          );
        } else {
          res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
        }
      } else {
        res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }
    }

    // Access-Control-Expose-Headers
    if (config.exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    // Access-Control-Allow-Credentials
    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Access-Control-Max-Age
    if (req.method === 'OPTIONS' && config.maxAge > 0) {
      res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
    }

    // Vary header to indicate that response varies by Origin
    const existingVary = res.getHeader('Vary');
    if (existingVary) {
      if (!existingVary.toString().includes('Origin')) {
        res.setHeader('Vary', `${existingVary}, Origin`);
      }
    } else {
      res.setHeader('Vary', 'Origin');
    }

    // Add security headers
    this.addSecurityHeaders(res, isOriginAllowed, requestOrigin);
  }

  /**
   * Add security headers
   */
  private addSecurityHeaders(res: Response, isOriginAllowed: boolean, requestOrigin?: string): void {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options (allow embedding from allowed origins)
    if (isOriginAllowed && requestOrigin) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    } else {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  }

  /**
   * Check if origin matches any pattern
   */
  private isOriginAllowedByPattern(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.some(allowedOrigin => {
      // Handle wildcard subdomains (e.g., *.example.com)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(origin);
      }
      return false;
    });
  }

  /**
   * Extract origin from request
   */
  private extractOrigin(req: Request): string | undefined {
    return req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
  }

  /**
   * Extract hostname from request
   */
  private extractHostname(req: Request): string {
    const hostname = req.headers.host || 
                    req.headers['x-forwarded-host'] || 
                    req.headers['x-original-host'] ||
                    'localhost:3000';
    
    // Remove port if present
    return hostname.split(':')[0];
  }

  /**
   * Validate CORS configuration
   */
  async validateCorsConfig(domainId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const domain = await this.domainService.getDomainById(domainId);
    if (!domain) {
      return {
        isValid: false,
        issues: ['Domain not found'],
        recommendations: [],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    const settings = this.extractDomainCorsSettings(domain);

    // Validate additional origins
    if (settings.additionalOrigins) {
      settings.additionalOrigins.forEach(origin => {
        try {
          new URL(origin);
        } catch (error) {
          issues.push(`Invalid additional origin: ${origin}`);
        }
      });
    }

    // Check for overly permissive settings
    if (settings.additionalOrigins?.includes('*')) {
      issues.push('Wildcard origin (*) is not recommended for production');
      recommendations.push('Use specific origins for better security');
    }

    // Check credentials with wildcard
    if (settings.allowCredentials && settings.additionalOrigins?.includes('*')) {
      issues.push('Credentials cannot be used with wildcard origin');
    }

    // Check custom domain verification
    if (domain.customDomain && !domain.customDomainVerified) {
      recommendations.push('Verify custom domain to enable CORS for custom domain origins');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Test CORS configuration
   */
  async testCorsConfig(domainId: string, testOrigin: string): Promise<{
    allowed: boolean;
    config: CorsConfig;
    explanation: string;
  }> {
    const domain = await this.domainService.getDomainById(domainId);
    const config = await this.generateCorsConfig(domain, testOrigin);
    
    const allowed = config.allowedOrigins.includes('*') ||
                   config.allowedOrigins.includes(testOrigin) ||
                   this.isOriginAllowedByPattern(testOrigin, config.allowedOrigins);

    let explanation: string;
    if (allowed) {
      explanation = `Origin "${testOrigin}" is allowed by CORS configuration`;
    } else {
      explanation = `Origin "${testOrigin}" is not in the allowed origins list: ${config.allowedOrigins.join(', ')}`;
    }

    return {
      allowed,
      config,
      explanation,
    };
  }

  /**
   * Get CORS statistics for domain
   */
  async getCorsStats(domainId: string, days: number = 7): Promise<{
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    topOrigins: Array<{ origin: string; count: number }>;
    topBlockedOrigins: Array<{ origin: string; count: number }>;
  }> {
    // This would typically integrate with your logging/analytics system
    // For now, return mock data
    return {
      totalRequests: 1000,
      allowedRequests: 950,
      blockedRequests: 50,
      topOrigins: [
        { origin: 'https://app.keeper.tools', count: 500 },
        { origin: 'https://studio.keeper.tools', count: 300 },
      ],
      topBlockedOrigins: [
        { origin: 'https://malicious.com', count: 30 },
        { origin: 'https://unknown.com', count: 20 },
      ],
    };
  }
}

/**
 * Factory function to create CORS middleware
 */
export function createDynamicCorsMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const prisma = new PrismaClient();
  const cacheService = new DomainCacheService();
  const domainService = new DomainService(prisma, cacheService);
  const resolutionService = new DomainResolutionService(domainService, cacheService);
  
  const corsManager = new DynamicCorsManager(
    prisma,
    domainService,
    resolutionService,
    cacheService
  );

  return corsManager.createMiddleware();
}

export default DynamicCorsManager; 