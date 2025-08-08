/**
 * Boards Index
 * ============
 * 
 * Exports all board components for easy importing.
 */

// Board components
export { default as AgentBoard } from './AgentBoard';
export { default as DomainBoard } from './domain-board';
export { default as JourneyBoard } from './journey-board';
export { default as KeeperTypeBoard } from './keeper-type-board';
export { default as PeopleBoard } from './people-board';

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
