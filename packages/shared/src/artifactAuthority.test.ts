import { describe, expect, it } from 'vitest';
import {
  artifactSkipMessage,
  humanRequestsAttachedDocument,
  humanTextForArtifactAuthority,
  resolveArtifactAuthority,
} from './artifactAuthority.js';

describe('artifact authority', () => {
  it('refuses Points, Drafts, and Treatments when the human prohibits them', () => {
    const authority = resolveArtifactAuthority(
      'Do not create Points, Drafts, or Treatments. Investigate the runtime.',
    );
    expect(authority.prohibited).toBe(true);
    expect(authority.allowPointPropose).toBe(false);
    expect(authority.allowDraftCreate).toBe(false);
    expect(authority.allowTreatmentPropose).toBe(false);
    expect(artifactSkipMessage('draft.update.propose', authority)).toMatch(/asked not to create/i);
    expect(artifactSkipMessage('treatment.propose', authority)).toMatch(/asked not to create/i);
  });

  it('treats "not to create" as a prohibition', () => {
    const authority = resolveArtifactAuthority(
      'I explicitly instruct Kip not to create Points, Drafts, or Treatments.',
    );
    expect(authority.prohibited).toBe(true);
    expect(authority.allowPointPropose).toBe(false);
  });

  it('does not turn a report or an investigation into a Point', () => {
    const report = resolveArtifactAuthority(
      'Give me a State of Keeper report, including available agents and capabilities.',
    );
    expect(report.prohibited).toBe(false);
    expect(report.allowPointPropose).toBe(false);
    expect(report.allowDraftCreate).toBe(false);
    expect(report.allowTreatmentPropose).toBe(false);
    expect(artifactSkipMessage('draft.update.propose', report)).toMatch(/only when the human asked/i);
  });

  it('still allows a Point, a Draft, or a Treatment when the human asked', () => {
    expect(resolveArtifactAuthority('Add a point about the agency loop.').allowPointPropose).toBe(true);
    expect(resolveArtifactAuthority('Create a new draft for the mobile enter change.').allowDraftCreate).toBe(true);
    expect(resolveArtifactAuthority('Change the treatment palette.').allowTreatmentPropose).toBe(true);
  });

  it('lets Rendr change the look when the human asked to see a change', () => {
    expect(
      resolveArtifactAuthority('I want to see that Rendr can actually effect a visual change.')
        .allowTreatmentPropose,
    ).toBe(true);
    expect(resolveArtifactAuthority("Rendr... Change something").allowTreatmentPropose).toBe(true);
    expect(
      resolveArtifactAuthority('Give me a State of Keeper report, including available agents.')
        .allowTreatmentPropose,
    ).toBe(false);
  });

  it('treats an updated attached document as writing to land', () => {
    expect(
      humanRequestsAttachedDocument(
        'We have updated the Operational Truth document. Please act accordingly',
      ),
    ).toBe(true);
    expect(humanRequestsAttachedDocument('Give me a State of Keeper report.')).toBe(false);
    expect(
      humanRequestsAttachedDocument('Do not update the document. Just discuss it.'),
    ).toBe(false);
    expect(
      humanRequestsAttachedDocument('Do not create Points. We have updated the document.'),
    ).toBe(false);
  });

  it('reads the human sentence inside a director scaffold', () => {
    const text = humanTextForArtifactAuthority(
      '[Director delegation — Cloud]\nKip relayed:\n"Do not create Points."\n',
      null,
    );
    expect(text).toBe('Do not create Points.');
    expect(resolveArtifactAuthority(text).prohibited).toBe(true);
  });
});