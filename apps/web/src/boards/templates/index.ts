/**
 * Board Templates Registry - Phase 4 Implementation
 * Central registry for all board templates
 */

import { agentTemplate, type AgentTemplate } from './agent.template';
import { domainTemplate, type DomainTemplate } from './domain.template';
import { journeyTemplate, type JourneyTemplate } from './journey.template';
import { peopleTemplate, type PeopleTemplate } from './people.template';

// =============================================================================
// TYPES
// =============================================================================

export type TemplateId = 'agent' | 'domain' | 'journey' | 'people';

export type BoardTemplate = AgentTemplate | DomainTemplate | JourneyTemplate | PeopleTemplate;

export interface TemplateFrame {
  name: string;
  pattern: 'dialogic' | 'wizard' | 'focus' | 'canvas' | 'gallery' | 'form';
  frameType: string;
  orderIndex: number;
  props?: Record<string, any>;
  layoutKind?: string;
  layoutData?: Record<string, any>;
}

export interface TemplateManifest {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  frames: TemplateFrame[];
}

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

export const BOARD_TEMPLATES: Record<TemplateId, TemplateManifest> = {
  agent: agentTemplate,
  domain: domainTemplate,
  journey: journeyTemplate,
  people: peopleTemplate
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateManifest[] {
  return Object.values(BOARD_TEMPLATES);
}

/**
 * Get a specific template by ID
 */
export function getTemplate(id: TemplateId): TemplateManifest | null {
  return BOARD_TEMPLATES[id] || null;
}

/**
 * Check if a template ID is valid
 */
export function isValidTemplateId(id: string): id is TemplateId {
  return id in BOARD_TEMPLATES;
}

/**
 * Get template frames (excluding Cover and Settings which are auto-created)
 */
export function getTemplateFrames(templateId: TemplateId): TemplateFrame[] {
  const template = getTemplate(templateId);
  return template?.frames || [];
}

/**
 * Apply a template to create frame instances
 */
export function applyTemplate(
  templateId: TemplateId, 
  boardId: string,
  options: {
    startOrderIndex?: number;
    entityType?: string;
    entityId?: string;
  } = {}
): any[] {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const {
    startOrderIndex = 2, // Start after Cover (0) and Settings (1)
    entityType = 'board',
    entityId = boardId
  } = options;

  return template.frames.map((frame, index) => ({
    id: `${templateId}-${frame.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`,
    boardId,
    role: null, // Template frames don't have special roles
    name: frame.name,
    pattern: frame.pattern,
    frameType: frame.frameType,
    orderIndex: startOrderIndex + index,
    layoutKind: frame.layoutKind || 'canvas',
    layoutData: frame.layoutData || {},
    props: frame.props || {},
    entityType,
    entityId,
    configId: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

/**
 * Get template recommendations based on context
 */
export function getRecommendedTemplates(context: {
  hasAgent?: boolean;
  hasDomain?: boolean;
  hasJourney?: boolean;
  userRole?: string;
}): TemplateId[] {
  const recommendations: TemplateId[] = [];

  if (context.hasAgent) {
    recommendations.push('agent');
  }
  
  if (context.hasDomain) {
    recommendations.push('domain');
  }
  
  if (context.hasJourney) {
    recommendations.push('journey');
  }
  
  // Always include people for collaboration
  recommendations.push('people');

  return recommendations;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  agentTemplate,
  domainTemplate,
  journeyTemplate,
  peopleTemplate
};

export type {
  AgentTemplate,
  DomainTemplate,
  JourneyTemplate,
  PeopleTemplate
};
