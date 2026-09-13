import { describe, expect, it } from 'vitest';
import {
  buildAgentPerformanceProvenance,
  deriveProvenanceFromLegacyMetadata,
  isLeadAgentRole,
  mechanismLabel,
  parseAgentPerformanceProvenance,
} from '@keeper/shared';

describe('shared agent role + provenance', () => {
  it('does not treat Kip identity as Lead', () => {
    expect(isLeadAgentRole('Lead')).toBe(true);
    expect(isLeadAgentRole('kip')).toBe(false);
    expect(isLeadAgentRole('Kip')).toBe(false);
  });

  it('records Lead Judgment from role, not slug', () => {
    const kip = buildAgentPerformanceProvenance({
      agentId: 'a1',
      agentSlug: 'kip',
      agentName: 'Kip',
      configuredRole: 'Lead',
      leadJudgmentActive: true,
      orchestrationMechanism: 'cast_consultation_a',
      cardType: 'summary',
    });
    expect(kip.actingRole).toBe('Lead');
    expect(mechanismLabel(kip.orchestrationMechanism)).toBe('multi-Cast');
    expect(parseAgentPerformanceProvenance(kip)?.agentSlug).toBe('kip');
  });

  it('marks legacy layers not recorded except observable metadata', () => {
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
    expect(derived.layers.find((layer) => layer.key === 'lead_judgment')?.status).toBe(
      'not_recorded',
    );
    expect(derived.layers.find((layer) => layer.key === 'orchestration')?.status).toBe(
      'recorded',
    );
  });
});
