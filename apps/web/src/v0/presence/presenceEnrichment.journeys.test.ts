// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildKeeperRelatedJourneysPath } from './presenceEnrichment';

describe('buildKeeperRelatedJourneysPath', () => {
  it('sends both Chronicle domainId and keeperId to the mounted Journey list', () => {
    expect(buildKeeperRelatedJourneysPath('domain-a', 'keeper-1')).toBe(
      '/api/journeys?domainId=domain-a&keeperId=keeper-1&limit=20',
    );
  });
});
