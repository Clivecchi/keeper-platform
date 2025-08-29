/**
 * Frame Factory Utilities
 * ======================
 *
 * Strongly-typed factory functions for creating ExtendedFrameInstance objects
 * with proper defaults and type safety.
 */

import type { ExtendedFrameInstance, ExtendedFrameConfig, FrameType, EngagementMode } from '../types/frame';

/**
 * Creates a strongly-typed ExtendedFrameInstance with sensible defaults
 */
export function makeFrameInstance(overrides: Partial<ExtendedFrameInstance>): ExtendedFrameInstance {
  const base: ExtendedFrameInstance = {
    // Required FrameInstance properties with defaults
    id: `frame-${Math.random().toString(36).slice(2)}`,
    entityType: 'unknown',
    entityId: 'unknown',
    configId: `config-${Math.random().toString(36).slice(2)}`,
    currentContentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),

    // Optional ExtendedFrameInstance properties
    FrameConfig: undefined,
    FrameContent_FrameInstance_currentContentIdToFrameContent: undefined,
    FrameContent_FrameContent_playlistOwnerIdToFrameInstance: undefined,
  };

  return { ...base, ...overrides };
}

/**
 * Creates a FrameConfig with defaults
 */
export function makeFrameConfig(overrides: Partial<ExtendedFrameConfig>): ExtendedFrameConfig {
  const base: ExtendedFrameConfig = {
    id: `config-${Math.random().toString(36).slice(2)}`,
    name: 'Unnamed Frame',
    description: '',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'agent_preview' as FrameType,
    engagementMode: 'dialogic' as EngagementMode,
  };

  return { ...base, ...overrides };
}
