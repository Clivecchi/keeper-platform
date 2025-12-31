/**
 * Domain Verification Service
 * Handles custom domain verification through DNS, HTTP, and file-based methods
 */

import { PrismaClient } from '@prisma/client';
import type { Domain } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService.js';
import { getFeatureFlagService } from './FeatureFlagService.js';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);
const dnsResolveTxt = promisify(dns.resolveTxt);
const dnsResolveCname = promisify(dns.resolveCname);

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

export class DomainVerificationService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Platform domains and IPs for verification
  private readonly KEEPER_DOMAINS = [
    'keeper.tools',
    'domains.keeper.tools',
    'app.keeper.tools',
  ];

  private readonly KEEPER_IPS = [
    '76.76.19.19',  // Example Vercel IP
    '76.76.21.21',  // Example Vercel IP
  ];

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Initiate domain verification process
   */
  async initiateVerification(
    domainId: string,
    customDomain: string,
    method: VerificationMethod = 'DNS_TXT'
  ): Promise<VerificationConfig> {
    if (!this.featureFlags.isEnabled('CUSTOM_DOMAINS_ENABLED')) {
      throw new Error('Custom domains are currently disabled');
    }

    // Validate domain format
    this.validateDomainFormat(customDomain);

    // Check if domain is already in use
    await this.checkDomainAvailability(customDomain, domainId);

    // Generate verification token and config
    const config = await this.generateVerificationConfig(method, customDomain);

    // Update domain with verification details
    await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        customDomain,
        customDomainVerified: false,
        verificationToken: config.token,
        verificationMethod: method,
        verifiedAt: null,
        updatedAt: new Date(),
      },
    });

    // Cache the verification config
    await this.cacheService.cacheVerificationConfig(domainId, config as unknown as Record<string, unknown>);

    return config;
  }

  /**
   * Verify domain ownership
   */
  async verifyDomain(domainId: string): Promise<VerificationResult> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain || !domain.customDomain || !domain.verificationToken) {
      throw new Error('Domain not found or verification not initiated');
    }

    const method = domain.verificationMethod as VerificationMethod;
    let result: VerificationResult;

    try {
      switch (method) {
        case 'DNS_TXT':
          result = await this.verifyDnsTxt(domain.customDomain, domain.verificationToken);
          break;
        case 'DNS_CNAME':
          result = await this.verifyDnsCname(domain.customDomain);
          break;
        case 'HTTP_FILE':
          result = await this.verifyHttpFile(domain.customDomain, domain.verificationToken);
          break;
        case 'META_TAG':
          result = await this.verifyMetaTag(domain.customDomain, domain.verificationToken);
          break;
        default:
          throw new Error(`Unsupported verification method: ${method}`);
      }

      // Update domain verification status
      if (result.success) {
        await this.prisma.domain.update({
          where: { id: domainId },
          data: {
            customDomainVerified: true,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Invalidate cache to refresh domain data
        await this.cacheService.invalidateDomain(domainId);
      }

      // Log verification attempt
      await this.logVerificationAttempt(domainId, method, result);

      return result;
    } catch (error) {
      const errorResult: VerificationResult = {
        success: false,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      await this.logVerificationAttempt(domainId, method, errorResult);
      return errorResult;
    }
  }

  /**
   * Verify DNS TXT record
   */
  private async verifyDnsTxt(customDomain: string, expectedToken: string): Promise<VerificationResult> {
    try {
      const txtRecords = await dnsResolveTxt(`_keeper-verification.${customDomain}`);
      const flatRecords = txtRecords.flat();

      const hasValidRecord = flatRecords.some(record => 
        record.includes(`keeper-site-verification=${expectedToken}`)
      );

      return {
        success: hasValidRecord,
        method: 'DNS_TXT',
        verifiedAt: hasValidRecord ? new Date() : undefined,
        details: {
          foundRecords: flatRecords,
          expectedToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        method: 'DNS_TXT',
        error: `DNS TXT lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify DNS CNAME record
   */
  private async verifyDnsCname(customDomain: string): Promise<VerificationResult> {
    try {
      const cnameRecords = await dnsResolveCname(customDomain);
      const pointsToKeeper = cnameRecords.some(cname => 
        this.KEEPER_DOMAINS.some(keeperDomain => 
          cname.toLowerCase().endsWith(keeperDomain.toLowerCase())
        )
      );

      return {
        success: pointsToKeeper,
        method: 'DNS_CNAME',
        verifiedAt: pointsToKeeper ? new Date() : undefined,
        details: {
          cnameRecords,
          keeperDomains: this.KEEPER_DOMAINS,
        },
      };
    } catch (error) {
      return {
        success: false,
        method: 'DNS_CNAME',
        error: `DNS CNAME lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify HTTP file method
   */
  private async verifyHttpFile(customDomain: string, expectedToken: string): Promise<VerificationResult> {
    try {
      const url = `http://${customDomain}/.well-known/keeper-verification.txt`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Keeper-Domain-Verification/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          method: 'HTTP_FILE',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const content = await response.text();
      const hasValidToken = content.trim() === expectedToken;

      return {
        success: hasValidToken,
        method: 'HTTP_FILE',
        verifiedAt: hasValidToken ? new Date() : undefined,
        details: {
          url,
          foundContent: content.trim(),
          expectedToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        method: 'HTTP_FILE',
        error: `HTTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify HTML meta tag method
   */
  private async verifyMetaTag(customDomain: string, expectedToken: string): Promise<VerificationResult> {
    try {
      const url = `http://${customDomain}/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Keeper-Domain-Verification/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          method: 'META_TAG',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      const metaTagRegex = new RegExp(`<meta\\s+name=["']keeper-site-verification["']\\s+content=["']${expectedToken}["'][^>]*>`, 'i');
      const hasValidMetaTag = metaTagRegex.test(html);

      return {
        success: hasValidMetaTag,
        method: 'META_TAG',
        verifiedAt: hasValidMetaTag ? new Date() : undefined,
        details: {
          url,
          expectedToken,
          foundMetaTag: hasValidMetaTag,
        },
      };
    } catch (error) {
      return {
        success: false,
        method: 'META_TAG',
        error: `Meta tag verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Perform comprehensive domain health check
   */
  async checkDomainHealth(customDomain: string): Promise<DomainHealthCheck> {
    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // DNS Resolution Check
    const dnsResolution = await this.checkDnsResolution(customDomain);
    if (!dnsResolution.hasARecord && !dnsResolution.hasCnameRecord) {
      issues.push('No DNS records found');
      recommendations.push('Configure A record or CNAME record for your domain');
    }

    // HTTP/HTTPS Check
    const httpChecks = await this.checkHttpEndpoints(customDomain);
    if (httpChecks.httpStatus && httpChecks.httpStatus >= 400) {
      issues.push(`HTTP endpoint returns ${httpChecks.httpStatus}`);
    }
    if (httpChecks.httpsStatus && httpChecks.httpsStatus >= 400) {
      issues.push(`HTTPS endpoint returns ${httpChecks.httpsStatus}`);
    }
    if (!httpChecks.redirectsToHttps) {
      recommendations.push('Configure HTTP to HTTPS redirect for better security');
    }

    // SSL Check
    const sslCheck = await this.checkSslCertificate(customDomain);
    
    const responseTime = Date.now() - startTime;
    const isReachable = (httpChecks.httpStatus && httpChecks.httpStatus < 400) ||
                       (httpChecks.httpsStatus && httpChecks.httpsStatus < 400);

    return {
      domain: customDomain,
      isReachable: isReachable || false,
      responseTime,
      sslValid: sslCheck.isValid,
      sslExpiresAt: sslCheck.expiresAt,
      dnsResolution,
      httpChecks,
      lastChecked: new Date(),
      issues,
      recommendations,
    };
  }

  /**
   * Generate verification configuration
   */
  private async generateVerificationConfig(
    method: VerificationMethod,
    customDomain: string
  ): Promise<VerificationConfig> {
    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let expectedValue: string;
    let instructions: string;

    switch (method) {
      case 'DNS_TXT':
        expectedValue = `keeper-site-verification=${token}`;
        instructions = `Add a TXT record to _keeper-verification.${customDomain} with value: ${expectedValue}`;
        break;
      case 'DNS_CNAME':
        expectedValue = 'domains.keeper.tools';
        instructions = `Add a CNAME record for ${customDomain} pointing to: ${expectedValue}`;
        break;
      case 'HTTP_FILE':
        expectedValue = token;
        instructions = `Create a file at http://${customDomain}/.well-known/keeper-verification.txt containing: ${token}`;
        break;
      case 'META_TAG':
        expectedValue = `<meta name="keeper-site-verification" content="${token}">`;
        instructions = `Add this meta tag to the <head> section of http://${customDomain}/: ${expectedValue}`;
        break;
      default:
        throw new Error(`Unsupported verification method: ${method}`);
    }

    return {
      method,
      token,
      expectedValue,
      instructions,
      expiresAt,
    };
  }

  /**
   * Check DNS resolution for domain
   */
  private async checkDnsResolution(customDomain: string): Promise<DomainHealthCheck['dnsResolution']> {
    const result: DomainHealthCheck['dnsResolution'] = {
      hasARecord: false,
      hasCnameRecord: false,
      pointsToKeeper: false,
      resolvedIps: [],
    };

    try {
      // Check A records
      const aRecords = await dnsResolve(customDomain, 'A');
      result.hasARecord = aRecords.length > 0;
      result.resolvedIps = aRecords;
      result.pointsToKeeper = aRecords.some(ip => this.KEEPER_IPS.includes(ip));
    } catch (error) {
      // A record lookup failed
    }

    try {
      // Check CNAME records
      const cnameRecords = await dnsResolveCname(customDomain);
      result.hasCnameRecord = cnameRecords.length > 0;
      result.pointsToKeeper = result.pointsToKeeper || cnameRecords.some(cname => 
        this.KEEPER_DOMAINS.some(keeperDomain => 
          cname.toLowerCase().endsWith(keeperDomain.toLowerCase())
        )
      );
    } catch (error) {
      // CNAME record lookup failed
    }

    return result;
  }

  /**
   * Check HTTP/HTTPS endpoints
   */
  private async checkHttpEndpoints(customDomain: string): Promise<DomainHealthCheck['httpChecks']> {
    const result: DomainHealthCheck['httpChecks'] = {
      redirectsToHttps: false,
      hasKeeperHeaders: false,
    };

    // Check HTTP
    try {
      const httpResponse = await fetch(`http://${customDomain}`, {
        method: 'GET',
        headers: { 'User-Agent': 'Keeper-Health-Check/1.0' },
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      });
      result.httpStatus = httpResponse.status;
      result.redirectsToHttps = (httpResponse.status >= 300 && httpResponse.status < 400 &&
        httpResponse.headers.get('location')?.startsWith('https://')) || false;
    } catch (error) {
      // HTTP check failed
    }

    // Check HTTPS
    try {
      const httpsResponse = await fetch(`https://${customDomain}`, {
        method: 'GET',
        headers: { 'User-Agent': 'Keeper-Health-Check/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      result.httpsStatus = httpsResponse.status;
      result.hasKeeperHeaders = httpsResponse.headers.get('x-powered-by')?.includes('Keeper') || false;
    } catch (error) {
      // HTTPS check failed
    }

    return result;
  }

  /**
   * Check SSL certificate
   */
  private async checkSslCertificate(customDomain: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    issuer?: string;
  }> {
    try {
      // For production, you would use a proper SSL checking library
      // For now, we'll simulate with a basic HTTPS request
      const response = await fetch(`https://${customDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      // In a real implementation, you would extract certificate details
      // from the TLS connection
      return {
        isValid: response.ok,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Assume 90 days
        issuer: 'Let\'s Encrypt', // Example
      };
    } catch (error) {
      return {
        isValid: false,
      };
    }
  }

  /**
   * Utility methods
   */
  private validateDomainFormat(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }

    if (domain.length > 253) {
      throw new Error('Domain name too long');
    }

    // Check against reserved domains
    const reservedDomains = ['keeper.tools', 'localhost', 'example.com', 'test.com'];
    if (reservedDomains.some(reserved => 
      domain === reserved || domain.endsWith(`.${reserved}`)
    )) {
      throw new Error('Domain is reserved and cannot be used');
    }
  }

  private async checkDomainAvailability(customDomain: string, excludeDomainId?: string): Promise<void> {
    const existingDomain = await this.prisma.domain.findFirst({
      where: {
        customDomain,
        id: excludeDomainId ? { not: excludeDomainId } : undefined,
      },
    });

    if (existingDomain) {
      throw new Error('Domain is already in use');
    }
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async logVerificationAttempt(
    domainId: string,
    method: VerificationMethod,
    result: VerificationResult
  ): Promise<void> {
    try {
      await this.prisma.domainUsage.create({
        data: {
          domainId,
          userId: null,
          action: `domain_verification_${result.success ? 'success' : 'failed'}`,
          metadata: {
            method,
            success: result.success,
            error: result.error,
            verifiedAt: result.verifiedAt,
          },
          timestamp: new Date(),
          userAgent: 'Keeper-Domain-Verification/1.0',
        },
      });
    } catch (error) {
      console.error('Failed to log verification attempt:', error);
    }
  }

  /**
   * Batch verification for multiple domains
   */
  async batchVerifyDomains(domainIds: string[]): Promise<Map<string, VerificationResult>> {
    const results = new Map<string, VerificationResult>();
    
    // Process in batches to avoid overwhelming DNS/HTTP services
    const batchSize = 5;
    for (let i = 0; i < domainIds.length; i += batchSize) {
      const batch = domainIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (domainId) => {
        try {
          const result = await this.verifyDomain(domainId);
          return { domainId, result };
        } catch (error) {
          return {
            domainId,
            result: {
              success: false,
              method: 'DNS_TXT' as VerificationMethod,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ domainId, result }) => {
        results.set(domainId, result);
      });

      // Small delay between batches
      if (i + batchSize < domainIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export default DomainVerificationService; 