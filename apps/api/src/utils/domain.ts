import { Request } from 'express';

/**
 * Domain Context Utilities
 * Centralized domain parsing and validation logic for the Keeper platform
 */

/**
 * Extract subdomain from hostname
 * @param hostname - The hostname to extract subdomain from
 * @returns The subdomain or undefined if not found
 * 
 * @example
 * extractSubdomain('myapp.keeper.com') // returns 'myapp'
 * extractSubdomain('keeper.com') // returns undefined
 * extractSubdomain('sub.domain.keeper.com') // returns 'sub'
 */
export function extractSubdomain(hostname: string): string | undefined {
  if (!hostname || typeof hostname !== 'string') {
    return undefined;
  }

  // Remove port if present
  const cleanHostname = hostname.split(':')[0];
  
  // Split by dots and filter out empty parts
  const parts = cleanHostname.split('.').filter(Boolean);
  
  // Need at least 3 parts for a subdomain (sub.domain.com)
  if (parts.length < 3) {
    return undefined;
  }

  // Return the first part as subdomain
  const subdomain = parts[0];
  
  // Validate subdomain format (alphanumeric, hyphens, no consecutive hyphens)
  const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  if (!subdomainRegex.test(subdomain)) {
    return undefined;
  }

  return subdomain;
}

/**
 * Extract domain ID from request using different strategies
 * @param req - Express request object
 * @param strategy - Strategy for extracting domain ID ('subdomain', 'header', 'param', 'query')
 * @returns The domain ID or undefined if not found
 * 
 * @example
 * extractDomainId(req, 'subdomain') // extracts from subdomain
 * extractDomainId(req, 'header') // extracts from X-Domain-ID header
 * extractDomainId(req, 'param') // extracts from req.params.domainId
 * extractDomainId(req, 'query') // extracts from req.query.domainId
 */
export function extractDomainId(req: Request, strategy: 'subdomain' | 'header' | 'param' | 'query' = 'param'): string | undefined {
  if (!req) {
    return undefined;
  }

  let domainId: string | undefined;

  switch (strategy) {
    case 'subdomain':
      domainId = extractSubdomain(req.hostname || req.get('host') || '');
      break;
      
    case 'header':
      domainId = req.headers['x-domain-id'] as string || 
                req.headers['X-Domain-ID'] as string ||
                req.headers['domain-id'] as string;
      break;
      
    case 'param':
      domainId = req.params.domainId || req.params.domain_id || req.params.domain;
      break;
      
    case 'query':
      domainId = req.query.domainId as string || 
                req.query.domain_id as string || 
                req.query.domain as string;
      break;
      
    default:
      return undefined;
  }

  // Clean and validate the extracted domain ID
  if (domainId && typeof domainId === 'string') {
    domainId = domainId.trim();
    if (domainId.length === 0) {
      return undefined;
    }
  }

  return domainId;
}

/**
 * Validate if a string is a valid UUID (v4)
 * @param id - The ID to validate
 * @returns true if valid UUID, false otherwise
 * 
 * @example
 * validateDomainId('550e8400-e29b-41d4-a716-446655440000') // returns true
 * validateDomainId('invalid-id') // returns false
 * validateDomainId('') // returns false
 */
export function validateDomainId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(id.trim());
}

/**
 * Validate if a string is a valid domain slug
 * @param slug - The slug to validate
 * @returns true if valid slug, false otherwise
 * 
 * @example
 * validateDomainSlug('my-app') // returns true
 * validateDomainSlug('my_app_123') // returns true
 * validateDomainSlug('invalid..slug') // returns false
 * validateDomainSlug('') // returns false
 */
export function validateDomainSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  const cleanSlug = slug.trim();
  
  // Check length (3-63 characters)
  if (cleanSlug.length < 3 || cleanSlug.length > 63) {
    return false;
  }

  // Slug regex: alphanumeric, hyphens, underscores
  // Must start and end with alphanumeric
  const slugRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
  
  return slugRegex.test(cleanSlug);
}

/**
 * Extract domain identifier with fallback strategies
 * Tries multiple strategies in order and returns the first valid result
 * @param req - Express request object
 * @param strategies - Array of strategies to try in order
 * @returns The domain ID or undefined if not found
 * 
 * @example
 * extractDomainWithFallback(req, ['param', 'header', 'subdomain'])
 */
export function extractDomainWithFallback(
  req: Request, 
  strategies: Array<'subdomain' | 'header' | 'param' | 'query'> = ['param', 'header', 'query']
): string | undefined {
  for (const strategy of strategies) {
    const domainId = extractDomainId(req, strategy);
    if (domainId) {
      return domainId;
    }
  }
  return undefined;
}

/**
 * Parse domain context from request
 * @param req - Express request object
 * @param options - Parsing options
 * @returns Parsed domain context or null if not found
 */
export function parseDomainContext(req: Request, options: {
  strategies?: Array<'subdomain' | 'header' | 'param' | 'query'>;
  requireUUID?: boolean;
  requireSlug?: boolean;
} = {}): {
  domainId: string;
  strategy: string;
  isUUID: boolean;
  isSlug: boolean;
} | null {
  const { 
    strategies = ['param', 'header', 'query'], 
    requireUUID = false, 
    requireSlug = false 
  } = options;

  for (const strategy of strategies) {
    const domainId = extractDomainId(req, strategy);
    if (!domainId) continue;

    const isUUID = validateDomainId(domainId);
    const isSlug = validateDomainSlug(domainId);

    // Apply requirements
    if (requireUUID && !isUUID) continue;
    if (requireSlug && !isSlug) continue;

    return {
      domainId,
      strategy,
      isUUID,
      isSlug
    };
  }

  return null;
}

/**
 * Domain context extraction results
 */
export interface DomainExtractionResult {
  domainId: string;
  strategy: 'subdomain' | 'header' | 'param' | 'query';
  isUUID: boolean;
  isSlug: boolean;
  hostname?: string;
  subdomain?: string;
}

/**
 * Comprehensive domain context extraction
 * @param req - Express request object
 * @returns Complete domain extraction result or null
 */
export function extractDomainContext(req: Request): DomainExtractionResult | null {
  const hostname = req.hostname || req.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  
  const context = parseDomainContext(req, {
    strategies: ['param', 'header', 'query', 'subdomain']
  });

  if (!context) {
    return null;
  }

  return {
    ...context,
    hostname,
    subdomain: subdomain || undefined
  };
}

/**
 * Create domain validation middleware helper
 * @param options - Validation options
 * @returns Validation function
 */
export function createDomainValidator(options: {
  requireUUID?: boolean;
  requireSlug?: boolean;
  strategies?: Array<'subdomain' | 'header' | 'param' | 'query'>;
}) {
  return (req: Request): { isValid: boolean; domainId?: string; error?: string } => {
    const context = parseDomainContext(req, options);
    
    if (!context) {
      return {
        isValid: false,
        error: 'No domain ID found in request'
      };
    }

    if (options.requireUUID && !context.isUUID) {
      return {
        isValid: false,
        domainId: context.domainId,
        error: 'Domain ID must be a valid UUID'
      };
    }

    if (options.requireSlug && !context.isSlug) {
      return {
        isValid: false,
        domainId: context.domainId,
        error: 'Domain ID must be a valid slug'
      };
    }

    return {
      isValid: true,
      domainId: context.domainId
    };
  };
} 