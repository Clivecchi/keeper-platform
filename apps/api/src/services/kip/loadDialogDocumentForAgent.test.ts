import { describe, expect, it } from 'vitest';
import {
  buildDialogReadHonesty,
  formatDialogDocumentForAgent,
} from './loadDialogDocumentForAgent.js';

describe('buildDialogReadHonesty', () => {
  it('treats empty Points as an unbuilt Document', () => {
    const result = buildDialogReadHonesty(0);
    expect(result.documentUnbuilt).toBe(true);
    expect(result.honesty).toContain('Document is unbuilt');
    expect(result.honesty).toContain('Do not claim you read a body');
  });

  it('reports a live Document when Points exist', () => {
    const result = buildDialogReadHonesty(3);
    expect(result.documentUnbuilt).toBe(false);
    expect(result.honesty).toContain('3 Point');
    expect(result.honesty).toContain('Chronicle');
  });
});

describe('formatDialogDocumentForAgent', () => {
  it('lists Points under the Section they already belong to', () => {
    const prompt = formatDialogDocumentForAgent({
      dialogId: 'dlg-1',
      title: 'Finding the Plot',
      paths: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
      points: [
        { prelude: 'The plot', preview: 'First finding about the plot.', pathGroupId: 'plot' },
        { prelude: 'UI notes', preview: 'UI notes that wandered in.', pathGroupId: 'stage' },
        { prelude: 'Loose beat', preview: 'Not placed yet.' },
      ],
    });
    expect(prompt).toContain('The Plot');
    expect(prompt).toContain('  1. The plot — First finding about the plot.');
    expect(prompt).toContain('Keeper Stage');
    expect(prompt).toContain('  2. UI notes — UI notes that wandered in.');
    expect(prompt).toContain('Open (quieter Section — only for Points that do not yet fit)');
    expect(prompt).toContain('  3. Loose beat — Not placed yet.');
    expect(prompt).toContain('evidence, not a lock');
    expect(prompt).toContain('Never dump named work into Open');
    expect(prompt).toContain('Orientation — not written yet');
  });

  it('puts a stored Orientation in the standing block with landmarks', () => {
    const prompt = formatDialogDocumentForAgent({
      dialogId: 'dlg-1',
      orientation: { body: 'Read Point 1 in The Plot.', updatedBy: 'Kip' },
      paths: [{ id: 'plot', title: 'The Plot' }],
      points: [
        { prelude: 'The plot', preview: 'First finding about the plot.', pathGroupId: 'plot' },
      ],
    });
    expect(prompt).toContain('Read Point 1 in The Plot.');
    expect(prompt).toContain('Point 1 — The plot');
    expect(prompt).toContain('last set by Kip');
    expect(prompt).toContain('not a turn summary');
  });

  it('names the next dialog.read offset when Points continue past the standing list', () => {
    const points = Array.from({ length: 81 }, (_, index) => ({
      prelude: `Point ${index + 1}`,
      preview: `Body ${index + 1}`,
      pathGroupId: 'plot',
    }));
    const prompt = formatDialogDocumentForAgent({
      dialogId: 'dlg-1',
      paths: [{ id: 'plot', title: 'The Plot' }],
      points,
    });
    expect(prompt).toContain('80. Point 80 — Body 80');
    expect(prompt).not.toContain('81. Point 81');
    expect(prompt).toContain('dialog.read with offset 80');
  });
});
