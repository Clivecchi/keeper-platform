/**
 * Draft Trigger Detector
 * Detects when user input should trigger draft.create per the Agent Contract.
 */

const DRAFT_TRIGGER_PATTERNS = [
  'plan',
  'planning',
  'outline',
  'outlining',
  'spec',
  'specs',
  'specification',
  'design',
  'designing',
  'structure',
  'break down',
  'approach',
  'walk me through',
  "let's think this through",
  'think this through',
];

const DRAFT_BLOCKLIST = [
  'plan a meeting',
  'plan my day',
  'meal plan',
  'trip plan',
  'plan for next week',
  'plan for tomorrow',
];

const ESCAPE_HATCH = 'no draft';

export interface DraftTriggerResult {
  triggered: boolean;
  bypassed: boolean;
}

/**
 * Detect if user input should trigger draft.create.
 * Escape hatch ("no draft") takes precedence over blocklist over trigger patterns.
 */
export function detectDraftTrigger(userInput: string): DraftTriggerResult {
  const normalized = userInput.toLowerCase().trim();
  if (!normalized) {
    return { triggered: false, bypassed: false };
  }

  // Escape hatch: user explicitly says no draft
  if (normalized.includes(ESCAPE_HATCH)) {
    return { triggered: false, bypassed: true };
  }

  // Blocklist: obvious non-draft intents
  for (const phrase of DRAFT_BLOCKLIST) {
    if (normalized.includes(phrase)) {
      return { triggered: false, bypassed: false };
    }
  }

  // Trigger patterns: substring match
  for (const pattern of DRAFT_TRIGGER_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { triggered: true, bypassed: false };
    }
  }

  return { triggered: false, bypassed: false };
}
