/**
 * Board Components Index
 * ======================
 * 
 * Exports all board-related components and utilities.
 */

// Main renderer
export { default as BoardRenderer } from './BoardRenderer';

// Re-export context and types for convenience
export { 
  useBoard, 
  BoardProvider,
  type BoardType,
  type BoardLayout,
  type BoardTheme,
  type BoardConfig,
  type BoardInstance,
  type BoardContextType 
} from '../../context/BoardContext';
