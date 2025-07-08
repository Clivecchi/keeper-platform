/**
 * Slug Validation Service
 * Handles reserved slug protection and validation rules for domains
 */

export interface SlugValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

export class SlugValidationService {
  private static readonly RESERVED_SLUGS = new Set([
    // Core platform slugs
    'kip', 'studio', 'admin', 'builder', 'api', 'www', 'app', 'dashboard',
    
    // Technical slugs
    'mail', 'ftp', 'smtp', 'imap', 'pop', 'ldap', 'dns', 'ntp',
    'localhost', 'test', 'dev', 'staging', 'prod', 'production',
    
    // Security/System slugs
    'security', 'system', 'root', 'administrator', 'mod', 'moderator',
    'support', 'help', 'docs', 'documentation', 'legal', 'privacy',
    
    // Business/Brand slugs
    'keeper', 'keepers', 'sole', 'journey', 'journeys', 'moment', 'moments',
    'about', 'contact', 'pricing', 'blog', 'news', 'press',
    
    // Common service slugs
    'auth', 'login', 'register', 'signup', 'signin', 'logout',
    'profile', 'settings', 'preferences', 'account', 'billing',
    
    // File/Resource slugs
    'assets', 'static', 'public', 'cdn', 'media', 'uploads', 'files',
    'css', 'js', 'img', 'images', 'fonts', 'icons',
    
    // Status/Error slugs
    'status', 'health', 'ping', 'error', '404', '500', 'maintenance',
    
    // Social/Community slugs
    'social', 'community', 'forum', 'chat', 'discuss', 'feedback'
  ]);

  private static readonly SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  private static readonly MIN_LENGTH = 2;
  private static readonly MAX_LENGTH = 50;

  /**
   * Validates a slug against all rules
   */
  public static validateSlug(slug: string): SlugValidationResult {
    // Check if empty
    if (!slug) {
      return {
        isValid: false,
        reason: 'Slug cannot be empty',
        suggestion: 'Please provide a valid slug'
      };
    }

    // Check length
    if (slug.length < this.MIN_LENGTH) {
      return {
        isValid: false,
        reason: `Slug must be at least ${this.MIN_LENGTH} characters long`,
        suggestion: `Current length: ${slug.length}. Please add more characters.`
      };
    }

    if (slug.length > this.MAX_LENGTH) {
      return {
        isValid: false,
        reason: `Slug must be no more than ${this.MAX_LENGTH} characters long`,
        suggestion: `Current length: ${slug.length}. Please shorten the slug.`
      };
    }

    // Check pattern (lowercase, alphanumeric, hyphens only)
    if (!this.SLUG_PATTERN.test(slug)) {
      return {
        isValid: false,
        reason: 'Slug can only contain lowercase letters, numbers, and hyphens',
        suggestion: 'Use only a-z, 0-9, and hyphens. No spaces, uppercase, or special characters.'
      };
    }

    // Check if starts or ends with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return {
        isValid: false,
        reason: 'Slug cannot start or end with a hyphen',
        suggestion: 'Remove hyphens from the beginning or end of the slug'
      };
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      return {
        isValid: false,
        reason: 'Slug cannot contain consecutive hyphens',
        suggestion: 'Use only single hyphens to separate words'
      };
    }

    // Check if reserved
    if (this.RESERVED_SLUGS.has(slug.toLowerCase())) {
      return {
        isValid: false,
        reason: 'This slug is reserved and cannot be used',
        suggestion: this.generateSlugSuggestion(slug)
      };
    }

    // Check for potentially problematic patterns
    const problematicPatterns = [
      /^user-?\d+$/i,      // user123, user-123
      /^admin-?\d+$/i,     // admin123, admin-123
      /^test-?\d+$/i,      // test123, test-123
      /^temp-?\d+$/i,      // temp123, temp-123
      /^demo-?\d+$/i,      // demo123, demo-123
    ];

    for (const pattern of problematicPatterns) {
      if (pattern.test(slug)) {
        return {
          isValid: false,
          reason: 'This slug pattern is not allowed',
          suggestion: 'Please choose a more descriptive slug'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Checks if a slug is reserved
   */
  public static isReservedSlug(slug: string): boolean {
    return this.RESERVED_SLUGS.has(slug.toLowerCase());
  }

  /**
   * Gets all reserved slugs (for reference)
   */
  public static getReservedSlugs(): string[] {
    return Array.from(this.RESERVED_SLUGS).sort();
  }

  /**
   * Generates a slug suggestion based on input
   */
  public static generateSlugSuggestion(baseSlug: string): string {
    // Clean the base slug
    const cleanBase = baseSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // If the clean base is valid and not reserved, return it
    if (cleanBase && !this.isReservedSlug(cleanBase)) {
      return cleanBase;
    }

    // Generate alternatives
    const alternatives = [
      `${cleanBase}-domain`,
      `${cleanBase}-space`,
      `${cleanBase}-hub`,
      `${cleanBase}-place`,
      `my-${cleanBase}`,
      `${cleanBase}-keeper`,
      `${cleanBase}-family`,
      `${cleanBase}-team`
    ];

    // Return first non-reserved alternative
    for (const alt of alternatives) {
      if (!this.isReservedSlug(alt)) {
        return alt;
      }
    }

    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanBase}-${timestamp}`;
  }

  /**
   * Sanitizes a string to be a valid slug
   */
  public static sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
      .substring(0, this.MAX_LENGTH); // Truncate to max length
  }

  /**
   * Validates and sanitizes a slug, returning a valid version
   */
  public static validateAndSanitize(input: string): {
    slug: string;
    isValid: boolean;
    wasModified: boolean;
    validation: SlugValidationResult;
  } {
    const original = input;
    const sanitized = this.sanitizeSlug(input);
    const validation = this.validateSlug(sanitized);

    if (!validation.isValid && sanitized) {
      // Try to generate a valid suggestion
      const suggestion = this.generateSlugSuggestion(sanitized);
      return {
        slug: suggestion,
        isValid: true,
        wasModified: true,
        validation: { isValid: true }
      };
    }

    return {
      slug: sanitized,
      isValid: validation.isValid,
      wasModified: original !== sanitized,
      validation
    };
  }

  /**
   * Checks if a slug is available (not reserved and passes validation)
   */
  public static isSlugAvailable(slug: string): boolean {
    const validation = this.validateSlug(slug);
    return validation.isValid;
  }

  /**
   * Batch validates multiple slugs
   */
  public static validateSlugs(slugs: string[]): Map<string, SlugValidationResult> {
    const results = new Map<string, SlugValidationResult>();
    
    for (const slug of slugs) {
      results.set(slug, this.validateSlug(slug));
    }
    
    return results;
  }

  /**
   * Gets validation rules for frontend display
   */
  public static getValidationRules(): {
    minLength: number;
    maxLength: number;
    pattern: string;
    description: string;
    examples: string[];
  } {
    return {
      minLength: this.MIN_LENGTH,
      maxLength: this.MAX_LENGTH,
      pattern: this.SLUG_PATTERN.source,
      description: 'Lowercase letters, numbers, and hyphens only. Cannot start/end with hyphen.',
      examples: [
        'my-family',
        'team-alpha',
        'creative-space',
        'johndoe-blog',
        'startup-hub'
      ]
    };
  }
}

export default SlugValidationService; 