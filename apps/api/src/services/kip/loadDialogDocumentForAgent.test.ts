import { describe, expect, it } from 'vitest';
import { buildDialogReadHonesty } from './loadDialogDocumentForAgent.js';

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
