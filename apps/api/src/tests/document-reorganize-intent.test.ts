import { describe, expect, it } from 'vitest';
import {
  detectReorganizeIntent,
  shouldRunReorganizePlacementFollowUp,
  shouldRunReorganizeProposeFollowUp,
} from '../services/kip/documentReorganizeIntent.js';

describe('detectReorganizeIntent', () => {
  it('hears review and reorganize', () => {
    expect(detectReorganizeIntent('Please review and reorganize Finding the Plot')).toBe(
      'required',
    );
    expect(detectReorganizeIntent('reorganize the document')).toBe('required');
    expect(detectReorganizeIntent('propose a better document')).toBe('required');
  });

  it('hears hyphenated re-organize and revieww typos', () => {
    expect(
      detectReorganizeIntent(
        'Kip, revieww and re-organize the document. And while you aree at it, suggest a new title.',
      ),
    ).toBe('required');
    expect(detectReorganizeIntent('Kip, re-organization is your job. You are the lead agent')).toBe(
      'required',
    );
  });

  it('asks the Lead to propose when they narrated instead of emitting the action', () => {
    expect(
      shouldRunReorganizeProposeFollowUp({
        intent: 'required',
        isTurnOwner: true,
        actionResults: [],
      }),
    ).toBe(true);
    expect(
      shouldRunReorganizeProposeFollowUp({
        intent: 'required',
        isTurnOwner: true,
        actionResults: [{ type: 'document.reorganize.propose', status: 'success' }],
      }),
    ).toBe(false);
    expect(
      shouldRunReorganizeProposeFollowUp({
        intent: 'required',
        isTurnOwner: false,
        actionResults: [],
      }),
    ).toBe(false);
  });

  it('asks the Lead to place Points after a spine-only proposal', () => {
    expect(
      shouldRunReorganizePlacementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { spineOnly: true },
          },
        ],
      }),
    ).toBe(true);
    expect(
      shouldRunReorganizePlacementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { spineOnly: false },
          },
        ],
      }),
    ).toBe(false);
  });

  it('ignores ordinary Point asks', () => {
    expect(detectReorganizeIntent('add a point about the plot')).toBe('none');
    expect(detectReorganizeIntent('what is the point of this')).toBe('none');
  });

  it('hears Forward and Document name asks', () => {
    expect(detectReorganizeIntent('Try updating the forward specifically')).toBe('required');
    expect(detectReorganizeIntent('Let me rewrite the Forward now')).toBe('required');
    expect(detectReorganizeIntent('Should we rename the document?')).toBe('required');
  });
});
