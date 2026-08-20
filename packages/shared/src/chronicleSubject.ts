/**
 * Chronicle subject + overlay — Layer 1 selection model.
 * Compat shim: maps flat nullable IDs (UniversalBoardContext) to explicit subject/overlay.
 * See docs/chronicle-document-architecture.md
 */

/** Flat nullable IDs used by UniversalBoardContext today — compat input only. */
export interface LegacyChronicleSelectionIds {
  selectedDialogId: string | null;
  selectedJourneyId: string | null;
  selectedPathId: string | null;
  selectedMomentId: string | null;
  selectedKeeperId: string | null;
  selectedDraftId: string | null;
  selectedAgentId: string | null;
  selectedServiceSlug: string | null;
  selectedKeyId: string | null;
  selectedCapabilityId: string | null;
  selectedLibraryItemId: string | null;
  selectedSoleMemoryId: string | null;
  selectedBoardDefId: string | null;
  /** Object Glossary — governing vocabulary, not a Dialog Document. */
  selectedGlossaryId: string | null;
}

export interface ResolveChronicleViewInput extends LegacyChronicleSelectionIds {
  /** Designer board: URL-resolved definition id. */
  boardDefinitionId?: string | null;
  isDesignerBoard?: boolean;
}

/** Minimal engagement ref for overlay typing — web maps BoardEngagementIntent at the boundary. */
export interface ChronicleEngagementIntent {
  templateSlug: string;
}

export type ChronicleSubject =
  | { kind: 'domain' }
  | { kind: 'dialog'; id: string }
  | { kind: 'journey'; id: string }
  | { kind: 'path'; id: string; journeyId: string }
  | { kind: 'moment'; id: string; pathId?: string; journeyId?: string }
  | { kind: 'keeper'; id: string }
  | { kind: 'draft'; id: string }
  | { kind: 'agent'; id: string }
  | { kind: 'service'; slug: string }
  | { kind: 'key'; id: string }
  | { kind: 'capability'; id: string }
  | { kind: 'library'; id: string }
  | { kind: 'boardDef'; id: string }
  | { kind: 'glossary'; id: string };

/** Sentinel id for the single Object Glossary Chronicle subject. */
export const OBJECT_GLOSSARY_SUBJECT_ID = 'object-glossary';

export type ChronicleOverlay =
  | { kind: 'soleMemory'; id: string }
  | { kind: 'engagement'; intent: ChronicleEngagementIntent }
  | null;

/** Sole-memory overlay surfaces as its own effective kind for legacy TrailKind routing. */
export type ChronicleEffectiveSubject = ChronicleSubject | { kind: 'soleMemory'; id: string };

export interface ChronicleView {
  /** Underlying focus — persists while an overlay is active. */
  primary: ChronicleSubject;
  overlay: ChronicleOverlay;
  /** Render target: overlay (soleMemory) ?? primary ?? domain idle. Engagement is handled separately in Chronicle. */
  effective: ChronicleEffectiveSubject;
}

/** Legacy TrailKind values — compat output for UniversalViewPanel shim. */
export type ChronicleLegacyKind =
  | 'domain'
  | 'dialog'
  | 'journey'
  | 'path'
  | 'moment'
  | 'keeper'
  | 'draft'
  | 'agent'
  | 'service'
  | 'key'
  | 'capability'
  | 'library'
  | 'soleMemory'
  | 'boardDef'
  | 'glossary';

export interface ChronicleLegacyKindId {
  kind: ChronicleLegacyKind;
  id: string | null;
}

const DOMAIN_SUBJECT: ChronicleSubject = { kind: 'domain' };

/**
 * True when Nav has an EntityKind / Dialog / Draft subject.
 * Design `?definition=` is idle spec only — it must not steal Chronicle from these.
 */
export function hasChronicleEntitySubject(input: LegacyChronicleSelectionIds): boolean {
  return Boolean(
    input.selectedGlossaryId ||
      input.selectedKeyId ||
      input.selectedCapabilityId ||
      input.selectedLibraryItemId ||
      input.selectedServiceSlug ||
      input.selectedDialogId ||
      input.selectedDraftId ||
      input.selectedAgentId ||
      input.selectedMomentId ||
      input.selectedPathId ||
      input.selectedJourneyId ||
      input.selectedKeeperId,
  );
}

