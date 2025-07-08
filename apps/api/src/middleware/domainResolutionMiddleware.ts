/**
 * Enhanced Domain Resolution Middleware
 * Handles custom domain resolution, subdomain routing, and error handling with fallback strategies
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { DomainService } from '../../../../packages/database/src/services/DomainService';
import { DomainCacheService } from '../../../../packages/database/src/services/DomainCacheService';
import { DomainResolutionService } from '../../../../packages/database/src/services/DomainResolutionService';
import { getFeatureFlagService } from '../../../../packages/database/src/services/FeatureFlagService';

export interface DomainResolutionConfig {
  fallbackDomain?: string;
  redirectSubdomains?: boolean;
  enforceHttps?: boolean;
  customErrorHandling?: boolean;
  enableAnalytics?: boolean;
  developmentMode?: boolean;
}

export interface ResolvedDomain {
  domain: any;
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
  private resolutionService: DomainResolutionService;
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
    resolutionService: DomainResolutionService,
    config: DomainResolutionConfig = {}
  ) {
    this.prisma = prisma;
    this.domainService = domainService;
    this.cacheService = cacheService;
    this.resolutionService = resolutionService;
    this.config = {
      fallbackDomain: 'keeper.tools',
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
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hostname = this.extractHostname(req);
        const resolution = await this.resolveDomain(hostname, req);

        // Handle errors
        if (resolution.errorType) {
          return this.handleResolutionError(resolution, req, res);
        }

        // Handle redirects
        if (resolution.redirectUrl) {
          return this.handleRedirect(resolution.redirectUrl, req, res);
        }

        // Set domain context in request
        req.domainContext = {
          domain: resolution.domain,
          isCustomDomain: resolution.isCustomDomain,
          originalHostname: resolution.originalHostname,
          resolvedSlug: resolution.resolvedSlug,
        };

        // Add domain headers
        this.addDomainHeaders(res, resolution);

        // Log resolution if analytics enabled
        if (this.config.enableAnalytics) {
          this.logDomainResolution(resolution, req);
        }

        next();
      } catch (error) {
        console.error('Domain resolution error:', error);
        return this.handleFallback(req, res, next);
      }
    };
  }

  /**
   * Resolve domain from hostname
   */
  private async resolveDomain(hostname: string, req: Request): Promise<ResolvedDomain> {
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

    // Try to resolve as custom domain first
    const customDomainResult = await this.resolveCustomDomain(hostname);
    if (customDomainResult) {
      return customDomainResult;
    }

    // Try to resolve as subdomain
    const subdomainResult = await this.resolveSubdomain(hostname);
    if (subdomainResult) {
      return subdomainResult;
    }

    // Check if this is a platform subdomain
    if (this.isPlatformSubdomain(hostname)) {
      return {
        domain: null,
        isCustomDomain: false,
        originalHostname: hostname,
        resolvedSlug: '',
        errorType: 'NOT_FOUND',
        errorMessage: 'Platform subdomain not configured for domain resolution',
      };
    }

    // Domain not found
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
      const cached = await this.cacheService.getDomainByHostname(hostname);
      if (cached) {
        return this.validateDomainResult(cached, hostname, true);
      }

      // Query database
      const domain = await this.prisma.domain.findFirst({
        where: {
          customDomain: hostname,
          isActive: true,
        },
      });

      if (!domain) {
        return null;
      }

      // Cache the result
      await this.cacheService.cacheDomainByHostname(hostname, domain);

      return this.validateDomainResult(domain, hostname, true);
    } catch (error) {
      console.error('Custom domain resolution error:', error);
      return null;
    }
  }

  /**
   * Resolve subdomain
   */
  private async resolveSubdomain(hostname: string): Promise<ResolvedDomain | null> {
    // Extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length < 3) {
      return null; // Not a subdomain
    }

    const subdomain = parts[0];
    const baseDomain = parts.slice(1).join('.');

    // Check if base domain is keeper.tools or configured platform domain
    if (!this.isPlatformBaseDomain(baseDomain)) {
      return null;
    }

    // Check if subdomain is a platform subdomain
    if (this.PLATFORM_SUBDOMAINS.includes(subdomain)) {
      return null; // Platform subdomain, not user domain
    }

    try {
      // Check cache first
      const cached = await this.cacheService.getDomainBySlug(subdomain);
      if (cached) {
        return this.validateDomainResult(cached, hostname, false);
      }

      // Query database
      const domain = await this.prisma.domain.findFirst({
        where: {
          slug: subdomain,
          isActive: true,
        },
      });

      if (!domain) {
        return null;
      }

      // Cache the result
      await this.cacheService.cacheDomainBySlug(subdomain, domain);

      return this.validateDomainResult(domain, hostname, false);
    } catch (error) {
      console.error('Subdomain resolution error:', error);
      return null;
    }
  }

  /**
   * Validate domain result
   */
  private validateDomainResult(
    domain: any,
    hostname: string,
    isCustomDomain: boolean
  ): ResolvedDomain {
    // Check if domain is suspended
    if (domain.status === 'suspended') {
      return {
        domain: null,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domain.slug,
        errorType: 'SUSPENDED',
        errorMessage: 'Domain has been suspended',
      };
    }

    // Check if custom domain verification is required
    if (isCustomDomain && !domain.customDomainVerified) {
      return {
        domain: null,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domain.slug,
        errorType: 'VERIFICATION_REQUIRED',
        errorMessage: 'Custom domain verification required',
      };
    }

    // Check for HTTPS enforcement
    if (this.config.enforceHttps && !this.isHttpsRequest(hostname)) {
      return {
        domain,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domain.slug,
        redirectUrl: `https://${hostname}`,
      };
    }

    // Check for subdomain redirects
    if (this.config.redirectSubdomains && !isCustomDomain && domain.customDomain && domain.customDomainVerified) {
      return {
        domain,
        isCustomDomain,
        originalHostname: hostname,
        resolvedSlug: domain.slug,
        redirectUrl: `https://${domain.customDomain}`,
      };
    }

    // Valid domain
    return {
      domain,
      isCustomDomain,
      originalHostname: hostname,
      resolvedSlug: domain.slug,
    };
  }

  /**
   * Handle resolution errors
   */
  private handleResolutionError(
    resolution: ResolvedDomain,
    req: Request,
    res: Response
  ): void {
    const error: DomainResolutionError = {
      type: resolution.errorType!,
      message: resolution.errorMessage!,
      hostname: resolution.originalHostname,
    };

    // Add suggested actions
    switch (error.type) {
      case 'NOT_FOUND':
        error.suggestedAction = 'Check the URL or contact the domain owner';
        error.redirectUrl = `https://${this.config.fallbackDomain}/404?domain=${encodeURIComponent(error.hostname)}`;
        break;
      case 'SUSPENDED':
        error.suggestedAction = 'Contact support for assistance';
        error.redirectUrl = `https://${this.config.fallbackDomain}/suspended?domain=${encodeURIComponent(error.hostname)}`;
        break;
      case 'VERIFICATION_REQUIRED':
        error.suggestedAction = 'Complete domain verification';
        error.redirectUrl = `https://${this.config.fallbackDomain}/verify-domain?domain=${encodeURIComponent(error.hostname)}`;
        break;
      case 'MALFORMED':
        error.suggestedAction = 'Check the URL format';
        error.redirectUrl = `https://${this.config.fallbackDomain}/400?domain=${encodeURIComponent(error.hostname)}`;
        break;
    }

    // Custom error handling
    if (this.config.customErrorHandling) {
      this.handleCustomError(error, req, res);
    } else {
      this.handleDefaultError(error, req, res);
    }
  }

  /**
   * Handle custom error responses
   */
  private handleCustomError(error: DomainResolutionError, req: Request, res: Response): void {
    // Set appropriate status code
    const statusCode = this.getStatusCodeForError(error.type);
    
    // Add error headers
    res.setHeader('X-Domain-Error', error.type);
    res.setHeader('X-Domain-Message', error.message);
    
    // Check if client accepts JSON
    if (req.accepts('json')) {
      res.status(statusCode).json({
        error: error.type,
        message: error.message,
        hostname: error.hostname,
        suggestedAction: error.suggestedAction,
        redirectUrl: error.redirectUrl,
      });
    } else {
      // Redirect to error page
      res.redirect(statusCode, error.redirectUrl || `https://${this.config.fallbackDomain}/error`);
    }
  }

  /**
   * Handle default error responses
   */
  private handleDefaultError(error: DomainResolutionError, req: Request, res: Response): void {
    const statusCode = this.getStatusCodeForError(error.type);
    
    if (error.redirectUrl) {
      res.redirect(statusCode, error.redirectUrl);
    } else {
      res.status(statusCode).send(error.message);
    }
  }

  /**
   * Handle redirects
   */
  private handleRedirect(redirectUrl: string, req: Request, res: Response): void {
    // Preserve query parameters
    const url = new URL(redirectUrl);
    const queryParams = new URLSearchParams(req.url.split('?')[1]);
    
    for (const [key, value] of queryParams) {
      url.searchParams.set(key, value);
    }

    // Preserve path
    if (req.path && req.path !== '/') {
      url.pathname = req.path;
    }

    res.redirect(301, url.toString());
  }

  /**
   * Handle fallback when resolution fails
   */
  private handleFallback(req: Request, res: Response, next: NextFunction): void {
    // Set empty domain context
    req.domainContext = {
      domain: null,
      isCustomDomain: false,
      originalHostname: this.extractHostname(req),
      resolvedSlug: '',
    };

    // Add fallback headers
    res.setHeader('X-Domain-Fallback', 'true');
    res.setHeader('X-Domain-Resolution', 'failed');

    next();
  }

  /**
   * Add domain headers to response
   */
  private addDomainHeaders(res: Response, resolution: ResolvedDomain): void {
    res.setHeader('X-Domain-Resolved', 'true');
    res.setHeader('X-Domain-Slug', resolution.resolvedSlug);
    res.setHeader('X-Domain-Type', resolution.isCustomDomain ? 'custom' : 'subdomain');
    
    if (resolution.domain?.id) {
      res.setHeader('X-Domain-ID', resolution.domain.id);
    }
  }

  /**
   * Log domain resolution for analytics
   */
  private async logDomainResolution(resolution: ResolvedDomain, req: Request): Promise<void> {
    try {
      if (resolution.domain?.id) {
        await this.prisma.domainUsage.create({
          data: {
            domainId: resolution.domain.id,
            userId: req.user?.id || null,
            action: 'domain_resolution',
            metadata: {
              hostname: resolution.originalHostname,
              isCustomDomain: resolution.isCustomDomain,
              resolvedSlug: resolution.resolvedSlug,
              userAgent: req.headers['user-agent'],
              referer: req.headers.referer,
              method: req.method,
              path: req.path,
            },
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }
    } catch (error) {
      console.error('Failed to log domain resolution:', error);
    }
  }

  /**
   * Utility methods
   */
  private extractHostname(req: Request): string {
    return req.headers.host || 
           req.headers['x-forwarded-host'] || 
           req.headers['x-original-host'] ||
           'localhost:3000';
  }

  private isValidHostname(hostname: string): boolean {
    const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return hostnameRegex.test(hostname.split(':')[0]);
  }

  private isReservedHostname(hostname: string): boolean {
    const baseName = hostname.split('.')[0];
    return this.RESERVED_HOSTNAMES.includes(baseName.toLowerCase());
  }

  private isPlatformSubdomain(hostname: string): boolean {
    const parts = hostname.split('.');
    if (parts.length < 3) return false;
    
    const subdomain = parts[0];
    const baseDomain = parts.slice(1).join('.');
    
    return this.PLATFORM_SUBDOMAINS.includes(subdomain) && 
           this.isPlatformBaseDomain(baseDomain);
  }

  private isPlatformBaseDomain(baseDomain: string): boolean {
    const platformDomains = [
      'keeper.tools',
      'localhost:3000',
      'localhost:5173',
      '127.0.0.1:3000',
    ];
    
    return platformDomains.includes(baseDomain.toLowerCase());
  }

  private isHttpsRequest(hostname: string): boolean {
    return hostname.startsWith('https://') || 
           process.env.NODE_ENV === 'development' ||
           hostname.includes('localhost') ||
           hostname.includes('127.0.0.1');
  }

  private getStatusCodeForError(errorType: string): number {
    switch (errorType) {
      case 'NOT_FOUND':
        return 404;
      case 'SUSPENDED':
        return 403;
      case 'VERIFICATION_REQUIRED':
        return 412; // Precondition Failed
      case 'MALFORMED':
        return 400;
      case 'RATE_LIMITED':
        return 429;
      default:
        return 500;
    }
  }

  /**
   * Get domain resolution statistics
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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // This would integrate with your analytics system
    // For now, return mock data
    return {
      totalResolutions: 5000,
      successfulResolutions: 4750,
      failedResolutions: 250,
      customDomainResolutions: 2000,
      subdomainResolutions: 2750,
      topDomains: [
        { domain: 'example.com', count: 500 },
        { domain: 'mysite.keeper.tools', count: 300 },
      ],
      errorBreakdown: [
        { errorType: 'NOT_FOUND', count: 200 },
        { errorType: 'VERIFICATION_REQUIRED', count: 30 },
        { errorType: 'SUSPENDED', count: 20 },
      ],
    };
  }
}

/**
 * Factory function to create domain resolution middleware
 */
export function createDomainResolutionMiddleware(
  config?: DomainResolutionConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const prisma = new PrismaClient();
  const cacheService = new DomainCacheService();
  const domainService = new DomainService(prisma, cacheService);
  const resolutionService = new DomainResolutionService(domainService, cacheService);
  
  const middleware = new DomainResolutionMiddleware(
    prisma,
    domainService,
    cacheService,
    resolutionService,
    config
  );

  return middleware.createMiddleware();
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      domainContext?: {
        domain: any;
        isCustomDomain: boolean;
        originalHostname: string;
        resolvedSlug: string;
      };
    }
  }
}

export default DomainResolutionMiddleware; 