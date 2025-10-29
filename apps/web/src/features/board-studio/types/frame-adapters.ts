/**
 * Frame Type Adapters
 * ===================
 * 
 * Adapters to convert between different frame representations:
 * - UnifiedFrame (canonical)
 * - StudioFrame (v0 format)
 * - FrameInstance (database format)
 * - PatternFrameData (PatternRenderer format)
 * 
 * All conversions should go through UnifiedFrame as the hub.
 */

import type { UnifiedFrame, UnifiedBoard, FrameProp } from './unified-frame';
import type { StudioFrame, StudioBoard } from '../v0/types';
import type { ExtendedFrameInstance } from '../../../types/frame';

// =============================================================================
// V0 STUDIO FRAME ADAPTERS
// =============================================================================

/**
 * Convert StudioFrame to UnifiedFrame
 */
export function fromStudioFrame(studio: StudioFrame): UnifiedFrame {
  return {
    id: studio.id,
    name: studio.name,
    role: studio.role,
    pattern: studio.pattern,
    frameType: 'media_card', // Default, can be enhanced
    props: normalizeProps(studio.props),
    layoutKind: 'standard',
    layoutData: {},
  };
}

/**
 * Convert UnifiedFrame to StudioFrame
 */
export function toStudioFrame(unified: UnifiedFrame): StudioFrame {
  return {
    id: unified.id,
    name: unified.name,
    role: unified.role,
    pattern: unified.pattern,
    props: unified.props as any, // StudioProp[] is compatible
  };
}

/**
 * Convert StudioBoard to UnifiedBoard
 */
export function fromStudioBoard(studio: StudioBoard): UnifiedBoard {
  return {
    id: studio.id,
    keeperId: studio.keeperId || '',
    name: studio.name,
    slug: `board-${studio.id}`,
    description: studio.description,
    theme: {
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      accentColor: '#8b5cf6',
      borderColor: '#e5e7eb',
    },
    behavior: {
      showGrid: true,
      snapToGrid: false,
      gridSize: 8,
      defaultPattern: 'canvas',
    },
    access: {
      visibility: 'private',
      allowComments: false,
      shareLinkEnabled: false,
    },
    frames: studio.frames.map(fromStudioFrame),
  };
}

/**
 * Convert UnifiedBoard to StudioBoard
 */
export function toStudioBoard(unified: UnifiedBoard): StudioBoard {
  return {
    id: unified.id,
    keeperId: unified.keeperId,
    name: unified.name,
    description: unified.description,
    frames: unified.frames.map(toStudioFrame),
  };
}

// =============================================================================
// DATABASE FRAME INSTANCE ADAPTERS
// =============================================================================

/**
 * Convert FrameInstance to UnifiedFrame
 */
export function fromFrameInstance(instance: ExtendedFrameInstance): UnifiedFrame {
  // Extract props from database JSON
  const propsData = instance.props as any;
  const propsArray = normalizeProps(propsData);
  
  // Extract frame configuration
  const config = instance.FrameConfig;
  const pattern = (config?.engagementMode as any) || 'canvas';
  const frameType = (config?.frameType as any) || instance.frameType || 'media_card';
  
  return {
    id: instance.id,
    name: instance.data?.name || `Frame ${instance.id}`,
    role: (instance.data?.role as any) || 'custom',
    pattern: pattern,
    frameType: frameType,
    props: propsArray,
    layoutKind: instance.layoutKind || 'standard',
    layoutData: (instance.layoutData as any) || {},
    createdAt: instance.createdAt ? new Date(instance.createdAt) : undefined,
    updatedAt: instance.updatedAt ? new Date(instance.updatedAt) : undefined,
  };
}

/**
 * Convert UnifiedFrame to FrameInstance creation data
 */
export function toFrameInstanceCreate(
  unified: UnifiedFrame,
  entityType: string,
  entityId: string,
  configId: string
): Partial<ExtendedFrameInstance> {
  // Convert props array to object for database storage
  const propsObject: Record<string, any> = {};
  unified.props.forEach((prop, index) => {
    propsObject[prop.id || `prop_${index}`] = prop;
  });
  
  return {
    entityType,
    entityId,
    configId,
    frameType: unified.frameType,
    layoutKind: unified.layoutKind,
    layoutData: unified.layoutData as any,
    props: propsObject as any,
    data: {
      name: unified.name,
      role: unified.role,
    } as any,
  };
}

// =============================================================================
// PATTERN RENDERER ADAPTERS
// =============================================================================

/**
 * PatternRenderer frame data format
 */
export interface PatternFrameData {
  id: string;
  name: string;
  pattern: string;
  frameType: string;
  layoutKind: string;
  layoutData: Record<string, any>;
  props: Record<string, any> | any[];
  role?: string;
}

/**
 * Convert UnifiedFrame to PatternRenderer format
 */
export function toPatternRendererFrame(unified: UnifiedFrame): PatternFrameData {
  // Convert props array to object for PatternRenderer
  // PatternRenderer can handle both formats, but object is preferred for some patterns
  const propsObject: Record<string, any> = {};
  unified.props.forEach((prop, index) => {
    propsObject[prop.id || `prop_${index}`] = prop;
  });
  
  return {
    id: unified.id,
    name: unified.name,
    pattern: unified.pattern,
    frameType: unified.frameType,
    layoutKind: unified.layoutKind || 'standard',
    layoutData: unified.layoutData || {},
    props: propsObject,
    role: unified.role,
  };
}

