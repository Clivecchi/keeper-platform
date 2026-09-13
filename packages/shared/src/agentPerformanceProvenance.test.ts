import { describe, expect, it } from 'vitest';
import {
  buildAgentPerformanceProvenance,
  deriveProvenanceFromLegacyMetadata,
  mechanismLabel,
  parseAgentPerformanceProvenance,
} from './agentPerformanceProvenance.js';

describe('agentPerformanceProvenance', () => {
  it('records Lead Judgment from role, not slug', () => {
    const kip = buildAgentPerformanceProvenance({
      agentId: 'a1',
      agentSlug: 'kip',
      agentName: 'Kip',
      configuredRole: 'Lead',
      leadJudgmentActive: true,
      orchestrationMechanism: 'cast_consultation_a',
      cast: [{ slug: 'cloud' }, { slug: 'rendr' }, { slug: 'ceox' }],
      cardType: 'summary',
      dialogTitle: 'Finding the Plot',
      dialogId: 'd1',
    });
    expect(kip.actingRole).toBe('Lead');
    expect(kip.layers.find((layer) => layer.key === 'lead_judgment')?.status).toBe(
      'recorded',
    );
    expect(mechanismLabel(kip.orchestrationMechanism)).toBe('multi-Cast');
    expect(kip.cardType).toBe('summary');
  });

  it('does not treat a Standard Kip-named agent as Lead', () => {
    const row = buildAgentPerformanceProvenance({
      agentId: 'a2',
      agentSlug: 'kip',
      agentName: 'Kip',
      configuredRole: 'Standard',
      leadJudgmentActive: false,
    });
    expect(row.actingRole).toBe('Standard');
    expect(row.layers.find((layer) => layer.key === 'lead_judgment')?.status).toBe(
      'not_recorded',
    );
  });

  it('marks legacy-derived layers as not recorded except observable metadata', () => {
    const derived = deriveProvenanceFromLegacyMetadata({
      agentId: 'a1',
      agentSlug: 'kip',
      agentName: 'Kip',
      configuredRole: 'Lead',
      dialogTitle: 'Finding the Plot',
      metadata: {
        orchestration: {
          mechanism: 'cast_consultation_a',
          castConsultSlugs: ['cloud', 'rendr', 'ceox'],
        },
        card: { type: 'summary' },
      },
    });
    expect(derived.source).toBe('derived_from_legacy');
    expect(derived.cardType).toBe('summary');
    expect(derived.cast.map((row) => row.slug)).toEqual(['cloud', 'rendr', 'ceox']);
    expect(derived.layers.find((layer) => layer.key === 'lead_judgment')?.status).toBe(
      'not_recorded',
    );
    expect(derived.layers.find((layer) => layer.key === 'orchestration')?.status).toBe(
      'recorded',
    );
  });

  it('parses only perf-v1 objects', () => {
    expect(parseAgentPerformanceProvenance({ version: 'other' })).toBeNull();
    const built = buildAgentPerformanceProvenance({
      agentId: 'a1',
      agentSlug: 'ceox',
      agentName: 'CeoX',
      configuredRole: 'Lead',
    });
    expect(parseAgentPerformanceProvenance(built)?.agentSlug).toBe('ceox');
  });
});
