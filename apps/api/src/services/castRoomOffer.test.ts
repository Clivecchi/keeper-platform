import { describe, expect, it } from 'vitest';
import { platformAgencyCore } from '@keeper/shared';
import { buildCastOfferSystemPrompt } from './castRoomOffer.js';

describe('buildCastOfferSystemPrompt', () => {
  it('names the member responsibility and stays silent outside it', () => {
    const prompt = buildCastOfferSystemPrompt('Cloud', platformAgencyCore('cloud'));
    expect(prompt).toContain('You are Cloud.');
    expect(prompt).toMatch(/builder, investigator, and executor/i);
    expect(prompt).toMatch(/If it does not, reply \{"offer":""\}/);
    expect(prompt).toMatch(/outside your responsibility/i);
  });

  it('stays silent when responsibility is unset', () => {
    const prompt = buildCastOfferSystemPrompt('Rendr', null);
    expect(prompt).toMatch(/Responsibility is unset/);
    expect(prompt).toMatch(/stay silent/i);
  });
});
