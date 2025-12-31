/**
 * Slug Validation Service
 * Handles reserved slug protection and validation rules for domains
 */
export interface SlugValidationResult {
    isValid: boolean;
    reason?: string;
    suggestion?: string;
}
export declare class SlugValidationService {
    private static readonly RESERVED_SLUGS;
    private static readonly SLUG_PATTERN;
    private static readonly MIN_LENGTH;
    private static readonly MAX_LENGTH;
    /**
     * Validates a slug against all rules
     */
    static validateSlug(slug: string): SlugValidationResult;
    /**
     * Checks if a slug is reserved
     */
    static isReservedSlug(slug: string): boolean;
    /**
     * Gets all reserved slugs (for reference)
     */
    static getReservedSlugs(): string[];
    /**
     * Generates a slug suggestion based on input
     */
    static generateSlugSuggestion(baseSlug: string): string;
    /**
     * Sanitizes a string to be a valid slug
     */
    static sanitizeSlug(input: string): string;
    /**
     * Validates and sanitizes a slug, returning a valid version
     */
    static validateAndSanitize(input: string): {
        slug: string;
        isValid: boolean;
        wasModified: boolean;
        validation: SlugValidationResult;
    };
    /**
     * Checks if a slug is available (not reserved and passes validation)
     */
    static isSlugAvailable(slug: string): boolean;
    /**
     * Batch validates multiple slugs
     */
    static validateSlugs(slugs: string[]): Map<string, SlugValidationResult>;
    /**
     * Gets validation rules for frontend display
     */
    static getValidationRules(): {
        minLength: number;
        maxLength: number;
        pattern: string;
        description: string;
        examples: string[];
    };
}
export default SlugValidationService;
//# sourceMappingURL=SlugValidationService.d.ts.map