/**
 * Domain Resolution Middleware
 * Resolves domains from custom hostnames and establishes request context
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../lib/redis.js';
import { 
  DomainService, 
  DomainCacheService,
  FeatureFlagService
} from '@keeper/database';

const prisma = new PrismaClient();
const redis: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlagService = new FeatureFlagService();

// Basic feature flag service implementation
const getFeatureFlagService = () => ({
  isEnabled: (flag: string, domainId?: string) => {
    // Basic implementation - you can enhance this later
    switch (flag) {
      case 'custom_domains':
      case 'domain_resolution':
        return true;
      default:
        return false;
    }
  }
});

export interface DomainResolvedRequest extends Request {
  domainContext?: {
    domain: Record<string, unknown>;
    isCustomDomain: boolean;
    originalHostname: string;
    resolvedSlug: string;
  };
  user?: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
  };
}

export interface DomainResolutionConfig {
  fallbackDomain?: string;
  redirectSubdomains?: boolean;
  enforceHttps?: boolean;
  customErrorHandling?: boolean;
  enableAnalytics?: boolean;
  developmentMode?: boolean;
}

export interface ResolvedDomain {
  domain: Record<string, unknown> | null;
  isCustomDomain: boolean;
  originalHostname: string;
  resolvedSlug: string;
  redirectUrl?: string;
  errorType?: 'NOT_FOUND' | 'SUSPENDED' | 'VERIFICATION_REQUIRED' | 'MALFORMED';
  errorMessage?: string;
}

export interface DomainResolutionError {
  type: 'NOT_FOUND' | 'SUSPENDED' | 'VERIFICATION_REQUIRED' | 'MALFORMED' | 'RATE_LIMITED';
  message: string;
  hostname: string;
  suggestedAction?: string;
  redirectUrl?: string;
}

export class DomainResolutionMiddleware {
  private prisma: PrismaClient;
  private domainService: DomainService;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  private readonly config: DomainResolutionConfig;

  // Reserved hostnames that should not be resolved as domains
  private readonly RESERVED_HOSTNAMES = [
    'api',
    'cdn',
    'static',
    'assets',
    'admin',
    'root',
    'mail',
    'email',
    'ftp',
    'ssh',
    'vpn',
    'proxy',
    'cache',
    'backup',
  ];

  // Platform subdomains
  private readonly PLATFORM_SUBDOMAINS = [
    'app',
    'studio',
    'api',
    'docs',
    'support',
    'status',
    'blog',
  ];

  constructor(
    prisma: PrismaClient,
    domainService: DomainService,
    cacheService: DomainCacheService,
    config: DomainResolutionConfig = {}
  ) {
    this.prisma = prisma;
    this.domainService = domainService;
    this.cacheService = cacheService;
    this.config = {
      // Use env-driven fallback; default to www.ke3p.com for MVP single-domain
      // TODO(domains): revisit fallback behavior when enabling multi-tenancy
      fallbackDomain: process.env.FALLBACK_DOMAIN ?? 'www.ke3p.com',
      redirectSubdomains: true,
      enforceHttps: true,
      customErrorHandling: true,
      enableAnalytics: true,
      developmentMode: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Create domain resolution middleware
   */
  createMiddleware() {
    return async (req: DomainResolvedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const hostname = this.extractHostname(req);
        const resolution = await this.resolveDomain(hostname, req);

        // Handle errors
        if (resolution.errorType) {
          this.handleResolutionError(resolution, req, res);
          return;
        }

        // Handle redirects
        if (resolution.redirectUrl) {
          this.handleRedirect(resolution.redirectUrl, req, res);
          return;
        }

        // Set domain context in request
        if (resolution.domain) {
          req.domainContext = {
            domain: resolution.domain,
            isCustomDomain: resolution.isCustomDomain,
            originalHostname: resolution.originalHostname,
            resolvedSlug: resolution.resolvedSlug,
          };
        }

        // Add domain headers
        this.addDomainHeaders(res, resolution);

        // Log resolution if analytics enabled
        if (this.config.enableAnalytics) {
          await this.logDomainResolution(resolution, req);
        }

        next();
      } catch (error) {
        console.error('Domain resolution error:', error);
        this.handleFallback(req, res, next);
        return;
      }
    };
  }

  /**
   * Resolve domain from hostname
   */
  private async resolveDomain(hostname: string, req: DomainResolvedRequest): Promise<ResolvedDomain> {
    // Validate hostname
    if (!this.isValidHostname(hostname)) {
      return {
        domain: null,
        isCustomDomain: false,
        originalHostname: hostname,
        resolvedSlug: '',
        errorType: 'MALFORMED',
        errorMessage: 'Invalid hostname format',
      };
    }

    // Check if hostname is reserved
    if (this.isReservedHostname(hostname)) {
      return {
        domain: null,
        isCustomDomain: false,
        originalHostname: hostname,
        resolvedSlug: '',
        errorType: 'NOT_FOUND',
        errorMessage: 'Reserved hostname',
      };
    }

    // Treat platform base domains (e.g., localhost:3001 in dev) as no-domain context
    if (this.isPlatformBaseDomain(hostname)) {
      return {
        domain: null,
        isCustomDomain: false,
        originalHostname: hostname,
        resolvedSlug: '',
      };
    }

    // Try custom domain resolution first
    let resolution = await this.resolveCustomDomain(hostname);
    if (resolution) {
      return resolution;
    }

    // Try subdomain resolution
    resolution = await this.resolveSubdomain(hostname);
    if (resolution) {
      return resolution;
    }

    // Not found
    // In production, redirect unknown hosts to the platform fallback domain
    if (process.env.NODE_ENV === 'production' && this.config.fallbackDomain) {
      const target = `https://${this.config.fallbackDomain}`;
      return {
        domain: null,
        isCustomDomain: false,
        originalHostname: hostname,
        resolvedSlug: '',
        redirectUrl: target,
      };
    }

    return {
      domain: null,
      isCustomDomain: false,
      originalHostname: hostname,
      resolvedSlug: '',
      errorType: 'NOT_FOUND',
      errorMessage: 'Domain not found',
    };
  }

  /**
   * Resolve custom domain
   */
  private async resolveCustomDomain(hostname: string): Promise<ResolvedDomain | null> {
    try {
      // Check cache first
      let domain = await this.cacheService.getDomainByHostname(hostname);
      
      if (!domain) {
        // Check database
        domain = await this.domainService.getDomainByCustomDomain(hostname);
        
        if (domain) {
          // Cache the result
          await this.cacheService.cacheDomain(domain);
        } else {
          // Cache negative result
          await this.cacheService.cacheNegativeResult('domain:hostname:', hostname);
        }
      }

      if (domain) {
        return this.validateDomainResult(domain, hostname, true);
      }

      return null;
    } catch (error) {
      console.error('Error resolving custom domain:', error);
      return null;
    }
  }

  /**
   * Resolve subdomain
   */
  private async resolveSubdomain(hostname: string): Promise<ResolvedDomain | null> {
    try {
      // Extract subdomain (assuming format: subdomain.keeper.tools)
      const parts = hostname.split('.');
      if (parts.length < 3) {
        return null;
      }

      const subdomain = parts[0];
      const baseDomain = parts.slice(1).join('.');

      // Check if it's a platform base domain
      if (!this.isPlatformBaseDomain(baseDomain)) {
        return null;
      }

      // Check cache first
      let domain = await this.cacheService.getDomainBySlug(subdomain);
      
      if (!domain) {
        // Check database
        domain = await this.domainService.getDomainBySlug(subdomain);
        
        if (domain) {
          // Cache the result
          await this.cacheService.cacheDomain(domain);
        } else {
          // Cache negative result
          await this.cacheService.cacheNegativeResult('domain:slug:', subdomain);
        }
      }

      if (domain) {
        return this.validateDomainResult(domain, hostname, false);
      }

      return null;
    } catch (error) {
      console.error('Error resolving subdomain:', error);
      return null;
    }
  }

  /**
   * Validate domain result and return resolved domain
   */
  private validateDomainResult(
    domain: unknown,
    hostname: string,
    isCustomDomain: boolean
  ): ResolvedDomain {
    // Type guard for domain object
    if (!domain || typeof domain !== 'object') {
      return {
        domain: null,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: '',
        errorType: 'MALFORMED',
        errorMessage: 'Invalid domain object',
      };
    }

    const domainObj = domain as Record<string, unknown>;
    
    // Check if domain is active
    if (!domainObj.isActive) {
      return {
        domain: domainObj,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domainObj.slug as string || '',
        errorType: 'SUSPENDED',
        errorMessage: 'Domain is suspended',
      };
    }

    // Check domain status
    if (domainObj.status !== 'active') {
      return {
        domain: domainObj,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domainObj.slug as string || '',
        errorType: 'SUSPENDED',
        errorMessage: `Domain status: ${domainObj.status}`,
      };
    }

    // Check if custom domain is verified
    if (isCustomDomain && !domainObj.customDomainVerified) {
      return {
        domain: domainObj,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domainObj.slug as string || '',
        errorType: 'VERIFICATION_REQUIRED',
        errorMessage: 'Custom domain not verified',
      };
    }

    // Valid domain
    return {
      domain: domainObj,
      isCustomDomain,
      originalHostname: hostname,
      resolvedSlug: domainObj.slug as string || '',
    };
  }

  /**
   * Handle resolution errors
   */
  private handleResolutionError(
    resolution: ResolvedDomain,
    req: DomainResolvedRequest,
    res: Response
  ): void {
    const error: DomainResolutionError = {
      type: resolution.errorType!,
      message: resolution.errorMessage!,
      hostname: resolution.originalHostname,
    };

    if (this.config.customErrorHandling) {
      this.handleCustomError(error, req, res);
    } else {
      this.handleDefaultError(error, req, res);
    }
  }

  /**
   * Handle custom error responses
   */
  private handleCustomError(error: DomainResolutionError, req: DomainResolvedRequest, res: Response): void {
    const statusCode = this.getStatusCodeForError(error.type);
    
    res.status(statusCode).json({
      error: error.type,
      message: error.message,
      hostname: error.hostname,
      suggestedAction: error.suggestedAction,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle default error responses
   */
  private handleDefaultError(error: DomainResolutionError, req: DomainResolvedRequest, res: Response): void {
    const statusCode = this.getStatusCodeForError(error.type);
    res.status(statusCode).send(error.message);
  }

  /**
   * Handle redirects
   */
  private handleRedirect(redirectUrl: string, req: DomainResolvedRequest, res: Response): void {
    if (this.config.enforceHttps && !req.secure) {
      const httpsUrl = redirectUrl.replace('http://', 'https://');
      res.redirect(301, httpsUrl);
    } else {
      res.redirect(302, redirectUrl);
    }
  }

  /**
   * Handle fallback when resolution fails
   */
  private handleFallback(req: DomainResolvedRequest, res: Response, next: NextFunction): void {
    if (this.config.fallbackDomain) {
      // Don't set domainContext if we don't have a valid domain
      next();
    } else {
      res.status(404).json({ error: 'Domain not found' });
    }
  }

  /**
   * Add domain-specific headers
   */
  private addDomainHeaders(res: Response, resolution: ResolvedDomain): void {
    res.setHeader('X-Domain-Resolution', resolution.isCustomDomain ? 'custom' : 'subdomain');
    res.setHeader('X-Domain-Slug', resolution.resolvedSlug);
    if (resolution.domain?.id) {
      res.setHeader('X-Domain-ID', resolution.domain.id as string);
    }
  }

  /**
   * Log domain resolution for analytics
   */
  private async logDomainResolution(resolution: ResolvedDomain, req: DomainResolvedRequest): Promise<void> {
    try {
      if (resolution.domain?.id && req.user?.id) {
        await this.prisma.domainUsage.create({
          data: {
            domainId: resolution.domain.id as string,
            userId: req.user.id,
            action: 'domain_access',
            metadata: JSON.parse(JSON.stringify({
              hostname: resolution.originalHostname,
              isCustomDomain: resolution.isCustomDomain,
              userAgent: req.get('user-agent') || '',
            })),
            ipAddress: req.ip || '',
            userAgent: req.get('user-agent') || '',
          },
        });
      }
    } catch (error) {
      console.error('Error logging domain resolution:', error);
    }
  }

  /**
   * Extract hostname from request
   */
  private extractHostname(req: Request): string {
    return req.get('host') || req.hostname || 'localhost';
  }

  /**
   * Validate hostname format
   */
  private isValidHostname(hostname: string): boolean {
    // Allow standard hostnames plus optional ":<port>" in development
    const devPattern = /^[a-zA-Z0-9.-]+(:\d+)?$/;
    return devPattern.test(hostname) && hostname.length > 0;
  }

  /**
   * Check if hostname is reserved
   */
  private isReservedHostname(hostname: string): boolean {
    const parts = hostname.split('.');
    return this.RESERVED_HOSTNAMES.includes(parts[0]);
  }

  /**
   * Check if subdomain is a platform subdomain
   */
  private isPlatformSubdomain(hostname: string): boolean {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      const baseDomain = parts.slice(1).join('.');
      return this.PLATFORM_SUBDOMAINS.includes(subdomain) && 
             this.isPlatformBaseDomain(baseDomain);
    }
    return false;
  }

  /**
   * Check if domain is a platform base domain
   */
  private isPlatformBaseDomain(baseDomain: string): boolean {
    // Base platform domains always considered "platform" (no domain context required)
    const hostOnly = baseDomain.split(':')[0];
    const platformDomains = [
      // TODO(domains): enable *.keeper.domains after MVP
      // Use env-driven public web origin host if available; keep localhost variants
      (process.env.PUBLIC_WEB_ORIGIN ? new URL(process.env.PUBLIC_WEB_ORIGIN).host : ''),
    ].filter(Boolean) as string[];

    // Always treat localhost/127.0.0.1/0.0.0.0 as platform, any port
    if (hostOnly === 'localhost' || hostOnly === '127.0.0.1' || hostOnly === '0.0.0.0') {
      return true;
    }

    // Include Railway domains from env (they change per deployment)
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      platformDomains.push(process.env.RAILWAY_PUBLIC_DOMAIN);
    }
    if (process.env.RAILWAY_PRIVATE_DOMAIN) {
      platformDomains.push(process.env.RAILWAY_PRIVATE_DOMAIN);
    }

    // Treat any ".up.railway.app" host as platform base (preview/prod URL)
    if (hostOnly.endsWith('.up.railway.app')) {
      return true;
    }

    return platformDomains.includes(hostOnly);
  }

  /**
   * Check if request is HTTPS
   */
  private isHttpsRequest(hostname: string): boolean {
    return hostname.startsWith('https://');
  }

  /**
   * Get HTTP status code for error type
   */
  private getStatusCodeForError(errorType: string): number {
    switch (errorType) {
      case 'NOT_FOUND':
        return 404;
      case 'SUSPENDED':
        return 503;
      case 'VERIFICATION_REQUIRED':
        return 403;
      case 'MALFORMED':
        return 400;
      case 'RATE_LIMITED':
        return 429;
      default:
        return 500;
    }
  }

  /**
   * Get resolution statistics
   */
  async getResolutionStats(days: number = 7): Promise<{
    totalResolutions: number;
    successfulResolutions: number;
    failedResolutions: number;
    customDomainResolutions: number;
    subdomainResolutions: number;
    topDomains: Array<{ domain: string; count: number }>;
    errorBreakdown: Array<{ errorType: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.domainUsage.groupBy({
      by: ['domainId', 'action'],
      where: {
        timestamp: {
          gte: startDate,
        },
        action: 'domain_access',
      },
      _count: true,
    });

    // Process and return formatted stats
    return {
      totalResolutions: stats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      successfulResolutions: stats.reduce((sum: number, stat: any) => sum + stat._count, 0),
      failedResolutions: 0, // Would need separate tracking
      customDomainResolutions: 0, // Would need metadata analysis
      subdomainResolutions: 0, // Would need metadata analysis
      topDomains: [],
      errorBreakdown: [],
    };
  }
}

/**
 * Create domain resolution middleware instance
 */
export function createDomainResolutionMiddleware(
  config?: DomainResolutionConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const middleware = new DomainResolutionMiddleware(
    prisma,
    domainService,
    cacheService,
    config
  );
  
  return middleware.createMiddleware();
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      domainContext?: {
        domain: Record<string, unknown>;
        isCustomDomain: boolean;
        originalHostname: string;
        resolvedSlug: string;
      };
    }
  }
} 