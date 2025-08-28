/**
 * Dynamic CORS Middleware
 * Handles CORS configuration based on domain context
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import cors from 'cors';
import { DomainService, DomainCacheService } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../lib/redis.js';

const prisma = new PrismaClient();
const redis: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);

export interface DomainCorsConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface CorsContext {
  domain: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    customDomain?: string;
    customDomainVerified?: boolean;
    settings?: {
      cors?: {
        credentials?: boolean;
        maxAge?: number;
        allowWildcardSubdomains?: boolean;
      };
    };
    [key: string]: unknown;
  };
  isCustomDomain: boolean;
  originalHostname: string;
  resolvedSlug: string;
}

export interface DynamicCorsRequest extends Request {
  domainContext?: CorsContext;
}

/**
 * Dynamic CORS Middleware
 * Configures CORS settings based on domain configuration
 */
export class DynamicCorsMiddleware {
  private defaultConfig: DomainCorsConfig;

  constructor(config: DomainCorsConfig = {}) {
    // Merge hard-coded platform origins with any comma-separated list provided via CORS_ORIGINS env var
    const envAllowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    this.defaultConfig = {
      // Base platform domains
      allowedOrigins: [
        'https://keeper.tools',
        'https://app.keeper.tools',
        ...envAllowedOrigins,
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200,
      ...config,
    };
  }

  /**
   * Create dynamic CORS middleware
   */
  createMiddleware() {
    return async (req: DynamicCorsRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const corsConfig = await this.getDomainCorsConfig(req);
        
        // Create CORS middleware with dynamic configuration
        const corsMiddleware = cors({
          origin: this.createOriginFunction(corsConfig, req),
          methods: corsConfig.allowedMethods,
          allowedHeaders: corsConfig.allowedHeaders,
          exposedHeaders: corsConfig.exposedHeaders,
          credentials: corsConfig.credentials,
          maxAge: corsConfig.maxAge,
          preflightContinue: corsConfig.preflightContinue,
          optionsSuccessStatus: corsConfig.optionsSuccessStatus,
        });

        // Apply CORS middleware
        corsMiddleware(req, res, (err) => {
          if (err) {
            console.error('CORS error:', err);
            res.status(500).json({ error: 'CORS configuration error' });
            return;
          }
          next();
        });
      } catch (error) {
        console.error('Dynamic CORS error:', error);
        next(error);
      }
    };
  }

  /**
   * Get CORS configuration for domain
   */
  private async getDomainCorsConfig(req: DynamicCorsRequest): Promise<DomainCorsConfig> {
    // Use domain context if available
    if (req.domainContext?.domain) {
      const domainConfig = await this.getDomainSpecificConfig(req.domainContext.domain);
      return { ...this.defaultConfig, ...domainConfig };
    }

    // Fallback to default configuration
    return this.defaultConfig;
  }

  /**
   * Get domain-specific CORS configuration
   */
  private async getDomainSpecificConfig(domain: CorsContext['domain']): Promise<Partial<DomainCorsConfig>> {
    try {
      const corsSettings = domain.settings?.cors || {};
      
      const config: Partial<DomainCorsConfig> = {
        credentials: corsSettings.credentials ?? true,
        maxAge: corsSettings.maxAge ?? 86400,
      };

      // Add custom domain to allowed origins
      if (domain.customDomain && domain.customDomainVerified) {
        config.allowedOrigins = [
          ...this.defaultConfig.allowedOrigins!,
          `https://${domain.customDomain}`,
          `http://${domain.customDomain}`, // For development
        ];
      }

      // Add subdomain to allowed origins
      config.allowedOrigins = config.allowedOrigins || [...this.defaultConfig.allowedOrigins!];
      config.allowedOrigins.push(`https://${domain.slug}.keeper.tools`);

      // Add development origins
      if (process.env.NODE_ENV === 'development') {
        config.allowedOrigins.push(
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        );
      }

      return config;
    } catch (error) {
      console.error('Error getting domain CORS config:', error);
      return {};
    }
  }

