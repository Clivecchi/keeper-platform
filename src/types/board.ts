/**
 * Board and Frame System Types
 * 
 * Core types for the Keeper Board architecture, including Board, Frame,
 * and engagement mode definitions.
 */

import { z } from 'zod';

// Engagement Modes
export type EngagementMode = 'dialogic' | 'wizard' | 'focus' | 'canvas';

// Board Types
export type BoardType = 'agent' | 'domain' | 'journey' | 'keeper_type' | 'code';

// Frame Types
export type FrameType = 
  | 'media_card'
  | 'preview' 
  | 'dialog'
  | 'config_panel'
  | 'process_frame'
  | 'agent_preview'
  | 'agent_identity'
  | 'tone_selector'
  | 'domain_card'
  | 'setup_steps'
  | 'member_list'
  | 'custom_domain_panel';

// Content Types
export type ContentType = 'media' | 'text' | 'config' | 'data' | 'component';

// Zod Schemas
export const BoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['agent', 'domain', 'journey', 'keeper_type', 'code']),
  engagementMode: z.enum(['dialogic', 'wizard', 'focus', 'canvas']).default('dialogic'),
  ownerId: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  theme_id: z.string().uuid().optional(),
  config: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FrameConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    'media_card', 'preview', 'dialog', 'config_panel', 'process_frame',
    'agent_preview', 'agent_identity', 'tone_selector', 'domain_card',
    'setup_steps', 'member_list', 'custom_domain_panel'
  ]),
  description: z.string().optional(),
  theme: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FrameContentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['media', 'text', 'config', 'data', 'component']),
  url: z.string().optional(),
  alt: z.string().optional(),
  data: z.record(z.any()).optional(),
  createdAt: z.date(),
  playlistOwnerId: z.string().uuid().optional(),
});

export const FrameInstanceSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid().optional(),
  entityType: z.string(),
  entityId: z.string(),
  configId: z.string().uuid(),
  currentContentId: z.string().uuid().optional(),
  order: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Inferred Types
export type Board = z.infer<typeof BoardSchema>;
export type FrameConfig = z.infer<typeof FrameConfigSchema>;
export type FrameContent = z.infer<typeof FrameContentSchema>;
export type FrameInstance = z.infer<typeof FrameInstanceSchema>;

// Extended types with relations
export interface BoardWithFrames extends Board {
  frames: FrameInstanceWithConfig[];
  theme?: {
    id: string;
    slug: string;
    label: string;
    palette: Record<string, any>;
    style?: Record<string, any>;
  };
}

export interface FrameInstanceWithConfig extends FrameInstance {
  config: FrameConfig;
  currentContent?: FrameContent;
  playlistContent?: FrameContent[];
}

// Frame Component Props
export interface FrameProps {
  instance: FrameInstanceWithConfig;
  engagementMode: EngagementMode;
  onUpdate?: (data: any) => void;
  onAction?: (action: string, data?: any) => void;
}

// Board Renderer Props
export interface BoardRendererProps {
  board: BoardWithFrames;
  onFrameUpdate?: (frameId: string, data: any) => void;
  onFrameAction?: (frameId: string, action: string, data?: any) => void;
}