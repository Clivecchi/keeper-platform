import { describe, expect, it } from 'vitest';
import { isQuestionMap } from '../../services/TypeSafeProvider.js';
import { architectureContextCharCount, KEEPER_XRAY_ARCHITECTURE_CONTEXT } from './architectureContext.js';
import { KEEPER_XRAY_QUESTIONS, toTypeSafeQuestions } from './questions.js';
import { answersFromTypeSafe, buildCodeMap, confidenceBand, parseChoiceAnswer } from './report.js';
import { extractExport, extractMarker, KEEPER_XRAY_UNIT_CATALOG } from './selectUnits.js';

describe('Jev codebase X-ray harness', () => {
  it('keeps a bounded Choice question map TypeSafe can evaluate in one call', () => {
    expect(KEEPER_XRAY_QUESTIONS).toHaveLength(30);
    expect(KEEPER_XRAY_QUESTIONS.filter((row) => row.family === 'discovery')).toHaveLength(4);
    const questions = toTypeSafeQuestions();
    expect(isQuestionMap(questions)).toBe(true);
    expect(Object.keys(questions)).toHaveLength(30);
    expect(questions.participatesStage?.type).toBe('choice');
    expect(questions.capabilityRole?.type).toBe('choice');
  });

  it('keeps architecture context compact and Domain/Stage/capability literate', () => {
    expect(architectureContextCharCount()).toBeLessThan(2500);
    expect(KEEPER_XRAY_ARCHITECTURE_CONTEXT.scope).toContain('Domain-scoped');
    expect(KEEPER_XRAY_ARCHITECTURE_CONTEXT.objects.Stage).toContain('Not the story');
    expect(KEEPER_XRAY_ARCHITECTURE_CONTEXT.agency.rule).toContain('not capability knowledge');
  });

  it('extracts an export or marker window instead of dumping a sibling', () => {
    const source = [
      'export function keep(): void { return; }',
      'export function leftover(): void { return; }',
      "        case 'stage.story.layout': {",
      '          await layout();',
      '          break;',
      '        }',
    ].join('\n');
    expect(extractExport(source, 'keep')).toContain('function keep');
    expect(extractExport(source, 'keep')).not.toContain('leftover');
    const window = extractMarker(source, "case 'stage.story.layout':", 1, 2);
    expect(window).toContain('stage.story.layout');
    expect(window).not.toContain('function keep');
  });

  it('preserves confidence and builds Code Map views from Jev answers', () => {
    expect(confidenceBand(0.81)).toBe('high');
    expect(confidenceBand(0.5)).toBe('medium');
    expect(confidenceBand(0.2)).toBe('low');
    const parsed = parseChoiceAnswer({
      type: 'choice',
      choice: 'yes',
      confidence: 0.88,
      probabilities: { yes: 0.9, no: 0.05, unclear: 0.05 },
    });
    expect(parsed).toMatchObject({ answer: 'yes', confidence: 0.88 });

    const answers = answersFromTypeSafe(
      {
        participatesStage: { type: 'choice', choice: 'yes', confidence: 0.91 },
        silentSuccess: { type: 'choice', choice: 'likely', confidence: 0.77 },
        architectureAlignment: { type: 'choice', choice: 'legacy', confidence: 0.8 },
        grantAsKnowledge: { type: 'choice', choice: 'likely', confidence: 0.7 },
        mutationKind: { type: 'choice', choice: 'keeper-data', confidence: 0.86 },
      },
      [
        { id: 'participatesStage', instructions: 'Stage?', family: 'object' },
        { id: 'silentSuccess', instructions: 'Silent?', family: 'mutation' },
        { id: 'architectureAlignment', instructions: 'Align?', family: 'drift' },
        { id: 'grantAsKnowledge', instructions: 'Grant?', family: 'discovery' },
        { id: 'mutationKind', instructions: 'Mutate?', family: 'mutation' },
      ],
    );

    const map = buildCodeMap({
      units: [
        {
          path: 'apps/api/src/services/kip/layoutStageStory.ts',
          symbol: 'layoutStageStory',
          unitType: 'function',
          truncated: false,
          charCount: 100,
          ok: true,
          model: 'jev-latest',
          durationMs: 12,
          answers,
        },
      ],
      model: 'jev-latest',
      durationMs: 12,
      keySource: 'env',
      questionCount: 30,
    });

    expect(map.views.stage[0]?.symbol).toBe('layoutStageStory');
    expect(map.views.mutation[0]?.answer).toBe('keeper-data');
    expect(map.views.reliabilitySeams[0]?.answer).toBe('likely');
    expect(map.views.legacy[0]?.answer).toBe('legacy');
    expect(map.views.capabilityLiteracySeams[0]?.questionId).toBe('grantAsKnowledge');
    expect(map.discovery).toHaveLength(1);
    expect(KEEPER_XRAY_UNIT_CATALOG.length).toBeGreaterThan(20);
  });
});
