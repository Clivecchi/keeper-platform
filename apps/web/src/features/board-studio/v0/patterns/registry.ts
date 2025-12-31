// Pattern registry for consistent frame config and tab labels
export const PATTERNS = {
  focus: { 
    id: 'focus', 
    name: 'Focus', 
    summary: 'Single hero element', 
    whenToUse: ['Covers', 'Hero sections'] 
  },
  dialogic: { 
    id: 'dialogic', 
    name: 'Dialogic', 
    summary: 'Agent-guided conversation', 
    whenToUse: ['Guided help', 'Chat'] 
  },
  wizard: { 
    id: 'wizard', 
    name: 'Wizard', 
    summary: 'Step-by-step flow', 
    whenToUse: ['Onboarding', 'Forms'] 
  },
  canvas: { 
    id: 'canvas', 
    name: 'Canvas', 
    summary: 'Freeform composition', 
    whenToUse: ['Mixed layouts'] 
  },
  gallery: { 
    id: 'gallery', 
    name: 'Gallery', 
    summary: 'Image-first grid', 
    whenToUse: ['Media stories'] 
  },
  form: { 
    id: 'form', 
    name: 'Form', 
    summary: 'Data entry / config', 
    whenToUse: ['Settings', 'Surveys'] 
  },
} as const;

export type PatternId = keyof typeof PATTERNS;
