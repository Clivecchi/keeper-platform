import { describe, expect, it } from 'vitest';
import {
  buildAgencyCorePrompt,
  catalogProbeGuidance,
  objectiveIdentifiesWork,
  parseAgencyCore,
  resolveAgencyCore,
} from './agencyCore.js';
import { formatDomainCatalogPrompt } from './domainCatalog.js';

describe('agency core', () => {
  it('gives Kip, Cloud, and Rendr different jobs', () => {
    const kip = resolveAgencyCore({ slug: 'kip', config: {} });
    const cloud = resolveAgencyCore({ slug: 'cloud', config: {} });
    const rendr = resolveAgencyCore({ slug: 'rendr', config: {} });
    expect(kip?.who).toMatch(/Lead/);
    expect(cloud?.purpose).toMatch(/implementation/i);
    expect(cloud?.principles.join(' ')).toMatch(/Treatment/);
    expect(rendr?.responsibilities.join(' ')).toMatch(/silent/i);
    expect(cloud?.capabilities).toContain('mcp.call');
    expect(cloud?.capabilities.join(' ')).not.toMatch(/github read|stage composition/);
    expect(rendr?.capabilities).toContain('stage.story.layout');
    const ceox = resolveAgencyCore({ slug: 'ceox', config: {} });
    expect(ceox?.who).toMatch(/challenger/i);
    expect(ceox?.capabilities).toEqual([
      'catalog.read',
      'dialog.read',
      'draft.read',
      'library.read',
      'glossary.read',
    ]);
    expect(ceox?.capabilities.join(' ')).not.toMatch(/draft\.update\.propose|treatment\.propose|mcp\.call|stage\.story\.layout/);
    expect(buildAgencyCorePrompt(cloud!)).toMatch(/AGENCY CORE v2 — cloud/);
    expect(buildAgencyCorePrompt(cloud!)).not.toMatch(/voice_prompt/);
  });

  it('prefers a stored v1 core over the platform constant', () => {
    const stored = resolveAgencyCore({
      slug: 'cloud',
      config: {
        agency: {
          v: 1,
          slug: 'cloud',
          who: 'Stored Cloud',
          purpose: 'Stored purpose',
          responsibilities: ['One'],
          principles: ['Two'],
          relationshipToLead: 'Lead directs',
          capabilities: ['catalog.read'],
        },
      },
    });
    expect(stored?.who).toBe('Stored Cloud');
    expect(parseAgencyCore({ v: 2, slug: 'cloud' })).toBeNull();
  });

  it('skips a catalog probe when the two failed objectives already name the work', () => {
    expect(objectiveIdentifiesWork(
      'when on mobile I want Enter to create a new line, not send the message',
    )).toBe(true);
    expect(objectiveIdentifiesWork(
      'Signup never asks for age + COPPA. No registered DMCA agent.',
    )).toBe(true);
    expect(objectiveIdentifiesWork('what do we already have about the pool house?')).toBe(false);
    expect(catalogProbeGuidance('change the Enter key')).toMatch(/Do not call jev.probe/);
    expect(catalogProbeGuidance('what do we already have about the pool house?')).toMatch(/catalog.read that shelf/);
  });

  it('formats a catalog as counts, not bodies', () => {
    const prompt = formatDomainCatalogPrompt({
      counts: { dialog: 40, draft: 3, keeper: 2, journey: 1, moment: 8, library: 5 },
      probeLine: 'The objective already names the work. Do not call jev.probe to rank the catalog.',
    });
    expect(prompt).toMatch(/dialog: 40/);
    expect(prompt).toMatch(/Bodies are not loaded/);
    expect(prompt).not.toMatch(/narrative|spec_json|extracted_text/);
    expect(prompt).toMatch(/library.read/);
  });
});