/** Resolve primary subject from legacy flat IDs — mirrors resolveKindId() without soleMemory. */
export function resolveChroniclePrimary(input: ResolveChronicleViewInput): ChronicleSubject {
  const boardDefId =
    input.selectedBoardDefId ||
    (input.isDesignerBoard && input.boardDefinitionId ? input.boardDefinitionId : null);

  if (input.selectedGlossaryId) {
    return { kind: 'glossary', id: input.selectedGlossaryId };
  }
  if (input.selectedKeyId) return { kind: 'key', id: input.selectedKeyId };
  if (input.selectedCapabilityId) return { kind: 'capability', id: input.selectedCapabilityId };
  if (input.selectedLibraryItemId) return { kind: 'library', id: input.selectedLibraryItemId };
  if (input.selectedServiceSlug) return { kind: 'service', slug: input.selectedServiceSlug };
  if (input.selectedDialogId) return { kind: 'dialog', id: input.selectedDialogId };
  if (input.selectedDraftId) return { kind: 'draft', id: input.selectedDraftId };
  if (input.selectedAgentId) return { kind: 'agent', id: input.selectedAgentId };
  if (input.selectedMomentId) {
    return {
      kind: 'moment',
      id: input.selectedMomentId,
      ...(input.selectedPathId ? { pathId: input.selectedPathId } : {}),
      ...(input.selectedJourneyId ? { journeyId: input.selectedJourneyId } : {}),
    };
  }
  if (input.selectedPathId && input.selectedJourneyId) {
    return { kind: 'path', id: input.selectedPathId, journeyId: input.selectedJourneyId };
  }
  if (input.selectedJourneyId) return { kind: 'journey', id: input.selectedJourneyId };
  if (input.selectedKeeperId) return { kind: 'keeper', id: input.selectedKeeperId };
  // Design board-def URL is idle spec — never ahead of a Nav entity (Dialog, Draft, …).
  if (boardDefId) return { kind: 'boardDef', id: boardDefId };
  return DOMAIN_SUBJECT;
}

/** Resolve optional overlay from legacy IDs and engagement intent. */
export function resolveChronicleOverlay(
  input: LegacyChronicleSelectionIds,
  engagement?: ChronicleEngagementIntent | null,
): ChronicleOverlay {
  if (input.selectedSoleMemoryId) {
    return { kind: 'soleMemory', id: input.selectedSoleMemoryId };
  }
  if (engagement) {
    return { kind: 'engagement', intent: engagement };
  }
  return null;
}

/** Full Layer-1 view: primary + overlay + effective render subject. */
export function resolveChronicleView(
  input: ResolveChronicleViewInput,
  engagement?: ChronicleEngagementIntent | null,
): ChronicleView {
  const primary = resolveChroniclePrimary(input);
  const overlay = resolveChronicleOverlay(input, engagement);

  let effective: ChronicleEffectiveSubject = primary;
  if (overlay?.kind === 'soleMemory') {
    effective = { kind: 'soleMemory', id: overlay.id };
  }

  return { primary, overlay, effective };
}

/** Map ChronicleSubject (or soleMemory effective) to legacy { kind, id } for TrailKind shim. */
export function chronicleSubjectToLegacyKindId(
  subject: ChronicleEffectiveSubject,
): ChronicleLegacyKindId {
  switch (subject.kind) {
    case 'domain':
      return { kind: 'domain', id: null };
    case 'service':
      return { kind: 'service', id: subject.slug };
    case 'soleMemory':
    case 'dialog':
    case 'journey':
    case 'path':
    case 'moment':
    case 'keeper':
    case 'draft':
    case 'agent':
    case 'key':
    case 'capability':
    case 'library':
    case 'boardDef':
    case 'glossary':
      return { kind: subject.kind, id: subject.id };
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}

/** Stable context key — matches UniversalViewPanel contextKey format. */
export function chronicleSubjectKey(subject: ChronicleEffectiveSubject): string {
  const { kind, id } = chronicleSubjectToLegacyKindId(subject);
  return `${kind}:${id ?? '_'}`;
}

/** Partial legacy IDs for trail back-navigation compat — inverse of primary resolution. */
export function legacySelectionFromChronicleSubject(
  subject: ChronicleSubject,
): Partial<LegacyChronicleSelectionIds> {
  switch (subject.kind) {
    case 'domain':
      return {
        selectedDialogId: null,
        selectedJourneyId: null,
        selectedPathId: null,
        selectedMomentId: null,
        selectedKeeperId: null,
        selectedDraftId: null,
        selectedAgentId: null,
        selectedServiceSlug: null,
        selectedKeyId: null,
        selectedCapabilityId: null,
        selectedLibraryItemId: null,
        selectedBoardDefId: null,
        selectedGlossaryId: null,
      };
    case 'dialog':
      return { selectedDialogId: subject.id };
    case 'journey':
      return { selectedJourneyId: subject.id, selectedPathId: null, selectedMomentId: null };
    case 'path':
      return {
        selectedJourneyId: subject.journeyId,
        selectedPathId: subject.id,
        selectedMomentId: null,
      };
    case 'moment':
      return {
        selectedMomentId: subject.id,
        selectedPathId: subject.pathId ?? null,
        selectedJourneyId: subject.journeyId ?? null,
      };
    case 'keeper':
      return { selectedKeeperId: subject.id };
    case 'draft':
      return { selectedDraftId: subject.id };
    case 'agent':
      return { selectedAgentId: subject.id };
    case 'service':
      return { selectedServiceSlug: subject.slug };
    case 'key':
      return { selectedKeyId: subject.id };
    case 'capability':
      return { selectedCapabilityId: subject.id };
    case 'library':
      return { selectedLibraryItemId: subject.id };
    case 'boardDef':
      return { selectedBoardDefId: subject.id };
    case 'glossary':
      return { selectedGlossaryId: subject.id };
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}
