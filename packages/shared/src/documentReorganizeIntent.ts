/**
 * Document-reorganize phrase detection.
 *
 * mention/detection ≠ semantic intent ≠ authorization ≠ execution.
 * A phrase match is a signal. It is not proof the human directed Review & Reorganize.
 */

export type ReorganizeIntentKind = 'none' | 'mentioned' | 'required';

export type ReorganizeDetection = {
  /** Phrase mention only. Not intent. Not authorization. Not execution. */
  signal: 'none' | 'mentioned';
  mention: boolean;
  /**
   * Clear present-tense direction to reorganize now.
   * Still not authorization and still not an execute switch by itself.
   */
  establishedDirection: boolean;
  matched: string[];
  blockedReason: string | null;
};

type NamedPattern = {
  name: string;
  pattern: RegExp;
};

/** Clear present-tense Document direction. Still subject to blockers. */
const CLEAR_DIRECT_PATTERNS: NamedPattern[] = [
  { name: 'review+reorganize', pattern: /\brevieww?\b.{0,80}re-?organi[sz]e\b/i },
  {
    name: 'reorganize the document',
    pattern: /\bre-?organi[sz]e (the |this |our )?(document|points?|sections?|manuscript)\b/i,
  },
  { name: 'reorganize named document', pattern: /\bre-?organi[sz]e\b/i },
  {
    name: 'propose a better document',
    pattern: /\bpropose (a )better (document|structure|organization|organisation)\b/i,
  },
  { name: 'clean up the document', pattern: /\bclean up (the |this )document\b/i },
  {
    name: 'organize the document',
    pattern: /\borgani[sz]e (the |these |our )(document|points?|sections?)\b/i,
  },
  { name: 'propose rearrangements', pattern: /\bpropose re-?arrangements?\b/i },
  {
    name: 'update the forward/title',
    pattern:
      /\b(update|updating|rewrite|rewriting|write|writing|revise|revising|change|changing|set) (the |this )?(forward|title)\b/i,
  },
  { name: 'rename the document', pattern: /\brename (the |this )?(document|dialog|title)\b/i },
];

/** Topic mention or complaint. Never established direction. */
const MENTION_ONLY_PATTERNS: NamedPattern[] = [
  { name: 'reorganization noun', pattern: /\bre-?organi[sz]ation\b/i },
  { name: 'review the document', pattern: /\breview (the |this |our |the current |this current )document\b/i },
  { name: 'you are the director', pattern: /\b(you are|you're) the director\b/i },
  { name: 'tell the current story', pattern: /\btell (the |this |a )(current )?story\b/i },
  {
    name: 'better organize/tell story',
    pattern: /\bbetter (organi[sz]e|tell) (the |this |our )?(current )?(story|document)\b/i,
  },
  { name: 'directorial changes', pattern: /\b(directorial|director(ial)?) (changes?|review|edits?)\b/i },
  { name: 'rearrangements', pattern: /\bre-?arrangements?\b/i },
  { name: 'better version of the document', pattern: /\bbetter version of (the |this )document\b/i },
  { name: 'suggest a new title', pattern: /\bsuggest (a )?new title\b/i },
  { name: 'document name/title', pattern: /\b(document|dialog) (name|title)\b/i },
  { name: 'forward field/title', pattern: /\bforward (field|title|specifically)\b/i },
  { name: 'every/all points ... open', pattern: /\b(every|all) points?.{0,80}\bopen\b/i },
  { name: 'section called open', pattern: /\bsection called ["']?open\b/i },
  { name: 'moving every point', pattern: /\bmoving every point\b/i },
  {
    name: 'thats useless/not a proposal',
    pattern: /\b(that'?s|that is) (useless|not (a |the )?(proposal|reorganization|reorganisation))\b/i,
  },
  { name: 'nothing/anything changed', pattern: /\b(nothing|anything) (actually |really )?(changed|different)\b/i },
  { name: 'no meaningful change', pattern: /\bno (meaningful |real |actual )?change\b/i },
  { name: 'same document/thing/proposal', pattern: /\b(the )?same (document|thing|proposal)\b/i },
  { name: 'copy paste', pattern: /\bcopy.?paste[d]?\b/i },
  { name: 'did you change', pattern: /\bdid (you|it|kip) (even )?change\b/i },
  { name: 'restate', pattern: /\brestat(e|ed|ement|es)\b/i },
  { name: 'do not belong', pattern: /\b(do not|don'?t) (necessarily )?belong\b/i },
];

const ESTABLISHED_BLOCKERS: NamedPattern[] = [
  {
    name: 'negation',
    pattern: /\b(do not|don'?t|never|without)\b.{0,80}\b(re-?organi[sz]e|propose|apply|modify)\b/i,
  },
  { name: 'not the same thing', pattern: /\bnot the same thing\b/i },
  { name: 'interpret as requesting', pattern: /\binterpret(ed)? as requesting\b/i },
  { name: 'what instruction', pattern: /\bwhat (user )?instruction\b/i },
  { name: 'diagnose', pattern: /\bdiagnos(e|ing|tic)\b/i },
  { name: 'no corrective action', pattern: /\btake no corrective action\b/i },
  {
    name: 'apply existing proposal',
    pattern: /\bapply (that |the |this )?(re-?organi[sz]e|re-?organi[sz]ation|proposal|proposed)\b/i,
  },
  { name: 'question not direction', pattern: /\b(should we|did you|what did you)\b/i },
];

function matchesNamed(patterns: NamedPattern[], text: string): string[] {
  return patterns.filter((row) => row.pattern.test(text)).map((row) => row.name);
}

function firstBlocker(text: string): string | null {
  const hit = ESTABLISHED_BLOCKERS.find((row) => row.pattern.test(text));
  return hit?.name ?? null;
}

export function detectReorganizeDetection(userInput: string): ReorganizeDetection {
  const text = userInput?.trim() ?? '';
  if (!text) {
    return {
      signal: 'none',
      mention: false,
      establishedDirection: false,
      matched: [],
      blockedReason: null,
    };
  }

  const clear = matchesNamed(CLEAR_DIRECT_PATTERNS, text);
  const mentionedOnly = matchesNamed(MENTION_ONLY_PATTERNS, text);
  const matched = [...new Set([...clear, ...mentionedOnly])];
  const mention = matched.length > 0;
  const blockedReason = firstBlocker(text);
  const establishedDirection = clear.length > 0 && blockedReason == null;

  return {
    signal: mention ? 'mentioned' : 'none',
    mention,
    establishedDirection,
    matched,
    blockedReason,
  };
}

/**
 * Compatibility wrapper.
 * `required` means established direction only — not a phrase mention.
 */
export function detectReorganizeIntent(userInput: string): ReorganizeIntentKind {
  const detection = detectReorganizeDetection(userInput);
  if (detection.establishedDirection) return 'required';
  if (detection.mention) return 'mentioned';
  return 'none';
}

export function isEstablishedReorganizeDirection(userInput: string): boolean {
  return detectReorganizeDetection(userInput).establishedDirection;
}
