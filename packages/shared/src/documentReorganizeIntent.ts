/**
 * Detect when the human asked the Lead to review / reorganize / direct the Document.
 * Shared so client (skip Cast consult) and API (propose follow-up) hear the same ask.
 */

export type ReorganizeIntentKind = 'none' | 'required';

const REORGANIZE_PATTERNS: RegExp[] = [
  /\brevieww?\b.{0,80}re-?organi[sz]e\b/i,
  /\bre-?organi[sz]e (the |this |our )?(document|points?|sections?|manuscript)\b/i,
  /\bre-?organi[sz]ation\b/i,
  /\breview (the |this |our |the current |this current )document\b/i,
  /\breview (the |this )current document\b/i,
  /\bpropose (a )better (document|structure|organization|organisation)\b/i,
  /\bclean up (the |this )document\b/i,
  /\borgani[sz]e (the |these |our )(document|points?|sections?)\b/i,
  /\bbetter (organi[sz]e|tell) (the |this |our )?(current )?(story|document)\b/i,
  /\btell (the |this |a )(current )?story\b/i,
  /\b(directorial|director(ial)?) (changes?|review|edits?)\b/i,
  /\b(you are|you're) the director\b/i,
  /\bpropose re-?arrangements?\b/i,
  /\bre-?arrangements?\b/i,
  /\bbetter version of (the |this )document\b/i,
  /\bsuggest (a )?new title\b/i,
  /\b(update|updating|rewrite|rewriting|write|writing|revise|revising|change|changing|set) (the |this )?(forward|title)\b/i,
  /\brename (the |this )?(document|dialog|title)\b/i,
  /\b(document|dialog) (name|title)\b/i,
  /\bforward (field|title|specifically)\b/i,
  /\b(every|all) points?.{0,80}\bopen\b/i,
  /\bsection called ["']?open\b/i,
  /\binto (a )?(single )?section called ["']?open\b/i,
  /\bmoving every point\b/i,
  /\b(that'?s|that is) (useless|not (a |the )?(proposal|reorganization|reorganisation))\b/i,
  /\b(nothing|anything) (actually |really )?(changed|different)\b/i,
  /\bno (meaningful |real |actual )?change\b/i,
  /\b(the )?same (document|thing|proposal)\b/i,
  /\bcopy.?paste[d]?\b/i,
  /\bdid (you|it|kip) (even )?change\b/i,
  /\brestat(e|ed|ement|es)\b/i,
  /\b(do not|don'?t) (necessarily )?belong\b/i,
];

export function detectReorganizeIntent(userInput: string): ReorganizeIntentKind {
  const text = userInput?.trim() ?? '';
  if (!text) return 'none';
  return REORGANIZE_PATTERNS.some((pattern) => pattern.test(text)) ? 'required' : 'none';
}
