/**
 * Domain Utilities Tests
 * Basic tests and examples for domain context utilities
 */

import { 
  extractSubdomain, 
  extractDomainId, 
  validateDomainId, 
  validateDomainSlug,
  extractDomainContext,
  createDomainValidator
} from './domain';

// Mock Express Request for testing
const createMockRequest = (options: {
  hostname?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}) => ({
  hostname: options.hostname || 'localhost',
  params: options.params || {},
  query: options.query || {},
  headers: options.headers || {},
  get: (header: string) => {
    if (header === 'host') return options.hostname;
    return options.headers?.[header];
  }
} as any);

// Test extractSubdomain function
console.log('=== Testing extractSubdomain ===');
console.log('myapp.keeper.com:', extractSubdomain('myapp.keeper.com')); // Should return 'myapp'
console.log('keeper.com:', extractSubdomain('keeper.com')); // Should return undefined
console.log('sub.domain.keeper.com:', extractSubdomain('sub.domain.keeper.com')); // Should return 'sub'
console.log('localhost:3000:', extractSubdomain('localhost:3000')); // Should return undefined
console.log('invalid..hostname:', extractSubdomain('invalid..hostname')); // Should return undefined

// Test validateDomainId function
console.log('\n=== Testing validateDomainId ===');
console.log('Valid UUID:', validateDomainId('550e8400-e29b-41d4-a716-446655440000')); // Should return true
console.log('Invalid UUID:', validateDomainId('invalid-id')); // Should return false
console.log('Empty string:', validateDomainId('')); // Should return false
console.log('Another valid UUID:', validateDomainId('123e4567-e89b-42d3-a456-426614174000')); // Should return true

// Test validateDomainSlug function
console.log('\n=== Testing validateDomainSlug ===');
console.log('Valid slug "my-app":', validateDomainSlug('my-app')); // Should return true
console.log('Valid slug "my_app_123":', validateDomainSlug('my_app_123')); // Should return true
console.log('Invalid slug "invalid..slug":', validateDomainSlug('invalid..slug')); // Should return false
console.log('Invalid slug "":', validateDomainSlug('')); // Should return false
console.log('Invalid slug "ab":', validateDomainSlug('ab')); // Should return false (too short)

// Test extractDomainId function
console.log('\n=== Testing extractDomainId ===');

// Test parameter extraction
const reqWithParam = createMockRequest({
  params: { domainId: '123e4567-e89b-42d3-a456-426614174000' }
});
console.log('From params:', extractDomainId(reqWithParam, 'param')); // Should return UUID

// Test header extraction
const reqWithHeader = createMockRequest({
  headers: { 'x-domain-id': 'my-domain-slug' }
});
console.log('From headers:', extractDomainId(reqWithHeader, 'header')); // Should return 'my-domain-slug'

// Test query extraction
const reqWithQuery = createMockRequest({
  query: { domainId: 'query-domain' }
});
console.log('From query:', extractDomainId(reqWithQuery, 'query')); // Should return 'query-domain'

// Test subdomain extraction
const reqWithSubdomain = createMockRequest({
  hostname: 'myapp.keeper.com'
});
console.log('From subdomain:', extractDomainId(reqWithSubdomain, 'subdomain')); // Should return 'myapp'

// Test extractDomainContext function
console.log('\n=== Testing extractDomainContext ===');

const complexReq = createMockRequest({
  hostname: 'myapp.keeper.com',
  params: { domainId: '123e4567-e89b-42d3-a456-426614174000' },
  headers: { 'x-domain-id': 'header-domain' }
});

const context = extractDomainContext(complexReq);
console.log('Complex context:', JSON.stringify(context, null, 2));

// Test createDomainValidator function
console.log('\n=== Testing createDomainValidator ===');

const uuidValidator = createDomainValidator({ requireUUID: true });
const slugValidator = createDomainValidator({ requireSlug: true });

const reqWithValidUUID = createMockRequest({
  params: { domainId: '123e4567-e89b-42d3-a456-426614174000' }
});

const reqWithValidSlug = createMockRequest({
  params: { domainId: 'my-valid-slug' }
});

console.log('UUID validation (valid):', uuidValidator(reqWithValidUUID));
console.log('UUID validation (invalid):', uuidValidator(reqWithValidSlug));
console.log('Slug validation (valid):', slugValidator(reqWithValidSlug));
console.log('Slug validation (invalid):', slugValidator(reqWithValidUUID));

// Example usage in middleware
console.log('\n=== Example Middleware Usage ===');

const domainMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const context = extractDomainContext(req);
  
  if (!context) {
    return res.status(400).json({ error: 'Domain context required' });
  }
  
  console.log(`Domain resolved: ${context.domainId} via ${context.strategy}`);
  
  // Add domain context to request
  req.domainContext = {
    id: context.domainId,
    strategy: context.strategy,
    isUUID: context.isUUID,
    isSlug: context.isSlug
  };
  
  next();
};

// Simulate middleware execution
const mockRes = {
  status: (code: number) => ({ json: (data: unknown) => console.log(`Response ${code}:`, data) })
};

const mockNext = () => console.log('Middleware passed, continuing...');

console.log('Testing middleware with valid request:');
domainMiddleware(reqWithParam, mockRes, mockNext);

console.log('\nTesting middleware with invalid request:');
const invalidReq = createMockRequest({});
domainMiddleware(invalidReq, mockRes, mockNext);

console.log('\n=== All tests completed ==='); 