  /**
   * Create origin validation function
   */
  private createOriginFunction(config: DomainCorsConfig, req: DynamicCorsRequest) {
    return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (config.allowedOrigins?.includes(origin)) {
        callback(null, true);
        return;
      }

      // Check if origin matches domain patterns
      if (this.isOriginAllowed(origin, req.domainContext)) {
        callback(null, true);
        return;
      }

      // Always allow local development origins regardless of NODE_ENV
      if (this.isLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }

      // Log blocked origin for debugging
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    };
  }

  /**
   * Check if origin is allowed based on domain context
   */
  private isOriginAllowed(origin: string, domainContext?: CorsContext): boolean {
    if (!domainContext) {
      return false;
    }

    const { domain, isCustomDomain } = domainContext;
    
    if (!domain) {
      return false;
    }

    // Check custom domain
    if (isCustomDomain && domain.customDomain && domain.customDomainVerified) {
      const customDomainOrigin = `https://${domain.customDomain}`;
      if (origin === customDomainOrigin) {
        return true;
      }
    }

    // Check subdomain
    const subdomainOrigin = `https://${domain.slug}.keeper.tools`;
    if (origin === subdomainOrigin) {
      return true;
    }

    // Check for wildcard subdomains (if enabled)
    if (domain.settings?.cors?.allowWildcardSubdomains) {
      const baseDomain = domain.customDomain || `${domain.slug}.keeper.tools`;
      const wildcardPattern = new RegExp(`^https://[a-zA-Z0-9-]+\\.${baseDomain.replace('.', '\\.')}$`);
      if (wildcardPattern.test(origin)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if origin is localhost (for development)
   */
  private isLocalhostOrigin(origin: string): boolean {
    const localhostPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/\[::1\](:\d+)?$/,
    ];

    return localhostPatterns.some(pattern => pattern.test(origin));
  }

  /**
   * Get CORS preflight response
   */
  async getPreflightResponse(req: DynamicCorsRequest): Promise<{
    allowOrigin: string;
    allowMethods: string;
    allowHeaders: string;
    maxAge: number;
  }> {
    const config = await this.getDomainCorsConfig(req);
    
    return {
      allowOrigin: req.headers.origin || '*',
      allowMethods: config.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
      allowHeaders: config.allowedHeaders?.join(', ') || 'Content-Type, Authorization',
      maxAge: config.maxAge || 86400,
    };
  }

  /**
   * Validate CORS configuration
   */
  validateCorsConfig(config: DomainCorsConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate allowed origins
    if (config.allowedOrigins) {
      config.allowedOrigins.forEach(origin => {
        try {
          new URL(origin);
        } catch {
          errors.push(`Invalid origin: ${origin}`);
        }
      });
    }

    // Validate methods
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'];
    if (config.allowedMethods) {
      config.allowedMethods.forEach(method => {
        if (!validMethods.includes(method.toUpperCase())) {
          errors.push(`Invalid method: ${method}`);
        }
      });
    }

    // Validate max age
    if (config.maxAge && (config.maxAge < 0 || config.maxAge > 86400)) {
      errors.push('Max age must be between 0 and 86400 seconds');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update domain CORS configuration
   */
  async updateDomainCorsConfig(domainId: string, config: Partial<DomainCorsConfig>): Promise<void> {
    try {
      const validation = this.validateCorsConfig(config as DomainCorsConfig);
      if (!validation.valid) {
        throw new Error(`Invalid CORS configuration: ${validation.errors.join(', ')}`);
      }

      await prisma.domain.update({
        where: { id: domainId },
        data: {
          settings: {
            cors: config,
          },
        },
      });

      // Clear cache
      if (redis) {
        await cacheService.invalidateDomain(domainId);
      }
    } catch (error) {
      console.error('Error updating domain CORS config:', error);
      throw error;
    }
  }

  /**
   * Get domain CORS statistics
   */
  async getCorsStats(domainId: string, days: number = 7): Promise<{
    totalRequests: number;
    blockedRequests: number;
    allowedOrigins: string[];
    topOrigins: Array<{ origin: string; count: number }>;
  }> {
    // This would integrate with your analytics system
    // For now, return mock data
    return {
      totalRequests: 1000,
      blockedRequests: 50,
      allowedOrigins: this.defaultConfig.allowedOrigins || [],
      topOrigins: [
        { origin: 'https://keeper.tools', count: 500 },
        { origin: 'https://app.keeper.tools', count: 300 },
      ],
    };
  }
}

/**
 * Create dynamic CORS middleware instance
 */
export function createDynamicCorsMiddleware(config?: DomainCorsConfig) {
  const middleware = new DynamicCorsMiddleware(config);
  return middleware.createMiddleware() as (req: Request, res: Response, next: NextFunction) => void;
} 