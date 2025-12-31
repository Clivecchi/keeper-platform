import { SlugValidationService, SlugValidationResult } from '../SlugValidationService';

describe('SlugValidationService', () => {
  describe('validateSlug', () => {
    it('should accept valid slugs', () => {
      const validSlugs = [
        'my-family',
        'team-alpha',
        'creative-space',
        'johndoe-blog',
        'startup-hub',
        'ab', // minimum length
        'x'.repeat(50), // maximum length
        'test123',
        'user-profile',
        'awesome-domain'
      ];

      validSlugs.forEach(slug => {
        const result = SlugValidationService.validateSlug(slug);
        expect(result.isValid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    it('should reject empty slugs', () => {
      const result = SlugValidationService.validateSlug('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Slug cannot be empty');
    });

    it('should reject slugs that are too short', () => {
      const result = SlugValidationService.validateSlug('a');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('must be at least 2 characters');
    });

    it('should reject slugs that are too long', () => {
      const longSlug = 'a'.repeat(51);
      const result = SlugValidationService.validateSlug(longSlug);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('must be no more than 50 characters');
    });

    it('should reject slugs with invalid characters', () => {
      const invalidSlugs = [
        'My-Family', // uppercase
        'my_family', // underscore
        'my family', // space
        'my-family!', // special character
        'my-family.com', // dots
        'my/family', // slash
        'my@family', // at symbol
      ];

      invalidSlugs.forEach(slug => {
        const result = SlugValidationService.validateSlug(slug);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('lowercase letters, numbers, and hyphens');
      });
    });

    it('should reject slugs starting or ending with hyphen', () => {
      const invalidSlugs = ['-my-family', 'my-family-', '-test-'];
      
      invalidSlugs.forEach(slug => {
        const result = SlugValidationService.validateSlug(slug);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('cannot start or end with a hyphen');
      });
    });

    it('should reject slugs with consecutive hyphens', () => {
      const result = SlugValidationService.validateSlug('my--family');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('cannot contain consecutive hyphens');
    });

    it('should reject reserved slugs', () => {
      const reservedSlugs = ['kip', 'admin', 'api', 'www', 'test'];
      
      reservedSlugs.forEach(slug => {
        const result = SlugValidationService.validateSlug(slug);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('reserved and cannot be used');
        expect(result.suggestion).toBeDefined();
      });
    });

    it('should reject problematic patterns', () => {
      const problematicSlugs = ['user123', 'admin-456', 'test-789', 'temp123', 'demo-999'];
      
      problematicSlugs.forEach(slug => {
        const result = SlugValidationService.validateSlug(slug);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('slug pattern is not allowed');
      });
    });
  });

  describe('isReservedSlug', () => {
    it('should correctly identify reserved slugs', () => {
      expect(SlugValidationService.isReservedSlug('kip')).toBe(true);
      expect(SlugValidationService.isReservedSlug('admin')).toBe(true);
      expect(SlugValidationService.isReservedSlug('api')).toBe(true);
      expect(SlugValidationService.isReservedSlug('my-family')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(SlugValidationService.isReservedSlug('KIP')).toBe(true);
      expect(SlugValidationService.isReservedSlug('Admin')).toBe(true);
      expect(SlugValidationService.isReservedSlug('API')).toBe(true);
    });
  });

  describe('generateSlugSuggestion', () => {
    it('should generate valid suggestions for reserved slugs', () => {
      const suggestion = SlugValidationService.generateSlugSuggestion('admin');
      expect(suggestion).not.toBe('admin');
      expect(SlugValidationService.isReservedSlug(suggestion)).toBe(false);
    });

    it('should return clean base if not reserved', () => {
      const suggestion = SlugValidationService.generateSlugSuggestion('my-family');
      expect(suggestion).toBe('my-family');
    });

    it('should clean problematic characters', () => {
      const suggestion = SlugValidationService.generateSlugSuggestion('My Family!');
      expect(suggestion).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('sanitizeSlug', () => {
    it('should sanitize various inputs', () => {
      const testCases = [
        { input: 'My Family', expected: 'my-family' },
        { input: 'Team Alpha!', expected: 'team-alpha' },
        { input: 'Creative   Space', expected: 'creative-space' },
        { input: 'John_Doe@Blog', expected: 'johndoeblog' },
        { input: '  --Test--  ', expected: 'test' },
        { input: 'Multiple---Hyphens', expected: 'multiple-hyphens' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = SlugValidationService.sanitizeSlug(input);
        expect(result).toBe(expected);
      });
    });

    it('should truncate long inputs', () => {
      const longInput = 'a'.repeat(100);
      const result = SlugValidationService.sanitizeSlug(longInput);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('validateAndSanitize', () => {
    it('should return valid slug without modification', () => {
      const result = SlugValidationService.validateAndSanitize('my-family');
      expect(result.slug).toBe('my-family');
      expect(result.isValid).toBe(true);
      expect(result.wasModified).toBe(false);
    });

    it('should sanitize and validate input', () => {
      const result = SlugValidationService.validateAndSanitize('My Family!');
      expect(result.slug).toBe('my-family');
      expect(result.isValid).toBe(true);
      expect(result.wasModified).toBe(true);
    });

    it('should generate suggestion for reserved slugs', () => {
      const result = SlugValidationService.validateAndSanitize('admin');
      expect(result.slug).not.toBe('admin');
      expect(result.isValid).toBe(true);
      expect(result.wasModified).toBe(true);
    });
  });

  describe('isSlugAvailable', () => {
    it('should return true for available slugs', () => {
      expect(SlugValidationService.isSlugAvailable('my-family')).toBe(true);
      expect(SlugValidationService.isSlugAvailable('team-alpha')).toBe(true);
    });

    it('should return false for unavailable slugs', () => {
      expect(SlugValidationService.isSlugAvailable('admin')).toBe(false);
      expect(SlugValidationService.isSlugAvailable('kip')).toBe(false);
      expect(SlugValidationService.isSlugAvailable('My Family')).toBe(false);
    });
  });

  describe('validateSlugs', () => {
    it('should validate multiple slugs', () => {
      const slugs = ['my-family', 'admin', 'team-alpha', 'invalid slug'];
      const results = SlugValidationService.validateSlugs(slugs);
      
      expect(results.size).toBe(4);
      expect(results.get('my-family')?.isValid).toBe(true);
      expect(results.get('admin')?.isValid).toBe(false);
      expect(results.get('team-alpha')?.isValid).toBe(true);
      expect(results.get('invalid slug')?.isValid).toBe(false);
    });
  });

  describe('getReservedSlugs', () => {
    it('should return sorted array of reserved slugs', () => {
      const reserved = SlugValidationService.getReservedSlugs();
      expect(Array.isArray(reserved)).toBe(true);
      expect(reserved.length).toBeGreaterThan(0);
      expect(reserved.includes('kip')).toBe(true);
      expect(reserved.includes('admin')).toBe(true);
      
      // Should be sorted
      const sorted = [...reserved].sort();
      expect(reserved).toEqual(sorted);
    });
  });

  describe('getValidationRules', () => {
    it('should return validation rules object', () => {
      const rules = SlugValidationService.getValidationRules();
      
      expect(rules.minLength).toBe(2);
      expect(rules.maxLength).toBe(50);
      expect(rules.pattern).toBeDefined();
      expect(rules.description).toBeDefined();
      expect(Array.isArray(rules.examples)).toBe(true);
      expect(rules.examples.length).toBeGreaterThan(0);
    });
  });
}); 