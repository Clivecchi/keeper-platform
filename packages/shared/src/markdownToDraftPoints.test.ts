import { describe, expect, it } from 'vitest';
import { markdownToDraftPoints, INGEST_MAX_POINTS } from './markdownToDraftPoints.js';

describe('markdownToDraftPoints', () => {
  it('splits one Point per heading', () => {
    const result = markdownToDraftPoints(
      '# Spec\n\nIntro paragraph.\n\n## Task 1\n\nDo the thing.\n\n## Task 2\n\nDo the other thing.',
      { proposedBy: 'ingest' },
    );
    expect(result.title).toBe('Spec');
    expect(result.points).toHaveLength(3);
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks.map((block) => block.level)).toEqual([1, 2, 2]);
    expect(result.points[0]?.prelude).toBe('Spec');
    expect(result.points[0]?.content).toContain('Intro paragraph');
    expect(result.points[1]?.prelude).toBe('Task 1');
    expect(result.points[1]?.status).toBe('accepted');
    expect(result.points[2]?.prelude).toBe('Task 2');
  });

  it('treats heading-less markdown as a single Point', () => {
    const result = markdownToDraftPoints('Just a note from an outside session.', {
      proposedBy: 'Claude',
    });
    expect(result.title).toBe('Just a note from an outside session.');
    expect(result.points).toHaveLength(1);
    expect(result.points[0]?.proposedBy).toBe('Claude');
    expect(result.points[0]?.content).toContain('Just a note');
  });

  it('keeps preamble before the first heading as Opening', () => {
    const result = markdownToDraftPoints(
      'A short lead-in.\n\n## Later\n\nThe rest.',
      { proposedBy: 'ingest' },
    );
    expect(result.points[0]?.prelude).toBe('Opening');
    expect(result.points[0]?.content).toContain('lead-in');
    expect(result.points[1]?.prelude).toBe('Later');
  });

  it('returns no points for empty input', () => {
    const result = markdownToDraftPoints('   \n', { proposedBy: 'ingest' });
    expect(result.points).toHaveLength(0);
    expect(result.blocks).toHaveLength(0);
    expect(result.title).toBe('Brought in writing');
    expect(result.truncated).toBe(false);
  });

  it('flags truncation after INGEST_MAX_POINTS sections', () => {
    const headings = Array.from({ length: INGEST_MAX_POINTS + 2 }, (_, i) => `## S${i + 1}\n\nBody ${i + 1}.`).join('\n\n');
    const result = markdownToDraftPoints(headings, { proposedBy: 'ingest' });
    expect(result.points).toHaveLength(INGEST_MAX_POINTS);
    expect(result.truncated).toBe(true);
  });
});
