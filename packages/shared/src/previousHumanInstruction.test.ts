import { describe, expect, it } from 'vitest';
import {
  formatPreviousHumanInstruction,
  refersToPreviousHumanInstruction,
} from './previousHumanInstruction.js';

describe('refersToPreviousHumanInstruction', () => {
  it('hears a pointer at the earlier sentence', () => {
    expect(refersToPreviousHumanInstruction('Refer to previous prompt. Use the new file.')).toBe(true);
    expect(refersToPreviousHumanInstruction('Continue the objective from my opening prompt.')).toBe(true);
  });

  it('stays quiet when this sentence is the whole request', () => {
    expect(refersToPreviousHumanInstruction('Update the document from the attachment.')).toBe(false);
  });
});

describe('formatPreviousHumanInstruction', () => {
  it('quotes the earlier sentence beside the aim', () => {
    const block = formatPreviousHumanInstruction('Cloud must inspect the receipt path.');
    expect(block).toContain('PREVIOUS HUMAN INSTRUCTION');
    expect(block).toContain('The aim is still the task.');
    expect(block).toContain('"Cloud must inspect the receipt path."');
  });
});
