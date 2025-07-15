/**
 * Domain Error Tests
 * Basic tests and examples for DomainError class functionality
 */

import { DomainError, isDomainError } from './DomainError.js';

console.log('=== Testing DomainError Class ===\n');

// Test basic error creation
console.log('1. Basic Error Creation:');
const basicError = new DomainError('TEST_ERROR', 'This is a test error', 400);
console.log('Code:', basicError.code);
console.log('Message:', basicError.message);
console.log('Status Code:', basicError.statusCode);
console.log('Timestamp:', basicError.timestamp);
console.log('Is Domain Error:', DomainError.isDomainError(basicError));
console.log('');

// Test JSON serialization
console.log('2. JSON Serialization:');
console.log('JSON:', JSON.stringify(basicError.toJSON(), null, 2));
console.log('');

// Test Authentication Errors
console.log('3. Authentication Errors (401):');
const authRequired = DomainError.AuthRequired();
const invalidToken = DomainError.InvalidToken('JWT token is malformed');
const sessionExpired = DomainError.SessionExpired();

console.log('Auth Required:', authRequired.toJSON());
console.log('Invalid Token:', invalidToken.toJSON());
console.log('Session Expired:', sessionExpired.toJSON());
console.log('');

// Test Authorization Errors
console.log('4. Authorization Errors (403):');
const accessDenied = DomainError.AccessDenied();
const insufficientPerms = DomainError.InsufficientPermissions('Need admin role');
const ownerRequired = DomainError.OwnerRequired();

console.log('Access Denied:', accessDenied.code, '-', accessDenied.statusCode);
console.log('Insufficient Permissions:', insufficientPerms.code, '-', insufficientPerms.statusCode);
console.log('Owner Required:', ownerRequired.code, '-', ownerRequired.statusCode);
console.log('');

// Test Not Found Errors
console.log('5. Not Found Errors (404):');
const domainNotFound = DomainError.DomainNotFound('abc123');
const userNotFound = DomainError.UserNotFound('user456');
const resourceNotFound = DomainError.ResourceNotFound('Keeper', 'keeper789');

console.log('Domain Not Found:', domainNotFound.toJSON());
console.log('User Not Found:', userNotFound.toJSON());
console.log('Resource Not Found:', resourceNotFound.toJSON());
console.log('');

// Test Validation Errors
console.log('6. Validation Errors (400):');
const invalidRequest = DomainError.InvalidRequest('Missing required fields');
const invalidDomainId = DomainError.InvalidDomainId('not-a-uuid');
const invalidSlug = DomainError.InvalidSlug('invalid..slug');
const validationFailed = DomainError.ValidationFailed('email', 'Must be a valid email address');
const missingRequired = DomainError.MissingRequired('name');

console.log('Invalid Request:', invalidRequest.code);
console.log('Invalid Domain ID:', invalidDomainId.code);
console.log('Invalid Slug:', invalidSlug.code);
console.log('Validation Failed:', validationFailed.code);
console.log('Missing Required:', missingRequired.code);
console.log('');

// Test Conflict Errors
console.log('7. Conflict Errors (409):');
const domainExists = DomainError.DomainExists('my-domain');
const slugTaken = DomainError.SlugTaken('taken-slug');
const resourceConflict = DomainError.ResourceConflict('Resource already exists');

console.log('Domain Exists:', domainExists.toJSON());
console.log('Slug Taken:', slugTaken.toJSON());
console.log('Resource Conflict:', resourceConflict.toJSON());
console.log('');

// Test Quota Errors
console.log('8. Quota & Rate Limiting Errors (429):');
const rateLimited = DomainError.RateLimited('Too many requests');
const memoryQuotaExceeded = DomainError.MemoryQuotaExceeded(1000000, 500000);
const userLimitExceeded = DomainError.UserLimitExceeded(15, 10);
const keeperLimitExceeded = DomainError.KeeperLimitExceeded(55, 50);

console.log('Rate Limited:', rateLimited.code);
console.log('Memory Quota Exceeded:', memoryQuotaExceeded.toJSON());
console.log('User Limit Exceeded:', userLimitExceeded.toJSON());
console.log('Keeper Limit Exceeded:', keeperLimitExceeded.toJSON());
console.log('');

// Test Server Errors
console.log('9. Server Errors (500+):');
const serviceUnavailable = DomainError.ServiceUnavailable('Redis');
const databaseError = DomainError.DatabaseError('Connection timeout');
const cacheError = DomainError.CacheError('Cache miss');
const externalServiceError = DomainError.ExternalServiceError('OpenAI API', 'Rate limit exceeded');
const internalError = DomainError.InternalError('Unexpected server error');

