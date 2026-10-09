import { describe, expect, it } from 'vitest';
import { attachmentsFromMetadata, formatDialogDocumentPrompt } from './dialogAttachmentContext.js';

describe('dialog attachment context', () => {
  it('keeps a stored document available without a new upload', () => {
    const stored = attachmentsFromMetadata({
      attachments: [{
        url: 'https://blob.example/truth.md',
        name: 'Keeper_Operational_Truth.md',
        type: 'file',
        extractedText: 'Version 0.3\n\n### OT01 — Public Domain route',
      }],
    });
    const prompt = formatDialogDocumentPrompt(stored);
    expect(prompt).toContain('OT01');
    expect(prompt).toContain('Do not ask the human to re-upload');
    expect(prompt).not.toContain('https://blob.example');
  });

  it('says when a stored file has no text', () => {
    const prompt = formatDialogDocumentPrompt([{
      url: 'https://blob.example/brief.docx',
      name: 'brief.docx',
      type: 'file',
      extractNote: 'This Word file had no readable paragraph text.',
    }]);
    expect(prompt).toContain('no readable paragraph text');
  });
});
