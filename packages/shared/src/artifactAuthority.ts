/**
 * Artifact mutation authority for one human turn.
 * Points, Drafts, and Treatments run only when this turn asks for them.
 * A prohibition covers the whole turn, including follow-up passes.
 * The executor is the boundary. Phrase lists only feed this decision.
 */

export type ArtifactAuthority = {
  prohibited: boolean;
  allowPointPropose: boolean;
  allowDraftCreate: boolean;
  allowTreatmentPropose: boolean;
};

const PROHIBITION_PATTERNS = [
  /\bdon['’]?t add\b/i,
  /\bdo not add\b/i,
  /\bdon['’]?t create\b/i,
  /\bdo not create\b/i,
  /\bnot to (create|add|write|propose|make|save|capture)\b/i,
  /\bdon['’]?t (write|capture|propose|save|make)\b/i,
  /\bdo not (write|capture|propose|save|make)\b/i,
  /\bnothing yet\b/i,
  /\bdon['’]?t add (any )?points yet\b/i,
  /\bdo not add (any )?points yet\b/i,
  /\bno points yet[,.]?\s*(don['’]?t|do not|without)\b/i,
  /\bdon['’]?t add anything\b/i,
  /\bdo not add anything\b/i,
  /\bdiscuss possible points\b/i,
  /\blet['’]?s discuss.{0,80}(point|points).{0,40}(don['’]?t|do not|without) (add|creat|write|captur)/i,
  /\bwithout (adding|creating|writing|capturing|proposing|making)\b/i,
  /\bbut don['’]?t add\b/i,
  /\b(do not|don['’]?t|not to)\s+(create|add|write|propose|make|save)\b[\s\S]{0,60}\b(points?|drafts?|treatments?)\b/i,
  /\bno (new )?(points?|drafts?|treatments?)\b[\s\S]{0,40}\b(or|and)\b[\s\S]{0,20}\b(points?|drafts?|treatments?)\b/i,
];

const POINT_REQUEST_PATTERNS = [
  /\bpropose (a |the |some |these |those )?points?\b/i,
  /\badd (this|that|these|those|it) as (a )?points?\b/i,
  /\badd (a |these |those |some )?points?\b/i,
  /\bcapture[\s\S]{0,160}as points?\b/i,
  /\bcapture (the |these |those |some )?.{0,40}(conclusions?|findings?|points?)\b/i,
  /\bput (this|that|these|those|it) in(to)? the documents?\b/i,
  /\bmake (this|that|these|those|it) (a |into )?points?\b/i,
  /\bcreate (a |these |some )?points?\b/i,
  /\bwrite (a |these |some )?points?\b/i,
  /\badd (that|this|it) to the documents?\b/i,
  /\bsave (that|this|it|these) as (a )?points?\b/i,
  /\bcan you (create and )?add points?\b/i,
  /\bso propose a? points?\b/i,
  /\bweren['’]?t able to propose\b/i,
  /\bdidn['’]?t (actually )?(propose|add) (the )?points?\b/i,
  /\bwhat document or draft did you propose\b/i,
  /^(and )?(again,? )?(still nothing|same behavior)\b/i,
  /\bjust (do it|fire (the )?action|propose)\b/i,
  /\ba points? worth captur/i,
  /\bpoints? worth captur/i,
  /\bthat is (most certainly )?a points?\b/i,
  /\bcapture (it|that|this) (now|as (a )?points?)\b/i,
  /\bcreate (a |the )?new section\b/i,
  /\bnew section (called|named|and call it)\b/i,
  /\bsection and call it\b/i,
  /\bi don['’]?t see the (new )?section\b/i,
  /\bskipped .{0,40}actions?\b/i,
];

const DRAFT_CREATE_PATTERNS = [
  /\b(create|start|open|make) (a |the )?(new |working )?draft\b/i,
  /\bnew working draft\b/i,
  /\bdraft\.create\b/i,
];

const TREATMENT_PATTERNS = [
  /\b(propose|change|update|set|apply) (a |the |my )?(chronicle )?treatment\b/i,
  /\b(change|set|update) (the )?(palette|fonts?)\b/i,
  /\bchronicle look\b/i,
];

function matches(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/** The human forbade Points, Drafts, or Treatments on this sentence. */
export function humanProhibitsArtifacts(text: string | null | undefined): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;
  return matches(input, PROHIBITION_PATTERNS);
}

/** The human asked for a Document Point or a named Section. */
export function humanRequestsPoint(text: string | null | undefined): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;
  return matches(input, POINT_REQUEST_PATTERNS);
}

/** The human asked to create a Draft. */
export function humanRequestsDraft(text: string | null | undefined): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;
  return matches(input, DRAFT_CREATE_PATTERNS);
}

/** The human asked to change the Chronicle look. */
export function humanRequestsTreatment(text: string | null | undefined): boolean {
  const input = text?.trim() ?? '';
  if (!input) return false;
  return matches(input, TREATMENT_PATTERNS);
}

/**
 * Visible human sentence. Director scaffolds quote that sentence;
 * the scaffold itself is not a request to mutate.
 */
export function humanTextForArtifactAuthority(
  input: string | null | undefined,
  displayContent?: string | null,
): string {
  const visible = displayContent?.trim();
  if (visible) return visible;
  const text = input?.trim() ?? '';
  if (/^\[(?:Director delegation|Cast Room|Orchestration context)/i.test(text)) {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
        return trimmed.slice(1, -1);
      }
    }
  }
  return text;
}

export function resolveArtifactAuthority(text: string | null | undefined): ArtifactAuthority {
  const input = text?.trim() ?? '';
  if (humanProhibitsArtifacts(input)) {
    return {
      prohibited: true,
      allowPointPropose: false,
      allowDraftCreate: false,
      allowTreatmentPropose: false,
    };
  }
  return {
    prohibited: false,
    allowPointPropose: humanRequestsPoint(input),
    allowDraftCreate: humanRequestsDraft(input),
    allowTreatmentPropose: humanRequestsTreatment(input),
  };
}

export function humanRequestedArtifact(text: string | null | undefined): boolean {
  const authority = resolveArtifactAuthority(text);
  return authority.allowPointPropose || authority.allowDraftCreate || authority.allowTreatmentPropose;
}

/** Skip copy for the executor. Null when this action is allowed. */
export function artifactSkipMessage(
  actionType: string,
  authority: ArtifactAuthority | null | undefined,
): string | null {
  if (!authority) return null;
  if (actionType === 'draft.update.propose' && !authority.allowPointPropose) {
    return authority.prohibited
      ? 'Skipped — the human asked not to create Points, Drafts, or Treatments.'
      : 'Skipped — a Point is proposed only when the human asked for a Point. A proposal does not complete an investigation.';
  }
  if (actionType === 'draft.create' && !authority.allowDraftCreate) {
    return authority.prohibited
      ? 'Skipped — the human asked not to create Points, Drafts, or Treatments.'
      : 'Skipped — a Draft is created only when the human asked for a Draft.';
  }
  if (actionType === 'treatment.propose' && !authority.allowTreatmentPropose) {
    return authority.prohibited
      ? 'Skipped — the human asked not to create Points, Drafts, or Treatments.'
      : 'Skipped — a Treatment runs only when the human asked for the Chronicle look.';
  }
  return null;
}
