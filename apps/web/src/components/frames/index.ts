/**
 * Frame Components Index
 * ======================
 * 
 * Exports all frame components and utilities for easy importing.
 */

// Main renderer
export { default as FrameRenderer, getSupportedFrameTypes, isFrameTypeSupported, registerFrameType } from './FrameRenderer';

// Individual frame components
export { default as MediaCardFrame } from './MediaCardFrame';
export { default as PreviewFrame } from './PreviewFrame';
export { default as DialogFrame } from './DialogFrame';
export { default as ConfigPanelFrame } from './ConfigPanelFrame';
export { default as ProcessFrame } from './ProcessFrame';
export { default as AgentPreviewFrame } from './AgentPreviewFrame';
export { default as CodeSnippetFrame } from './CodeSnippetFrame';

// Re-export types for convenience
export type {
  BaseFrameProps,
  MediaCardFrameProps,
  DialogFrameProps,
  ConfigPanelFrameProps,
  FrameType,
  EngagementMode,
  ExtendedFrameInstance,
  ExtendedFrameConfig,
  ExtendedFrameContent,
  FrameInteraction,
  FrameMessage,
  FrameTab,
} from '../../types/frame';
