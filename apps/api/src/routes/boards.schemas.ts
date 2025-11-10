/**
 * Board Management Schemas
 * =======================
 * Zod validation schemas for Domain Board Management operations
 */

import { z } from 'zod';

/**
 * Set Viewer Mode Schema
 * Validates viewer mode changes (public/member/editor)
 */
export const viewerModeSchema = z.object({
  mode: z.enum(['public', 'member', 'editor']),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Add Frame Schema
 * Validates new frame creation on a board
 */
export const addFrameSchema = z.object({
  pattern: z.string().min(1),
  name: z.string().min(1),
  index: z.number().int().nonnegative().optional(),
  props: z.record(z.any()).optional(),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Update Frame Schema
 * Validates frame updates
 */
export const updateFrameSchema = z.object({
  patch: z.record(z.any()),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Set Cover Schema
 * Validates cover image upload
 */
export const setCoverSchema = z.object({
  mime: z.string(),
  name: z.string(),
  bytesBase64: z.string(),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Upsert Navigation Schema
 * Validates navigation items
 */
export const upsertNavSchema = z.object({
  items: z.array(z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    icon: z.string().optional(),
  })),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Publish Board Schema
 * Validates board publish status
 */
export const publishSchema = z.object({
  isPublic: z.boolean(),
  dryRun: z.boolean().optional(),
  requestId: z.string().uuid().optional(),
});

