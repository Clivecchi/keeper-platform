import { describe, expect, it } from 'vitest';
import {
  buildAllActionsFailedSummary,
  buildDraftMutationFailureNotice,
  buildMutationDeferralFollowUpInput,
  buildReadActionFollowUpInput,
  formatReadActionResultsForUserFallback,
  shouldRunMutationDeferralFollowUp,
  shouldRunReadActionFollowUp,
} from '../services/kip/actionFollowUp.js';

describe('actionFollowUp', () => {
  it('runs follow-up when turn is read-only and at least one read succeeded', () => {
    expect(
      shouldRunReadActionFollowUp(
        [{ type: 'draft.read' }],
        [{ type: 'draft.read', status: 'success', message: 'ok' }],
      ),
    ).toBe(true);
  });

  it('skips follow-up when write actions are present', () => {
    expect(
      shouldRunReadActionFollowUp(
        [{ type: 'draft.read' }, { type: 'draft.update.propose' }],
        [
          { type: 'draft.read', status: 'success', message: 'ok' },
          { type: 'draft.update.propose', status: 'success', message: 'ok' },
        ],
      ),
    ).toBe(false);
  });

  it('builds follow-up input that tells the model to complete engagement', () => {
    const input = buildReadActionFollowUpInput({
      originalInput: 'Review this session and rebuild the draft',
      agentName: 'Kip',
      priorResponseText: 'Reading the active draft now.',
      actionResults: [
        {
          type: 'draft.read',
          status: 'success',
          message: 'Draft retrieved successfully',
          data: {
            draft: { id: 'd1', title: 'The Future We Are Building', kind: 'journey_spec', key: 'future' },
            spec: { points: [] },
            summary: 'A living story',
          },
        },
      ],
    });

    expect(input).toContain('The Future We Are Building');
    expect(input).toContain('spec.points: []');
    expect(input).toContain('complete the engagement');
  });

  it('formats a user-facing fallback when follow-up is skipped for budget', () => {
    const text = formatReadActionResultsForUserFallback([
      {
        type: 'web.search',
        status: 'success',
        message: 'Found 1 web result for query',
        data: {
          query: 'Brave Search pricing',
          results: [
            {
              title: 'Brave Search API',
              url: 'https://brave.com/search/api/',
              snippet: 'Plans and pricing',
            },
          ],
        },
      },
    ]);

    expect(text).toContain('skipped a second synthesis pass');
    expect(text).toContain('Brave Search API');
    expect(text).toContain('https://brave.com/search/api/');
  });

  it('runs follow-up for web.search and formats titles/urls', () => {
    expect(
      shouldRunReadActionFollowUp(
        [{ type: 'web.search' }],
        [{ type: 'web.search', status: 'success', message: 'Found 1 web result for query' }],
      ),
    ).toBe(true);

    const input = buildReadActionFollowUpInput({
      originalInput: 'What is Brave Search pricing?',
      agentName: 'Kip',
      priorResponseText: 'Searching now.',
      actionResults: [
        {
          type: 'web.search',
          status: 'success',
          message: 'Found 1 web result for query',
          data: {
            query: 'Brave Search pricing',
            results: [
              {
                title: 'Brave Search API',
                url: 'https://brave.com/search/api/',
                snippet: 'Plans and pricing',
              },
            ],
          },
        },
      ],
    });

    expect(input).toContain('Brave Search API');
    expect(input).toContain('https://brave.com/search/api/');
    expect(input).toContain('Cite the most relevant sources');
  });

  it('runs mutation deferral follow-up when user asked for draft work and model deferred', () => {
    expect(
      shouldRunMutationDeferralFollowUp({
        userInput: 'Move platform gap into a new draft and keep the opening sequence clean.',
        responseText: "So here's what I'm doing — pulling everything into a separate draft. Give me a moment.",
        actions: [],
      }),
    ).toBe(true);
  });

  it('skips mutation deferral when draft actions were emitted', () => {
    expect(
      shouldRunMutationDeferralFollowUp({
        userInput: 'Create a new draft for platform gaps.',
        responseText: 'Done — new draft created.',
        actions: [{ type: 'draft.create' }],
      }),
    ).toBe(false);
  });

  it('runs mutation deferral follow-up when draft actions failed and model deferred', () => {
    expect(
      shouldRunMutationDeferralFollowUp({
        userInput: 'Move platform gap into a new draft and keep the opening sequence clean.',
        responseText: "So here's what I'm doing — pulling everything into a separate draft. Give me a moment.",
        actions: [{ type: 'draft.create' }],
        actionResults: [
          { type: 'draft.create', status: 'error', message: 'Draft key already exists' },
        ],
      }),
    ).toBe(true);
  });

  it('builds all-actions-failed summary when every action failed or skipped', () => {
    const summary = buildAllActionsFailedSummary([
      { type: 'draft.create', status: 'error', message: 'Validation failed' },
      { type: 'sole.save', status: 'skipped', message: 'Not allowed', },
    ]);
    expect(summary).toContain('could not complete the requested actions');
    expect(summary).toContain('draft.create (failed)');
    expect(summary).toContain('sole.save (skipped)');
  });

  it('builds draft mutation failure notice when no draft action succeeded', () => {
    const notice = buildDraftMutationFailureNotice(
      [{ type: 'draft.update', status: 'error', message: 'Draft not found' }],
      'Working on it now.',
    );
    expect(notice).toContain('Working on it now.');
    expect(notice).toContain('draft work, but it did not complete');
    expect(notice).toContain('Draft not found');
  });

  it('builds mutation deferral input that forbids another deferral', () => {
    const input = buildMutationDeferralFollowUpInput({
      originalInput: 'Split platform notes into a separate draft.',
      agentName: 'Kip',
      priorResponseText: 'Give me a moment while I pull that out.',
    });
    expect(input).toContain('Do NOT defer again');
    expect(input).toContain('draft.create');
  });
});
