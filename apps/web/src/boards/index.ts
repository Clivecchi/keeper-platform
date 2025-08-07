/**
 * Boards Index
 * ============
 * 
 * Exports all board components for easy importing.
 */

// Board components
export { default as AgentBoard } from './AgentBoard';

// Re-export board utilities
export { 
  BoardRenderer,
  useBoard,
  BoardProvider,
  type BoardType,
  type BoardLayout,
  type BoardTheme,
  type BoardConfig,
  type BoardInstance,
  type BoardContextType 
} from '../components/boards';