/**
 * Convert PatternRenderer format to UnifiedFrame
 */
export function fromPatternRendererFrame(pattern: PatternFrameData): UnifiedFrame {
  return {
    id: pattern.id,
    name: pattern.name,
    role: (pattern.role as any) || 'custom',
    pattern: pattern.pattern as any,
    frameType: pattern.frameType as any,
    props: normalizeProps(pattern.props),
    layoutKind: pattern.layoutKind as any,
    layoutData: pattern.layoutData,
  };
}

// =============================================================================
// PROP NORMALIZATION
// =============================================================================

/**
 * Normalize props to array format
 * 
 * Handles:
 * - Already an array: return as-is
 * - Object with prop values: extract to array
 * - Nested { props: [...] }: unwrap
 * - Invalid: return empty array
 */
export function normalizeProps(propsData: any): FrameProp[] {
  if (!propsData) {
    return [];
  }
  
  // Already an array
  if (Array.isArray(propsData)) {
    return propsData.filter(isValidProp);
  }
  
  // Nested props array
  if (typeof propsData === 'object' && propsData.props && Array.isArray(propsData.props)) {
    return propsData.props.filter(isValidProp);
  }
  
  // Object format - convert to array
  if (typeof propsData === 'object') {
    return Object.values(propsData)
      .filter(isValidProp)
      .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }
  
  return [];
}

/**
 * Check if value is a valid prop
 */
function isValidProp(value: any): value is FrameProp {
  return (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'type' in value &&
    'config' in value
  );
}

/**
 * Convert props array to object format (for database storage)
 */
export function propsToObject(props: FrameProp[]): Record<string, FrameProp> {
  const obj: Record<string, FrameProp> = {};
  props.forEach((prop, index) => {
    const key = prop.id || `prop_${index}`;
    obj[key] = {
      ...prop,
      orderIndex: index, // Preserve order
    };
  });
  return obj;
}

// =============================================================================
// SPECIAL FRAME CONVERTERS
// =============================================================================

/**
 * Create a default cover frame
 */
export function createDefaultCoverFrame(boardName: string): UnifiedFrame {
  return {
    id: `cover-${Date.now()}`,
    name: 'Cover',
    role: 'cover',
    pattern: 'focus',
    frameType: 'media_card',
    props: [
      {
        id: 'title',
        type: 'heading',
        config: {
          content: '__BOARD_NAME__',
          level: 1,
          alignment: 'center',
        },
        orderIndex: 0,
      },
      {
        id: 'subtitle',
        type: 'text',
        config: {
          content: '__BOARD_DESC__',
          fontSize: 'medium',
          alignment: 'center',
        },
        orderIndex: 1,
      },
    ],
    layoutKind: 'standard',
  };
}

/**
 * Create a default settings frame
 */
export function createDefaultSettingsFrame(): UnifiedFrame {
  return {
    id: `settings-${Date.now()}`,
    name: 'Settings',
    role: 'settings',
    pattern: 'form',
    frameType: 'config_panel',
    props: [],
    layoutKind: 'standard',
  };
}

/**
 * Create a default custom frame
 */
export function createDefaultCustomFrame(name: string = 'New Frame'): UnifiedFrame {
  return {
    id: `frame-${Date.now()}`,
    name,
    role: 'custom',
    pattern: 'canvas',
    frameType: 'media_card',
    props: [],
    layoutKind: 'standard',
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate UnifiedFrame
 */
export function validateFrame(frame: UnifiedFrame): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!frame.id) {
    errors.push('Frame must have an id');
  }
  
  if (!frame.name || frame.name.trim() === '') {
    errors.push('Frame must have a name');
  }
  
  if (!['cover', 'settings', 'custom'].includes(frame.role)) {
    errors.push(`Invalid role: ${frame.role}`);
  }
  
  if (!['focus', 'canvas', 'dialogic', 'wizard', 'gallery', 'form'].includes(frame.pattern)) {
    errors.push(`Invalid pattern: ${frame.pattern}`);
  }
  
  if (!Array.isArray(frame.props)) {
    errors.push('Props must be an array');
  }
  
  // Validate each prop
  frame.props.forEach((prop, index) => {
    if (!prop.id) {
      errors.push(`Prop at index ${index} missing id`);
    }
    if (!prop.type) {
      errors.push(`Prop at index ${index} missing type`);
    }
    if (!prop.config || typeof prop.config !== 'object') {
      errors.push(`Prop at index ${index} missing or invalid config`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UnifiedBoard
 */
export function validateBoard(board: UnifiedBoard): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!board.id) {
    errors.push('Board must have an id');
  }
  
  if (!board.keeperId) {
    errors.push('Board must have a keeperId');
  }
  
  if (!board.name || board.name.trim() === '') {
    errors.push('Board must have a name');
  }
  
  if (!board.slug || board.slug.trim() === '') {
    errors.push('Board must have a slug');
  }
  
  if (!Array.isArray(board.frames)) {
    errors.push('Board frames must be an array');
  }
  
  // Validate each frame
  board.frames.forEach((frame, index) => {
    const frameValidation = validateFrame(frame);
    if (!frameValidation.valid) {
      errors.push(`Frame at index ${index} is invalid: ${frameValidation.errors.join(', ')}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

