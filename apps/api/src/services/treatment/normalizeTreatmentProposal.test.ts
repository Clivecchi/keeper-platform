import { describe, expect, it } from 'vitest';
import {
  buildTreatmentProposalSummary,
  coerceTreatmentProposePayload,
  normalizeTreatmentProposal,
} from './normalizeTreatmentProposal.js';

describe('normalizeTreatmentProposal', () => {
  it('merges partial proposal onto defaults', () => {
    const result = normalizeTreatmentProposal(null, {
      name: 'Warm Evening',
      palette: { background: '2a2420', accent: '#c47a5a' },
      font: { family: 'Georgia, serif' },
    });

    expect(result.name).toBe('Warm Evening');
    expect(result.palette.background).toBe('#2a2420');
    expect(result.palette.accent).toBe('#c47a5a');
    expect(result.font.family).toBe('Georgia, serif');
  });

  it('preserves unchanged fields from existing treatment', () => {
    const result = normalizeTreatmentProposal(
      {
        name: 'Standard',
        palette: { background: '#f5f0e8', accent: '#2d6a7f' },
        font: { family: 'Inter, sans-serif' },
      },
      { palette: { background: '#111111' } },
    );

    expect(result.name).toBe('Standard');
    expect(result.palette.background).toBe('#111111');
    expect(result.palette.accent).toBe('#2d6a7f');
    expect(result.font.family).toBe('Inter, sans-serif');
  });

  it('builds a human-readable summary', () => {
    const summary = buildTreatmentProposalSummary({
      name: 'Cool Studio',
      palette: { background: '#f0f4f8', accent: '#1a4d6e' },
      font: { family: 'Inter, sans-serif' },
    });

    expect(summary).toContain('Cool Studio');
    expect(summary).toContain('#f0f4f8');
  });
});

describe('coerceTreatmentProposePayload', () => {
  it('wraps flat name/palette/font into treatment', () => {
    const coerced = coerceTreatmentProposePayload({
      rationale: 'warmer',
      name: 'Parchment',
      palette: { background: '#f5f0e8', accent: '#2d6a7f' },
      font: { family: 'Georgia, serif' },
    });
    expect(coerced.rationale).toBe('warmer');
    expect(coerced.treatment).toEqual({
      name: 'Parchment',
      palette: { background: '#f5f0e8', accent: '#2d6a7f' },
      font: { family: 'Georgia, serif' },
    });
  });

  it('leaves nested treatment untouched', () => {
    const nested = {
      treatment: { name: 'Keep', palette: { background: '#111111' } },
    };
    expect(coerceTreatmentProposePayload(nested)).toEqual(nested);
  });

  it('wraps top-level background/accent/fontFamily into treatment.palette/font', () => {
    const coerced = coerceTreatmentProposePayload({
      name: 'Archival',
      background: '#f5f0e8',
      accent: '2d6a7f',
      fontFamily: 'Georgia, serif',
    });
    expect(coerced.treatment).toEqual({
      name: 'Archival',
      palette: { background: '#f5f0e8', accent: '2d6a7f' },
      font: { family: 'Georgia, serif' },
    });
  });

  it('parses treatment JSON string and theme nesting', () => {
    const fromString = coerceTreatmentProposePayload({
      treatment: JSON.stringify({
        name: 'Studio',
        palette: { background: '#111111', accent: '#eeeeee' },
      }),
    });
    expect((fromString.treatment as { name?: string }).name).toBe('Studio');

    const fromTheme = coerceTreatmentProposePayload({
      theme: { name: 'Soft', palette: { background: '#fafafa' }, font: { family: 'Inter' } },
    });
    expect(fromTheme.treatment).toEqual({
      name: 'Soft',
      palette: { background: '#fafafa' },
      font: { family: 'Inter' },
    });
  });
});
