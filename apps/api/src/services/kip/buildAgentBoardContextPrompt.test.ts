import { describe, expect, it } from 'vitest';
import {
  buildAgentPerformanceInspectionPrompt,
  buildAgentTrainingPrompt,
  collectAgentBoardContextPrompts,
} from './buildAgentBoardContextPrompt.js';

describe('buildAgentBoardContextPrompt', () => {
  it('grounds inspection from observable facts only', () => {
    const prompt = buildAgentPerformanceInspectionPrompt({
      agentPerformanceInspection: {
        agentName: 'Kip',
        configuredRole: 'Lead',
        actingRole: 'Lead',
        dialogTitle: 'Finding the Plot',
        source: 'derived_from_legacy',
        facts: [
          { label: 'Cast', value: 'Cloud · Rendr · Ceox', recorded: true },
          { label: 'Expression emitted', value: 'Summary', recorded: true },
        ],
        layers: [
          { label: 'Lead Judgment', status: 'not_recorded' },
          { label: 'Orchestration', status: 'recorded', detail: 'multi-Cast' },
        ],
        instruction: 'Inspect only.',
      },
    });
    expect(prompt).toMatch(/PERFORMANCE INSPECTION/);
    expect(prompt).toMatch(/Finding the Plot/);
    expect(prompt).toMatch(/Cloud · Rendr · Ceox/);
    expect(prompt).toMatch(/Recorded on this turn/);
    expect(prompt).toMatch(/Not recorded for this performance/);
    expect(prompt).toMatch(/Inspect only/);
    expect(prompt).toMatch(/Human authorization is required/);
    expect(prompt).not.toMatch(/chain-of-thought/i);
  });

  it('returns null without inspection payload', () => {
    expect(buildAgentPerformanceInspectionPrompt({})).toBeNull();
    expect(buildAgentPerformanceInspectionPrompt(undefined)).toBeNull();
  });

  it('grounds Training on the focused voice-prompt frame', () => {
    const prompt = buildAgentTrainingPrompt({
      agentTraining: {
        agentName: 'Kip',
        frame: 'currently',
        frameLabel: 'Currently',
        frameIntent: 'What this Agent is doing now',
      },
    });
    expect(prompt).toMatch(/TRAINING/);
    expect(prompt).toMatch(/Currently/);
    expect(prompt).toMatch(/the human Saves/);
  });

  it('collects inspection before training when both are present', () => {
    const prompts = collectAgentBoardContextPrompts({
      agentPerformanceInspection: { agentName: 'Kip', facts: [], layers: [] },
      agentTraining: { agentName: 'Kip', frameLabel: 'Identity' },
    });
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toMatch(/PERFORMANCE INSPECTION/);
    expect(prompts[1]).toMatch(/TRAINING/);
  });
});
