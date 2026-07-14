import { describe, expect, it } from 'vitest';
import {
  chronicleSubjectKey,
  chronicleSubjectToLegacyKindId,
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

  it('uses designer boardDefinitionId when isDesignerBoard', () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      isDesignerBoard: true,
      boardDefinitionId: 'def-1',
      selectedKeeperId: 'k-1',
    });
    expect(primary).toEqual({ kind: 'boardDef', id: 'def-1' });
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
