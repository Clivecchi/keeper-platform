/**
 * Frame Factory Utilities
 * ======================
 *
 * Strongly-typed factory functions for creating ExtendedFrameInstance objects
 * with proper defaults and type safety.
 */

import type { ExtendedFrameInstance, ExtendedFrameConfig, FrameType, EngagementMode } from '../types/frame';

export type MakeFrameOpts = Partial<ExtendedFrameInstance> & {
  name?: string;
  role?: string | null;
  pattern?: string;
  props?: ExtendedFrameInstance['props'];
  entityType?: string;
  entityId?: string;
  configId?: string;
};

/**
 * Creates a strongly-typed ExtendedFrameInstance with sensible defaults
 */
export function makeFrameInstance(opts: MakeFrameOpts): ExtendedFrameInstance {
  const base: ExtendedFrameInstance = {
    // Required FrameInstance properties with defaults
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `frame-${Math.random().toString(36).slice(2)}`,
    entityType: opts.entityType ?? 'board',
    entityId: opts.entityId ?? 'unknown',
    configId: (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : (opts.configId ?? `config-${Math.random().toString(36).slice(2)}`),
    currentContentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),

    // Provide required fields for runtime components with safe defaults
    name: opts.name ?? 'Untitled',
    role: (opts.role ?? 'content') as string | null,
    pattern: opts.pattern ?? 'preview',
    props: (opts.props ?? {}) as ExtendedFrameInstance['props'],
    // Optional relation fields remain undefined unless provided
    layoutData: (opts as any)?.layoutData ?? ({} as ExtendedFrameInstance['layoutData']),
    boardId: (opts as any)?.boardId ?? 'board-unknown',
    frameType: (opts as any)?.frameType ?? 'preview',
    orderIndex: (opts as any)?.orderIndex ?? 0,
    layoutKind: (opts as any)?.layoutKind ?? 'auto',
    FrameConfig: (opts as any)?.FrameConfig,
    FrameContent_FrameInstance_currentContentIdToFrameContent: (opts as any)?.FrameContent_FrameInstance_currentContentIdToFrameContent,
    FrameContent_FrameContent_playlistOwnerIdToFrameInstance: (opts as any)?.FrameContent_FrameContent_playlistOwnerIdToFrameInstance,
  };

  return { ...base, ...opts };
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
