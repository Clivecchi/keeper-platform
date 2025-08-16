/**
 * Props Components Export
 * =======================
 * 
 * Centralized exports for all prop-related components
 */

export { default as PropDropZone } from './PropDropZone';
export { default as PropBlock } from './PropBlock';
export { default as PropInspector } from './PropInspector';
export { default as PropManager } from './PropManager';

// Export types for external use  
export interface PropData {
  id: string;
  type: string;
  config: Record<string, any>;
  isVisible: boolean;
  isDraft: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}
