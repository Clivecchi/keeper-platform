import { describe, expect, it } from 'vitest';
import {
  buildReorganizeProposeSystemPrompt,
  detectReorganizeIntent,
  shouldRunReorganizePlacementFollowUp,
  shouldRunReorganizeProposeFollowUp,
  shouldRunReorganizeRestatementFollowUp,
} from '../services/kip/documentReorganizeIntent.js';

describe('detectReorganizeIntent', () => {
  it('hears review and reorganize', () => {
    expect(detectReorganizeIntent('Please review and reorganize Finding the Plot')).toBe(
      'required',
    );
    expect(detectReorganizeIntent('reorganize the document')).toBe('required');
    expect(detectReorganizeIntent('propose a better document')).toBe('required');
  });

  it('hears director language Chuck actually uses', () => {
    expect(
      detectReorganizeIntent(
        'review the current document and suggest directorial changes',
      ),
    ).toBe('required');
    expect(detectReorganizeIntent('You are the director. Propose re-arrangement.')).toBe(
      'required',
    );
    expect(
      detectReorganizeIntent('we need this document to well tell the current story'),
    ).toBe('required');
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

  it('hears a dump-to-Open rejection as another propose turn', () => {
    expect(
      detectReorganizeIntent('So you propose moving every point into a single section called Open?'),
    ).toBe('required');
    expect(detectReorganizeIntent("that's useless")).toBe('required');
    expect(detectReorganizeIntent('add a point about the plot')).toBe('none');
  });

  it('hears a restatement complaint as another propose turn', () => {
    expect(detectReorganizeIntent('I am not sure anything actually changed')).toBe('required');
    expect(detectReorganizeIntent('nothing actually changed')).toBe('required');
    expect(detectReorganizeIntent('this looks like a copy paste of the same document')).toBe(
      'required',
    );
    expect(detectReorganizeIntent('no meaningful change')).toBe('required');
    expect(
      detectReorganizeIntent('those points do not necessarily belong in Implementation Contract'),
    ).toBe('required');
  });

  it('asks the Lead to place again after a one-Section dump of Open Points', () => {
    expect(
      shouldRunReorganizePlacementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { oneSectionDumpRepaired: true },
          },
        ],
      }),
    ).toBe(true);
  });

  it('tells the Lead that Current is evidence and omit is only a safety default', () => {
    const prompt = buildReorganizeProposeSystemPrompt('Finding the Plot');
    expect(prompt).toContain('Current is evidence, not a constraint');
    expect(prompt).toContain('create, rename, or reorder Sections');
    expect(prompt).toContain('safety default');
    expect(prompt).toContain('Never dump named work into Open');
    expect(prompt).not.toContain('omit for unplaced Points');
    expect(prompt).not.toContain('Preserve membership unless you are deliberately moving');
  });

  it('asks the Lead again when the proposal restated Current', () => {
    expect(
      shouldRunReorganizeRestatementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { restatement: true },
          },
        ],
      }),
    ).toBe(true);
    expect(
      shouldRunReorganizeRestatementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { spineOnly: true, restatement: true },
          },
        ],
      }),
    ).toBe(false);
  });

  it('asks the Lead to place Points after an Open-dump repair', () => {
    expect(
      shouldRunReorganizePlacementFollowUp({
        isLead: true,
        actionResults: [
          {
            type: 'document.reorganize.propose',
            status: 'success',
            data: { openDumpRepaired: true },
          },
        ],
      }),
    ).toBe(true);
  });
});
