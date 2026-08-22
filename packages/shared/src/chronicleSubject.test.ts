import { describe, expect, it } from 'vitest';
import {
  chronicleSubjectKey,
  chronicleSubjectToLegacyKindId,
  hasChronicleEntitySubject,
  resolveChronicleOverlay,
  resolveChroniclePrimary,
  resolveChronicleView,
} from './chronicleSubject.js';

const emptySelection = {
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
  selectedSoleMemoryId: null,
  selectedBoardDefId: null,
  selectedGlossaryId: null,
};

describe('resolveChroniclePrimary', () => {
  it('returns domain when no selection is active', () => {
    expect(resolveChroniclePrimary(emptySelection)).toEqual({ kind: 'domain' });
  });

  it('prefers library over journey per legacy priority', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedLibraryItemId: 'lib-1',
      selectedJourneyId: 'j-1',
    });
    expect(primary).toEqual({ kind: 'library', id: 'lib-1' });
  });

  it('includes journeyId on path subjects', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedJourneyId: 'j-1',
      selectedPathId: 'p-1',
    });
    expect(primary).toEqual({ kind: 'path', id: 'p-1', journeyId: 'j-1' });
  });

  it('prefers glossary over boardDef', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedBoardDefId: 'def-1',
      selectedGlossaryId: 'object-glossary',
    });
    expect(primary).toEqual({ kind: 'glossary', id: 'object-glossary' });
  });

  it('Nav Dialog wins over boardDef (exclusive list, Dialog is the subject)', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedBoardDefId: 'domain',
      selectedDialogId: 'dialog-touchdown',
    });
    expect(primary).toEqual({ kind: 'dialog', id: 'dialog-touchdown' });
  });

  it('Working on Draft wins over Talking in Dialog', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedDialogId: 'dialog-plot',
      selectedDraftId: 'draft-insights',
    });
    expect(primary).toEqual({ kind: 'draft', id: 'draft-insights' });
  });

  it('Nav Draft wins over boardDef', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedBoardDefId: 'domain',
      selectedDraftId: 'draft-1',
    });
    expect(primary).toEqual({ kind: 'draft', id: 'draft-1' });
  });

  it('boardDef is Chronicle subject only from Nav context, not a Design URL', () => {
    expect(
      resolveChroniclePrimary({
        ...emptySelection,
        isDesignerBoard: true,
        boardDefinitionId: 'def-1',
      }),
    ).toEqual({ kind: 'domain' });
    expect(
      resolveChroniclePrimary({
        ...emptySelection,
        selectedBoardDefId: 'def-1',
      }),
    ).toEqual({ kind: 'boardDef', id: 'def-1' });
  });
});

describe('hasChronicleEntitySubject', () => {
  it('is true for a Dialog even when a Design boardDef URL is present', () => {
    expect(
      hasChronicleEntitySubject({
        ...emptySelection,
        selectedDialogId: 'dialog-touchdown',
        selectedBoardDefId: 'domain',
      }),
    ).toBe(true);
  });

  it('is false when Design is idle on a boardDef', () => {
    expect(
      hasChronicleEntitySubject({
        ...emptySelection,
        selectedBoardDefId: 'domain',
      }),
    ).toBe(false);
  });
});

describe('resolveChronicleOverlay', () => {
  it('returns soleMemory overlay without clearing primary', () => {
    const overlay = resolveChronicleOverlay({
      ...emptySelection,
      selectedSoleMemoryId: 'mem-1',
      selectedDraftId: 'd-1',
    });
    expect(overlay).toEqual({ kind: 'soleMemory', id: 'mem-1' });
  });

  it('returns engagement overlay when provided', () => {
    const overlay = resolveChronicleOverlay(emptySelection, { templateSlug: 'start-journey' });
    expect(overlay).toEqual({
      kind: 'engagement',
      intent: { templateSlug: 'start-journey' },
    });
  });
});

describe('resolveChronicleView', () => {
  it('surfaces soleMemory as effective while preserving draft primary', () => {
    const view = resolveChronicleView({
      ...emptySelection,
      selectedSoleMemoryId: 'mem-1',
      selectedDraftId: 'd-1',
    });
    expect(view.primary).toEqual({ kind: 'draft', id: 'd-1' });
    expect(view.overlay).toEqual({ kind: 'soleMemory', id: 'mem-1' });
    expect(view.effective).toEqual({ kind: 'soleMemory', id: 'mem-1' });
  });

  it('maps effective subject to legacy kind/id', () => {
    const view = resolveChronicleView({
      ...emptySelection,
      selectedServiceSlug: 'github',
    });
    expect(chronicleSubjectToLegacyKindId(view.effective)).toEqual({
      kind: 'service',
      id: 'github',
    });
    expect(chronicleSubjectKey(view.effective)).toBe('service:github');
  });
});
