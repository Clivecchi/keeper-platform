/**
 * Domain Error Handler Class
 * Reusable domain-level error codes and consistent error handling across all middleware
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where the error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      ...(this.details && { details: this.details })
    };
  }

  /**
   * Static helper methods for common domain errors
   */

  // Authentication Errors (401)
  static AuthRequired(message: string = 'Authentication required'): DomainError {
    return new DomainError('AUTH_REQUIRED', message, 401);
  }

  static InvalidToken(message: string = 'Invalid or expired token'): DomainError {
    return new DomainError('INVALID_TOKEN', message, 401);
  }

  static SessionExpired(message: string = 'Session has expired'): DomainError {
    return new DomainError('SESSION_EXPIRED', message, 401);
  }

  // Authorization Errors (403)
  static AccessDenied(message: string = 'Access denied'): DomainError {
    return new DomainError('ACCESS_DENIED', message, 403);
  }

  static InsufficientPermissions(message: string = 'Insufficient permissions for this operation'): DomainError {
    return new DomainError('INSUFFICIENT_PERMISSIONS', message, 403);
  }

  static OwnerRequired(message: string = 'Owner access required'): DomainError {
    return new DomainError('OWNER_REQUIRED', message, 403);
  }

  static AdminRequired(message: string = 'Administrator access required'): DomainError {
    return new DomainError('ADMIN_REQUIRED', message, 403);
  }

  // Not Found Errors (404)
  static DomainNotFound(domainId?: string): DomainError {
    const message = domainId 
      ? `Domain with ID "${domainId}" not found`
      : 'Domain not found';
    return new DomainError('DOMAIN_NOT_FOUND', message, 404, { domainId });
  }

  static UserNotFound(userId?: string): DomainError {
    const message = userId 
      ? `User with ID "${userId}" not found`
      : 'User not found';
    return new DomainError('USER_NOT_FOUND', message, 404, { userId });
  }

  static ResourceNotFound(resourceType: string, resourceId?: string): DomainError {
    const message = resourceId 
      ? `${resourceType} with ID "${resourceId}" not found`
      : `${resourceType} not found`;
    return new DomainError('RESOURCE_NOT_FOUND', message, 404, { resourceType, resourceId });
  }

  // Validation Errors (400)
  static InvalidRequest(message: string = 'Invalid request'): DomainError {
    return new DomainError('INVALID_REQUEST', message, 400);
  }

  static InvalidDomainId(domainId: string): DomainError {
    return new DomainError(
      'INVALID_DOMAIN_ID', 
      `Invalid domain ID format: "${domainId}"`, 
      400, 
      { domainId }
    );
  }

  static InvalidSlug(slug: string): DomainError {
    return new DomainError(
      'INVALID_SLUG', 
      `Invalid slug format: "${slug}"`, 
      400, 
      { slug }
    );
  }

  static ValidationFailed(field: string, message: string): DomainError {
    return new DomainError(
      'VALIDATION_FAILED', 
      `Validation failed for ${field}: ${message}`, 
      400, 
      { field, validationMessage: message }
    );
  }

  static MissingRequired(field: string): DomainError {
    return new DomainError(
      'MISSING_REQUIRED_FIELD', 
      `Required field missing: ${field}`, 
      400, 
      { field }
    );
  }

  // Conflict Errors (409)
  static DomainExists(identifier: string): DomainError {
    return new DomainError(
      'DOMAIN_EXISTS', 
      `Domain already exists: "${identifier}"`, 
      409, 
      { identifier }
    );
  }

  static SlugTaken(slug: string): DomainError {
    return new DomainError(
      'SLUG_TAKEN', 
      `Slug "${slug}" is already taken`, 
      409, 
      { slug }
    );
  }

  static ResourceConflict(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('RESOURCE_CONFLICT', message, 409, details);
  }

  // Rate Limiting & Quota Errors (429)
  static RateLimited(message: string = 'Rate limit exceeded'): DomainError {
    return new DomainError('RATE_LIMITED', message, 429);
  }

  static MemoryQuotaExceeded(currentUsage?: number, maxUsage?: number): DomainError {
    const message = currentUsage && maxUsage
      ? `Memory quota exceeded: ${currentUsage}/${maxUsage} bytes`
      : 'Memory quota exceeded';
    return new DomainError('MEMORY_QUOTA_EXCEEDED', message, 429, { currentUsage, maxUsage });
  }

  static UserLimitExceeded(current: number, max: number): DomainError {
    return new DomainError(
      'USER_LIMIT_EXCEEDED', 
      `User limit exceeded: ${current}/${max} users`, 
      429, 
      { current, max }
    );
  }

  static KeeperLimitExceeded(current: number, max: number): DomainError {
    return new DomainError(
      'KEEPER_LIMIT_EXCEEDED', 
      `Keeper limit exceeded: ${current}/${max} keepers`, 
      429, 
      { current, max }
    );
  }

  // Server Errors (500)
  static ServiceUnavailable(service?: string): DomainError {
    const message = service 
      ? `Service unavailable: ${service}`
      : 'Service temporarily unavailable';
    return new DomainError('SERVICE_UNAVAILABLE', message, 503, { service });
  }

  static DatabaseError(message: string = 'Database operation failed'): DomainError {
    return new DomainError('DATABASE_ERROR', message, 500);
  }

  static CacheError(message: string = 'Cache operation failed'): DomainError {
    return new DomainError('CACHE_ERROR', message, 500);
  }

  static ExternalServiceError(service: string, message?: string): DomainError {
    const errorMessage = message 
      ? `External service error (${service}): ${message}`
      : `External service error: ${service}`;
    return new DomainError('EXTERNAL_SERVICE_ERROR', errorMessage, 502, { service });
  }

  static InternalError(message: string = 'Internal server error'): DomainError {
    return new DomainError('INTERNAL_ERROR', message, 500);
  }

  // Domain-specific Errors
  static DomainInactive(domainId: string): DomainError {
    return new DomainError(
      'DOMAIN_INACTIVE', 
      `Domain "${domainId}" is inactive`, 
      403, 
      { domainId }
    );
  }

  static CustomDomainNotVerified(customDomain: string): DomainError {
    return new DomainError(
      'CUSTOM_DOMAIN_NOT_VERIFIED', 
      `Custom domain "${customDomain}" is not verified`, 
      403, 
      { customDomain }
    );
  }

  static PermissionExpired(permission: string): DomainError {
    return new DomainError(
      'PERMISSION_EXPIRED', 
      `Permission "${permission}" has expired`, 
      403, 
      { permission }
    );
  }

  static FeatureDisabled(feature: string): DomainError {
    return new DomainError(
      'FEATURE_DISABLED', 
      `Feature "${feature}" is disabled`, 
      403, 
      { feature }
    );
  }

  // Memory-specific Errors
  static MemoryIsolationError(message: string): DomainError {
    return new DomainError('MEMORY_ISOLATION_ERROR', message, 500);
  }

  static MemoryAccessDenied(domainId: string): DomainError {
    return new DomainError(
      'MEMORY_ACCESS_DENIED', 
      `Memory access denied for domain "${domainId}"`, 
      403, 
      { domainId }
    );
  }

  static MemoryCorrupted(domainId: string): DomainError {
    return new DomainError(
      'MEMORY_CORRUPTED', 
      `Memory data corrupted for domain "${domainId}"`, 
      500, 
      { domainId }
    );
  }

  /**
   * Utility methods
   */

  /**
   * Check if error is a specific domain error type
   */
  static isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError;
  }

  /**
   * Check if error is a specific error code
   */
  static isErrorCode(error: unknown, code: string): boolean {
    return this.isDomainError(error) && error.code === code;
  }

  /**
   * Check if error is client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Create error from unknown error
   */
  static fromError(error: unknown, fallbackMessage: string = 'Unknown error occurred'): DomainError {
    if (this.isDomainError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new DomainError('UNKNOWN_ERROR', error.message || fallbackMessage, 500);
    }

    if (typeof error === 'string') {
      return new DomainError('UNKNOWN_ERROR', error, 500);
    }

    return new DomainError('UNKNOWN_ERROR', fallbackMessage, 500);
  }
}

/**
 * Type guard for DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return DomainError.isDomainError(error);
}

/**
 * Error response interface for API responses
 */
export interface DomainErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: Record<string, unknown>;
} 