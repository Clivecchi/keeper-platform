// V0 Board Studio Types
export type PatternId = 'dialogic' | 'wizard' | 'focus' | 'canvas' | 'gallery' | 'form';

export type StudioProp = {
  id: string;
  type: string; // 'image' | 'text' | 'button' | 'token' | ...
  config: Record<string, any>;
  // layout fields may exist for canvas/layout mode
};

export type StudioFrame = {
  id: string;
  name: string;
  role: 'cover' | 'settings' | 'custom';
  pattern: PatternId;
  props: StudioProp[];
};

export type StudioBoard = {
  id: string;
  keeperId?: string;
  name: string;
  description?: string;
  frames: StudioFrame[];
  isTemplate?: boolean; // Design Board Template System
};

// AI Token v1 config (placeholder only)
export type AiTokenV1 = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  personaNote?: string;
  agentId?: string; // reserved for future
};

// Legacy V0 types for compatibility
export interface StoryFrame {
  id: string;
  image: string;
  title: string;
  content: string;
  duration: number;
}
