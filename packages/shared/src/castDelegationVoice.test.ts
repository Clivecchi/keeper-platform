import { describe, expect, it } from 'vitest';
import {
  GOLDEN_PATH_AGENCY_LINES,
  buildCastSpeechAndAgencyLines,
} from './castDelegationVoice.js';

describe('buildCastSpeechAndAgencyLines', () => {
  it('forbids one undifferentiated paragraph and tells Cast to fire tools', () => {
    const lines = buildCastSpeechAndAgencyLines({
      castMemberLabel: 'Cloud',
      directorName: 'Kip',
    }).join('\n');
    expect(lines).toMatch(/Do not write one undifferentiated paragraph/i);
    expect(lines).not.toMatch(/one focused paragraph/i);
    expect(lines).not.toMatch(/one short paragraph/i);
    expect(lines).toContain(GOLDEN_PATH_AGENCY_LINES[0]);
    expect(lines).toMatch(/Do not defer to Kip/i);
    expect(lines).toMatch(/Never say a search or evaluation did not run/i);
    expect(lines).toMatch(/emit envelope "card"/i);
  });

  it('keeps Vibe short while still granting golden-path tools', () => {
    const lines = buildCastSpeechAndAgencyLines({
      castMemberLabel: 'Rendr',
      directorName: 'Kip',
      dialogStyle: 'vibe',
    }).join('\n');
    expect(lines).toMatch(/one short beat/i);
    expect(lines).toMatch(/Do not defer to Kip/i);
  });
});
