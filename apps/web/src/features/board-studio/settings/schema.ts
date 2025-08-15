/**
 * Board Settings Schema - Phase 2 Implementation
 * Schema-driven form configuration for Settings frame
 */

export interface FieldSpec {
  path: string;
  type: 'text' | 'textarea' | 'number' | 'color' | 'switch' | 'select' | 'select-frame' | 'entity-picker' | 'agent-picker' | 'icon';
  label: string;
  helper?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[] | { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export interface SectionSpec {
  title: string;
  description?: string;
  fields: FieldSpec[];
}

export const BoardSettingsSchema: Record<string, SectionSpec> = {
  General: {
    title: 'General Settings',
    description: 'Basic board information and identity',
    fields: [
      { 
        path: 'name', 
        type: 'text', 
        label: 'Board name', 
        required: true, 
        max: 80,
        placeholder: 'Enter board name'
      },
      { 
        path: 'description', 
        type: 'textarea', 
        label: 'Description', 
        max: 280,
        placeholder: 'Describe your board...'
      },
      { 
        path: 'slug', 
        type: 'text', 
        label: 'Slug', 
        helper: 'Used for URLs (auto-generated from name)',
        max: 80,
        placeholder: 'board-slug'
      },
      { 
        path: 'icon', 
        type: 'icon', 
        label: 'Icon',
        helper: 'Choose an icon to represent your board'
      },
    ],
  },

  Theme: {
    title: 'Theme & Appearance',
    description: 'Customize the visual appearance of your board',
    fields: [
      { 
        path: 'theme.primary', 
        type: 'color', 
        label: 'Primary Color',
        helper: 'Main accent color used throughout the board'
      },
      { 
        path: 'theme.background', 
        type: 'color', 
        label: 'Background Color',
        helper: 'Background color for the board canvas'
      },
    ],
  },

  Behavior: {
    title: 'Layout & Behavior',
    description: 'Configure how the board behaves and displays',
    fields: [
      { 
        path: 'behavior.showGrid', 
        type: 'switch', 
        label: 'Show Grid',
        helper: 'Display alignment grid in Layout mode'
      },
      { 
        path: 'behavior.snapToGrid', 
        type: 'switch', 
        label: 'Snap to Grid',
        helper: 'Automatically align elements to grid'
      },
      { 
        path: 'behavior.gridSize', 
        type: 'number', 
        label: 'Grid Size', 
        min: 4, 
        max: 24,
        helper: 'Size of grid squares in pixels'
      },
      { 
        path: 'behavior.defaultPattern', 
        type: 'select', 
        label: 'Default Pattern', 
        options: [
          { value: 'dialogic', label: 'Dialogic - Conversation driven' },
          { value: 'wizard', label: 'Wizard - Step by step' },
          { value: 'focus', label: 'Focus - Single frame emphasis' },
          { value: 'canvas', label: 'Canvas - Free positioning' },
          { value: 'gallery', label: 'Gallery - Media showcase' },
          { value: 'form', label: 'Form - Data collection' }
        ],
        helper: 'Default engagement pattern for new frames'
      },
      { 
        path: 'behavior.startFrameId', 
        type: 'select-frame', 
        label: 'Start Frame',
        helper: 'Which frame to show first when board loads'
      },
      { 
        path: 'behavior.draftMode', 
        type: 'switch', 
        label: 'Draft Mode',
        helper: 'Hide board from public view while editing'
      },
      { 
        path: 'behavior.autosave', 
        type: 'switch', 
        label: 'Autosave',
        helper: 'Automatically save changes as you work'
      },
    ],
  },

  Scope: {
    title: 'Data & Integrations',
    description: 'Connect your board to data sources and AI agents',
    fields: [
      { 
        path: 'data.scope', 
        type: 'select', 
        label: 'Data Scope', 
        options: [
          { value: 'keeper', label: 'Keeper - Story focused' },
          { value: 'domain', label: 'Domain - Team focused' },
          { value: 'journey', label: 'Journey - Learning focused' },
          { value: 'people', label: 'People - Relationship focused' },
          { value: 'custom', label: 'Custom - Flexible configuration' }
        ],
        helper: 'What type of data this board represents'
      },
      { 
        path: 'data.entityId', 
        type: 'entity-picker', 
        label: 'Connected Entity',
        helper: 'Link to a specific keeper, domain, or journey'
      },
      { 
        path: 'data.agentId', 
        type: 'agent-picker', 
        label: 'AI Agent (Optional)',
        helper: 'Connect an AI agent for dialogic interactions'
      },
    ],
  },

  Access: {
    title: 'Access & Sharing',
    description: 'Control who can view and interact with your board',
    fields: [
      { 
        path: 'access.visibility', 
        type: 'select', 
        label: 'Visibility', 
        options: [
          { value: 'private', label: 'Private - Only you' },
          { value: 'unlisted', label: 'Unlisted - Anyone with link' },
          { value: 'org', label: 'Organization - Team members' },
          { value: 'public', label: 'Public - Anyone can view' }
        ],
        helper: 'Who can view this board'
      },
      { 
        path: 'access.allowComments', 
        type: 'switch', 
        label: 'Allow Comments',
        helper: 'Let viewers leave comments on frames'
      },
      { 
        path: 'access.shareLinkEnabled', 
        type: 'switch', 
        label: 'Share Link',
        helper: 'Generate shareable link for this board'
      },
    ],
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getAllFields(): FieldSpec[] {
  return Object.values(BoardSettingsSchema).flatMap(section => section.fields);
}

export function getFieldByPath(path: string): FieldSpec | undefined {
  return getAllFields().find(field => field.path === path);
}

export function getSectionByField(fieldPath: string): { section: string; spec: SectionSpec } | undefined {
  for (const [sectionKey, sectionSpec] of Object.entries(BoardSettingsSchema)) {
    if (sectionSpec.fields.some(field => field.path === fieldPath)) {
      return { section: sectionKey, spec: sectionSpec };
    }
  }
  return undefined;
}

export function validateField(field: FieldSpec, value: any): string | null {
  if (field.required && (value === undefined || value === null || value === '')) {
    return `${field.label} is required`;
  }
  
  if (field.type === 'text' || field.type === 'textarea') {
    if (typeof value === 'string') {
      if (field.min && value.length < field.min) {
        return `${field.label} must be at least ${field.min} characters`;
      }
      if (field.max && value.length > field.max) {
        return `${field.label} must be no more than ${field.max} characters`;
      }
    }
  }
  
  if (field.type === 'number' && typeof value === 'number') {
    if (field.min !== undefined && value < field.min) {
      return `${field.label} must be at least ${field.min}`;
    }
    if (field.max !== undefined && value > field.max) {
      return `${field.label} must be no more than ${field.max}`;
    }
  }
  
  return null;
}

export function validateAllFields(data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const field of getAllFields()) {
    const value = getValueByPath(data, field.path);
    const error = validateField(field, value);
    if (error) {
      errors[field.path] = error;
    }
  }
  
  return errors;
}

// =============================================================================
// PATH UTILITIES
// =============================================================================

export function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function setValueByPath(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (current[key] === undefined) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
  return obj;
}

export default BoardSettingsSchema;
