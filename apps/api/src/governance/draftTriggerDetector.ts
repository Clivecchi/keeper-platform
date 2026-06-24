/**
 * Draft Trigger Detector
 * Detects when user input should trigger draft.create per the Agent Contract.
 */

const DRAFT_TRIGGER_PATTERNS = [
  'create a draft',
  'save as draft',
  'draft this',
  'new draft',
  'make a draft',
  'write a draft',
  'work in a draft',
  'create a document',
  'save this document',
  'create a spec',
  'write a spec',
  'save this spec',
  'create a proposal',
  'write a proposal',
];

const DRAFT_BLOCKLIST = [
  'plan a meeting',
  'plan my day',
  'meal plan',
  'trip plan',
  'plan for next week',
  'plan for tomorrow',
];

const ESCAPE_HATCH_PATTERNS = [
  'no draft',
  'read only',
  'read-only',
  'do not make changes',
  "don't make changes",
  'do not attempt to make any changes',
  "don't attempt to make any changes",
  'without making changes',
  'no changes',
  'only report',
  'only summarize',
];

export interface DraftTriggerResult {
  triggered: boolean;
  bypassed: boolean;
}

/**
 * Detect if user input should trigger draft.create.
 * Escape hatch ("no draft", read-only/no-change instructions) takes precedence
 * over blocklist over trigger patterns.
 */
export function detectDraftTrigger(userInput: string): DraftTriggerResult {
  const normalized = userInput.toLowerCase().trim();
  if (!normalized) {
    return { triggered: false, bypassed: false };
  }

  // Escape hatch: user explicitly asks for read-only/no-change behavior.
  if (ESCAPE_HATCH_PATTERNS.some((phrase) => normalized.includes(phrase))) {
    return { triggered: false, bypassed: true };
  }

  // Blocklist: obvious non-draft intents
  for (const phrase of DRAFT_BLOCKLIST) {
    if (normalized.includes(phrase)) {
      return { triggered: false, bypassed: false };
    }
  }

  // Trigger patterns: explicit durable artifact intent only.
  for (const pattern of DRAFT_TRIGGER_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { triggered: true, bypassed: false };
    }
  }

  return { triggered: false, bypassed: false };
}
