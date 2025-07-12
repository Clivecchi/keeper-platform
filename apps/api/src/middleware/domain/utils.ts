/**
 * Domain Middleware Utilities
 * Helper functions for domain extraction and validation
 */

import { Request } from 'express';
import { DomainContextStrategy } from './resolveDomainContext';

/**
 * Extract domain ID from request using specified strategy
 */
export function extractDomainId(req: Request, strategy: DomainContextStrategy): string | undefined {
  switch (strategy) {
    case 'param':
      return req.params.domainId;
    
    case 'subdomain':
      return extractSubdomain(req.hostname);
    
    case 'header':
      return req.headers['x-domain-id'] as string;
    
    case 'query':
      return req.query.domainId as string;
    
    default:
      return undefined;
  }
}

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): string | undefined {
  if (!hostname) return undefined;
  
  const parts = hostname.split('.');
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) return undefined;
  
  // Return first part as subdomain
  const subdomain = parts[0];
  
  // Validate subdomain format
  if (!isValidSubdomain(subdomain)) return undefined;
  
  return subdomain;
}

/**
 * Validate domain ID format (UUID v4)
 */
export function validateDomainId(domainId: string): boolean {
  if (!domainId || typeof domainId !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(domainId);
}

/**
 * Validate domain slug format
 */
export function validateDomainSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  
  // Must be 3-63 characters, alphanumeric, hyphens, underscores
  const slugRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_-]{1,61}[a-zA-Z0-9])?$/;
  return slugRegex.test(slug);
}

/**
 * Validate subdomain format
 */
function isValidSubdomain(subdomain: string): boolean {
  if (!subdomain || typeof subdomain !== 'string') return false;
  
  // Basic subdomain validation
  const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return subdomainRegex.test(subdomain);
}

/**
 * Check if domain ID is valid UUID or slug
 */
export function isValidDomainIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  
  // Check if it's a valid UUID
  if (validateDomainId(identifier)) return true;
  
  // Check if it's a valid slug
  if (validateDomainSlug(identifier)) return true;
  
  return false;
}

/**
 * Normalize domain identifier
 */
export function normalizeDomainId(identifier: string): string {
  if (!identifier) return '';
  
  return identifier.toLowerCase().trim();
}

/**
 * Extract domain context from multiple sources with fallback
 */
export function extractDomainContext(req: Request): {
  domainId?: string;
  strategy: DomainContextStrategy;
  source: string;
} {
  // Try param first (most explicit)
  let domainId = extractDomainId(req, 'param');
  if (domainId) {
    return { domainId, strategy: 'param', source: 'url_parameter' };
  }

  // Try header next (API clients)
  domainId = extractDomainId(req, 'header');
  if (domainId) {
    return { domainId, strategy: 'header', source: 'x_domain_id_header' };
  }

  // Try query parameter
  domainId = extractDomainId(req, 'query');
  if (domainId) {
    return { domainId, strategy: 'query', source: 'query_parameter' };
  }

  // Try subdomain last (least reliable)
  domainId = extractDomainId(req, 'subdomain');
  if (domainId) {
    return { domainId, strategy: 'subdomain', source: 'hostname_subdomain' };
  }

  return { strategy: 'param', source: 'none' };
} 