/**
 * AI Token Schema - Phase 4 Implementation
 * Schema definition for AI Token v1 placeholder props
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

export const TokenConfigSchema = z.object({
  name: z.string().min(1).max(50).default('AI Assistant'),
  persona: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  styleNote: z.string().max(100).optional(),
  agentId: z.string().uuid().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#6366F1'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0)
  }).optional(),
  isVisible: z.boolean().default(true)
});

export const TokenPropsSchema = z.object({
  tokens: z.array(z.object({
    id: z.string().uuid(),
    config: TokenConfigSchema
  })).default([])
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TokenConfig = z.infer<typeof TokenConfigSchema>;
export type TokenProps = z.infer<typeof TokenPropsSchema>;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  name: 'AI Assistant',
  persona: undefined,
  avatarUrl: undefined,
  styleNote: undefined,
  agentId: undefined,
  color: '#6366F1',
  size: 'medium',
  position: undefined,
  isVisible: true
};

export const createDefaultToken = (): { id: string; config: TokenConfig } => ({
  id: crypto.randomUUID(),
  config: { ...DEFAULT_TOKEN_CONFIG }
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateTokenConfig(config: unknown): TokenConfig {
  return TokenConfigSchema.parse(config);
}

export function validateTokenProps(props: unknown): TokenProps {
  return TokenPropsSchema.parse(props);
}

export function isValidTokenConfig(config: unknown): config is TokenConfig {
  try {
    TokenConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getTokenDisplaySize(size: TokenConfig['size']): { width: number; height: number } {
  switch (size) {
    case 'small':
      return { width: 32, height: 32 };
    case 'medium':
      return { width: 48, height: 48 };
    case 'large':
      return { width: 64, height: 64 };
    default:
      return { width: 48, height: 48 };
  }
}

export function getTokenDisplayName(config: TokenConfig): string {
  return config.name || 'AI Assistant';
}

export function getTokenAvatarFallback(config: TokenConfig): string {
  const name = getTokenDisplayName(config);
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}
