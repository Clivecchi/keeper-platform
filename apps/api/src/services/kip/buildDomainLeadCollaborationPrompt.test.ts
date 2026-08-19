import { describe, expect, it } from 'vitest';
import {
  buildDomainLeadCollaborationPrompt,
  resolveDomainLeadFromRoster,
} from './buildDomainLeadCollaborationPrompt.js';

describe('resolveDomainLeadFromRoster', () => {
  it('selects the declared Lead, not a Cast guest', () => {
    const lead = resolveDomainLeadFromRoster([
      { slug: 'kip', name: 'Kip', role: 'Lead' },
      { slug: 'cloud', name: 'Cloud', role: 'System' },
      { slug: 'rendr', name: 'Rendr', role: 'System' },
      { slug: 'ceox', name: 'Ceox', role: 'Cast' },
    ]);
    expect(lead).toBeNull();
  });

  it('selects a non-platform domain Lead when present', () => {
    const lead = resolveDomainLeadFromRoster([
      { slug: 'ceox', name: 'Ceox', role: 'Lead' },
      { slug: 'kip', name: 'Kip', role: 'Lead' },
      { slug: 'cloud', name: 'Cloud', role: 'System' },
      { slug: 'guest', name: 'Guest', role: 'Cast' },
    ]);
    expect(lead?.slug).toBe('ceox');
  });

  it('never promotes Cast even when they are the only non-platform agent', () => {
    const lead = resolveDomainLeadFromRoster([
      { slug: 'kip', name: 'Kip', role: 'Lead' },
      { slug: 'ceox', name: 'Ceox', role: 'Cast' },
    ]);
    expect(lead).toBeNull();
  });
});

describe('buildDomainLeadCollaborationPrompt', () => {
  const kipEnvWithCastGuest = {
    domainAgents: [
      { slug: 'kip', name: 'Kip', role: 'Lead' },
      { slug: 'cloud', name: 'Cloud', role: 'System' },
      { slug: 'rendr', name: 'Rendr', role: 'System' },
      { slug: 'ceox', name: 'Ceox', role: 'Cast' },
    ],
  };

  const ceoxDomainEnv = {
    domainAgents: [
      { slug: 'ceox', name: 'Ceox', role: 'Lead' },
      { slug: 'kip', name: 'Kip', role: 'Lead' },
      { slug: 'cloud', name: 'Cloud', role: 'System' },
    ],
  };

  it('does not demote Kip when only Cast guests are present (ke3p + Ceox cast)', () => {
    const prompt = buildDomainLeadCollaborationPrompt(
      { slug: 'kip', name: 'Kip' },
      kipEnvWithCastGuest,
    );
    expect(prompt).toBeNull();
  });

  it('demotes Kip when a real domain Lead is present', () => {
    const prompt = buildDomainLeadCollaborationPrompt(
      { slug: 'kip', name: 'Kip' },
      ceoxDomainEnv,
    );
    expect(prompt).toContain('PLATFORM SUPPORT');
    expect(prompt).toContain('Ceox');
    expect(prompt).toContain('slug: ceox');
    expect(prompt).toContain('Do not offer help you are not delivering now');
  });

  it('affirms the domain Lead when that agent is speaking', () => {
    const prompt = buildDomainLeadCollaborationPrompt(
      { slug: 'ceox', name: 'Ceox' },
      ceoxDomainEnv,
    );
    expect(prompt).toContain('LEAD AGENT');
    expect(prompt).toContain('Ceox');
    expect(prompt).toMatch(/let Kip construct|create the draft/i);
  });

  it('returns null for Cast guests (no lead/support override)', () => {
    const prompt = buildDomainLeadCollaborationPrompt(
      { slug: 'ceox', name: 'Ceox' },
      kipEnvWithCastGuest,
    );
    expect(prompt).toBeNull();
  });
});