console.log('Service Unavailable:', serviceUnavailable.code, '-', serviceUnavailable.statusCode);
console.log('Database Error:', databaseError.code, '-', databaseError.statusCode);
console.log('Cache Error:', cacheError.code, '-', cacheError.statusCode);
console.log('External Service Error:', externalServiceError.toJSON());
console.log('Internal Error:', internalError.code, '-', internalError.statusCode);
console.log('');

// Test Domain-specific Errors
console.log('10. Domain-specific Errors:');
const domainInactive = DomainError.DomainInactive('domain123');
const customDomainNotVerified = DomainError.CustomDomainNotVerified('myapp.example.com');
const permissionExpired = DomainError.PermissionExpired('admin');
const featureDisabled = DomainError.FeatureDisabled('custom_domains');

console.log('Domain Inactive:', domainInactive.toJSON());
console.log('Custom Domain Not Verified:', customDomainNotVerified.toJSON());
console.log('Permission Expired:', permissionExpired.toJSON());
console.log('Feature Disabled:', featureDisabled.toJSON());
console.log('');

// Test Memory-specific Errors
console.log('11. Memory-specific Errors:');
const memoryIsolationError = DomainError.MemoryIsolationError('Failed to isolate memory scope');
const memoryAccessDenied = DomainError.MemoryAccessDenied('domain123');
const memoryCorrupted = DomainError.MemoryCorrupted('domain456');

console.log('Memory Isolation Error:', memoryIsolationError.toJSON());
console.log('Memory Access Denied:', memoryAccessDenied.toJSON());
console.log('Memory Corrupted:', memoryCorrupted.toJSON());
console.log('');

// Test Utility Methods
console.log('12. Utility Methods:');
console.log('Is Domain Error (DomainError):', DomainError.isDomainError(authRequired));
console.log('Is Domain Error (regular Error):', DomainError.isDomainError(new Error('test')));
console.log('Is Error Code AUTH_REQUIRED:', DomainError.isErrorCode(authRequired, 'AUTH_REQUIRED'));
console.log('Is Error Code WRONG_CODE:', DomainError.isErrorCode(authRequired, 'WRONG_CODE'));
console.log('Is Client Error (400):', invalidRequest.isClientError());
console.log('Is Server Error (400):', invalidRequest.isServerError());
console.log('Is Client Error (500):', internalError.isClientError());
console.log('Is Server Error (500):', internalError.isServerError());
console.log('');

// Test Error Conversion
console.log('13. Error Conversion:');
const regularError = new Error('Regular JavaScript error');
const convertedError = DomainError.fromError(regularError);
console.log('Converted Error:', convertedError.toJSON());

const stringError = DomainError.fromError('String error message');
console.log('String Error:', stringError.toJSON());

const unknownError = DomainError.fromError({ weird: 'object' });
console.log('Unknown Error:', unknownError.toJSON());

const existingDomainError = DomainError.fromError(authRequired);
console.log('Existing Domain Error (should be unchanged):', existingDomainError === authRequired);
console.log('');

// Test Type Guard
console.log('14. Type Guard Function:');
console.log('isDomainError function test:', isDomainError(authRequired));
console.log('isDomainError with regular error:', isDomainError(new Error('test')));
console.log('');

// Simulate middleware usage
console.log('15. Simulated Middleware Usage:');
function simulateMiddleware(user: unknown, domainContext: unknown) {
  try {
    if (!user) {
      throw DomainError.AuthRequired();
    }
    
    if (!domainContext) {
      throw DomainError.DomainNotFound();
    }
    
    if ((user as any).role !== 'admin' && (domainContext as any).ownerId !== (user as any).id) {
      throw DomainError.AccessDenied();
    }
    
    return { success: true, message: 'Access granted' };
    
  } catch (error) {
    if (DomainError.isDomainError(error)) {
      return {
        success: false,
        error: error.code,
        message: error.message,
        statusCode: error.statusCode
      };
    }
    
    const domainError = DomainError.fromError(error);
    return {
      success: false,
      error: domainError.code,
      message: domainError.message,
      statusCode: domainError.statusCode
    };
  }
}

// Test scenarios
const user = { role: 'admin', id: 'abc' };
const domainContext = { ownerId: 'abc' };
console.log('No user:', simulateMiddleware(null, { id: 'domain1', ownerId: 'user1' }));
console.log('No domain:', simulateMiddleware({ id: 'user1', role: 'user' }, null));
console.log('Access denied:', simulateMiddleware({ id: 'user2', role: 'user' }, { id: 'domain1', ownerId: 'user1' }));
console.log('Access granted (owner):', simulateMiddleware({ id: 'user1', role: 'user' }, { id: 'domain1', ownerId: 'user1' }));
console.log('Access granted (admin):', simulateMiddleware({ id: 'user2', role: 'admin' }, { id: 'domain1', ownerId: 'user1' }));

console.log('\n=== All DomainError tests completed ==='); 