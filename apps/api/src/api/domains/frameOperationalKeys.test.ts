import { describe, expect, it } from 'vitest';
import {
  FROZEN_FRAME_JSON_KEYS,
  omitOperationalFrameKeysFromPatch,
  patchTouchesFrozenFrameKeys,
  pickOperationalFrameKeys,
  stripOperationalFrameKeys,
} from './frameOperationalKeys.js';

describe('frameOperationalKeys', () => {
  const sample = {
    domain: 'default',
    kip_context: { guest: 'hi' },
    session_notes: { conversation_log: [{ role: 'user', text: 'hello' }] },
    platform_gaps: [{ id: 'gap-1', note: 'missing logbook' }],
  };

  it('defines the expected frozen keys', () => {
    expect(FROZEN_FRAME_JSON_KEYS).toEqual(['session_notes', 'platform_gaps']);
  });

  it('stripOperationalFrameKeys removes operational keys only', () => {
    const stripped = stripOperationalFrameKeys(sample);
    expect(stripped).toEqual({
      domain: 'default',
      kip_context: { guest: 'hi' },
    });
    expect(sample.session_notes).toBeDefined();
  });

  it('pickOperationalFrameKeys extracts frozen keys', () => {
    expect(pickOperationalFrameKeys(sample)).toEqual({
      session_notes: sample.session_notes,
      platform_gaps: sample.platform_gaps,
    });
  });

  it('omitOperationalFrameKeysFromPatch removes frozen keys from patch', () => {
    const patch = omitOperationalFrameKeysFromPatch({
      theme: { wordmark: 'KE3P' },
      session_notes: { conversation_log: [] },
    });
    expect(patch).toEqual({ theme: { wordmark: 'KE3P' } });
  });

  it('patchTouchesFrozenFrameKeys detects frozen key writes', () => {
    expect(patchTouchesFrozenFrameKeys({ theme: {} })).toBe(false);
    expect(patchTouchesFrozenFrameKeys({ platform_gaps: [] })).toBe(true);
  });
});
