import type { ZodSchema } from 'zod';
import React from 'react';

export type PatternId = 'dialogic'|'wizard'|'focus'|'canvas'|'gallery'|'form';

export type PatternMeta = {
  id: PatternId;
  name: string;
  icon: React.ComponentType<{className?: string}>;
  summary: string;
  slots: Array<{ id: string; label: string; accepts: string[] }>;
  optionsSchema: ZodSchema<any> | null;
  Preview: React.FC<{ example?: any }>;
  whenToUse: string[];
};

const PlaceholderIcon: React.FC<{className?: string}> = ({ className }) => (
  <span className={className}>🎛️</span>
);

const PlaceholderPreview: React.FC = () => (
  <div className="h-24 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-500 text-sm">
    Pattern preview
  </div>
);

export const patternRegistry: Record<PatternId, PatternMeta> = {
  dialogic: {
    id: 'dialogic',
    name: 'Dialogic',
    icon: PlaceholderIcon,
    summary: 'Conversation-driven interaction guided by an AI agent.',
    slots: [{ id: 'conversation', label: 'Conversation', accepts: ['dialog','content'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Guided help','Q&A','Agent workflows']
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    icon: PlaceholderIcon,
    summary: 'Step-by-step sequential flow with progress.',
    slots: [{ id: 'steps', label: 'Steps', accepts: ['process_frame','config_panel'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Onboarding','Multi-step forms']
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    icon: PlaceholderIcon,
    summary: 'Single-frame deep work experience.',
    slots: [{ id: 'main', label: 'Main', accepts: ['media_card','preview','code_snippet'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Writing','Code','Reading']
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas',
    icon: PlaceholderIcon,
    summary: 'Freeform layout with drag-and-drop positioning.',
    slots: [{ id: 'free', label: 'Freeform', accepts: ['*'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Dashboards','Creative layouts']
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    icon: PlaceholderIcon,
    summary: 'Image-first presentation with grid or carousel.',
    slots: [{ id: 'images', label: 'Images', accepts: ['media_card'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Showcase','Portfolio']
  },
  form: {
    id: 'form',
    name: 'Form',
    icon: PlaceholderIcon,
    summary: 'Form inputs grouped with validation.',
    slots: [{ id: 'fields', label: 'Fields', accepts: ['config_panel'] }],
    optionsSchema: null,
    Preview: PlaceholderPreview,
    whenToUse: ['Settings','Data entry']
  },
};


