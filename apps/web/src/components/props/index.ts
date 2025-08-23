/**
 * Props Components Index
 * ======================
 * 
 * Exports all props-related components for easy importing.
 */

export { default as PropManager } from './PropManager';
export { default as PropBlock } from './PropBlock';
export { default as PropInspector } from './PropInspector';

// Re-export types for convenience
export type {
  PropSchema,
  PropBlock as PropBlockType,
  FramePropsRegistry,
} from '../../types/keeper';