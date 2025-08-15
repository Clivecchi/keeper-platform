/**
 * Board Templates Registry - Phase 2 Implementation
 * Defines canonical frame sets for different board types
 */

export type TemplateId = 'agent' | 'domain' | 'journey' | 'people' | 'custom';

export interface TemplateFrameSpec {
  role?: 'cover' | 'settings';
  name: string;
  pattern: 'focus' | 'form' | 'dialogic' | 'canvas' | 'gallery' | 'wizard';
  frameType: string;
  layoutKind: 'focus' | 'canvas' | 'grid' | 'row' | 'column' | 'wizard';
  props?: Record<string, any>;
}

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  description: string;
  frames: TemplateFrameSpec[];
}

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

export const BOARD_TEMPLATES: Record<TemplateId, TemplateSpec> = {
  agent: {
    id: 'agent',
    name: 'Agent Board',
    description: 'AI agent configuration and interaction board',
    frames: [
      // Cover and Settings are auto-created, so we add additional frames
      {
        name: 'Dialogic',
        pattern: 'dialogic',
        frameType: 'dialog',
        layoutKind: 'canvas',
        props: {
          title: 'Agent Conversation',
          placeholder: 'Ask your agent anything...',
          showHistory: true,
          maxMessages: 50
        }
      },
      {
        name: 'Preview',
        pattern: 'focus',
        frameType: 'agent_preview',
        layoutKind: 'focus',
        props: {
          showCapabilities: true,
          showStatus: true,
          showMetrics: true
        }
      }
    ]
  },

  domain: {
    id: 'domain',
    name: 'Domain Board',
    description: 'Domain management and member overview board',
    frames: [
      {
        name: 'People',
        pattern: 'canvas',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Domain Members',
          gridCols: 3,
          showStats: true,
          allowInvite: true
        }
      },
      {
        name: 'Preview',
        pattern: 'focus',
        frameType: 'preview',
        layoutKind: 'focus',
        props: {
          showDescription: true,
          showMetrics: true,
          showActivity: true
        }
      }
    ]
  },

  journey: {
    id: 'journey',
    name: 'Journey Board',
    description: 'Learning journey visualization and progression board',
    frames: [
      {
        name: 'Gallery',
        pattern: 'gallery',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Journey Milestones',
          layout: 'masonry',
          showProgress: true,
          allowReorder: false
        }
      },
      {
        name: 'Wizard',
        pattern: 'wizard',
        frameType: 'process_frame',
        layoutKind: 'wizard',
        props: {
          title: 'Journey Steps',
          showProgress: true,
          allowSkip: false,
          steps: [
            { id: 'start', label: 'Getting Started', completed: false },
            { id: 'progress', label: 'Making Progress', completed: false },
            { id: 'mastery', label: 'Achieving Mastery', completed: false }
          ]
        }
      }
    ]
  },

  people: {
    id: 'people',
    name: 'People Board',
    description: 'People management and collaboration board',
    frames: [
      {
        name: 'Grid',
        pattern: 'canvas',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Team Members',
          gridCols: 4,
          showRoles: true,
          showStatus: true,
          allowFilter: true
        }
      }
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom Board',
    description: 'Blank board for custom configurations',
    frames: [
      // Only Cover and Settings frames - no additional frames
    ]
  }
};

// =============================================================================
// TEMPLATE UTILITIES
// =============================================================================

export function getTemplate(templateId: TemplateId): TemplateSpec | null {
  return BOARD_TEMPLATES[templateId] || null;
}

export function getTemplateFrames(templateId: TemplateId): TemplateFrameSpec[] {
  const template = getTemplate(templateId);
  return template?.frames || [];
}

export function getAllTemplates(): TemplateSpec[] {
  return Object.values(BOARD_TEMPLATES);
}

export function isValidTemplateId(id: string): id is TemplateId {
  return id in BOARD_TEMPLATES;
}

// =============================================================================
// FRAME CREATION HELPERS
// =============================================================================

export interface CreateFrameFromTemplateOptions {
  boardId: string;
  templateFrame: TemplateFrameSpec;
  orderIndex: number;
  entityType?: string;
  configId?: string;
}

export function createFrameFromTemplate({
  boardId,
  templateFrame,
  orderIndex,
  entityType = 'board',
  configId
}: CreateFrameFromTemplateOptions) {
  return {
    boardId,
    role: templateFrame.role || null,
    name: templateFrame.name,
    pattern: templateFrame.pattern,
    frameType: templateFrame.frameType,
    orderIndex,
    layoutKind: templateFrame.layoutKind,
    layoutData: {},
    props: templateFrame.props || {},
    entityType,
    entityId: boardId,
    configId: configId || `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

export default BOARD_TEMPLATES;
