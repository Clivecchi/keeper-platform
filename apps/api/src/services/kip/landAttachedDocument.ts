/**
 * When the human attaches writing and says the Document was updated,
 * land that file in the focused Dialog. The model does not have to emit a Point.
 */

import {
  humanRequestsAttachedDocument,
  isDocxDocument,
  isReadableTextDocument,
} from '@keeper/shared';
import { readDialogAttachment } from './dialogAttachmentContext.js';
import {
  ingestExternalDocument,
  IngestExternalDocumentError,
} from './ingestExternalDocument.js';

export type AttachedDocumentReceipt = {
  type: 'document.ingest';
  status: 'success' | 'error';
  message: string;
  errorCode?: string;
  data?: {
    draftId?: string;
    draft?: { id: string; title: string; kind: string; key: string };
    dialogId?: string;
    appendedCount?: number;
    pointCount?: number;
    fileName?: string;
  };
};

export type LandedAttachedDocument = {
  receipt: AttachedDocumentReceipt;
  promptNote: string | null;
};

type AttachmentInput = { url: string; name: string; type: 'image' | 'file' };

function isLandableFile(attachment: AttachmentInput): boolean {
  if (attachment.type !== 'file' || !attachment.url?.trim()) return false;
  const name = attachment.name || attachment.url;
  return isReadableTextDocument(name) || isDocxDocument(name);
}

function fileTitle(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() ?? name.trim();
  return base.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || base;
}

export function attachedDocumentPromptNote(input: {
  fileName: string;
  appendedCount: number;
  pointCount: number;
}): string {
  return [
    'ATTACHED WRITING IS NOW THIS DOCUMENT.',
    `Keeper brought “${input.fileName}” into this Dialog (${input.appendedCount} points; ${input.pointCount} in the Document).`,
    'The Document exists. Do not say it was not created. Do not hunt GitHub for a stand-in file.',
    'Say what landed, then do the next unfinished action the writing names.',
  ].join('\n');
}

export async function landAttachedDocumentOnTurn(input: {
  domainId: string;
  userId: string;
  dialogId: string;
  humanText: string;
  attachments: readonly AttachmentInput[];
}): Promise<LandedAttachedDocument | null> {
  if (!humanRequestsAttachedDocument(input.humanText)) return null;
  const files = input.attachments.filter(isLandableFile);
  if (!files.length) return null;

  let appendedCount = 0;
  let pointCount = 0;
  let manuscriptId = '';
  let dialogTitle = '';
  const names: string[] = [];
  let truncated = false;

  for (const file of files) {
    const read = await readDialogAttachment(file);
    const markdown = read.extractedText?.trim() ?? '';
    if (!markdown) {
      return {
        receipt: {
          type: 'document.ingest',
          status: 'error',
          message: read.extractNote || `“${file.name}” had no writing to bring in.`,
          errorCode: 'EMPTY_ATTACHMENT',
          data: { fileName: file.name, dialogId: input.dialogId },
        },
        promptNote: null,
      };
    }
    try {
      const landed = await ingestExternalDocument({
        domainId: input.domainId,
        userId: input.userId,
        dialogId: input.dialogId,
        markdown,
        title: fileTitle(file.name),
        source: file.name,
        announceInDialog: false,
      });
      appendedCount += landed.appendedCount;
      pointCount = landed.pointCount;
      manuscriptId = landed.manuscriptId;
      dialogTitle = landed.dialogTitle;
      names.push(file.name);
      truncated = truncated || landed.truncated;
    } catch (error) {
      const message =
        error instanceof IngestExternalDocumentError
          ? error.message
          : 'The attached writing could not be brought into this Document.';
      return {
        receipt: {
          type: 'document.ingest',
          status: 'error',
          message,
          errorCode: error instanceof IngestExternalDocumentError ? error.code : 'INGEST_FAILED',
          data: { fileName: file.name, dialogId: input.dialogId },
        },
        promptNote: null,
      };
    }
  }

  const fileName = names.length === 1 ? names[0]! : `${names.length} files`;
  const tail = truncated ? ' The file was longer than one Document pass, so later sections were left out.' : '';
  const message = `Brought “${fileName}” into this Document — ${appendedCount} point${appendedCount === 1 ? '' : 's'}.${tail}`;
  return {
    receipt: {
      type: 'document.ingest',
      status: 'success',
      message,
      data: {
        draftId: manuscriptId,
        draft: {
          id: manuscriptId,
          title: dialogTitle,
          kind: 'document_manuscript',
          key: 'document',
        },
        dialogId: input.dialogId,
        appendedCount,
        pointCount,
        fileName,
      },
    },
    promptNote: attachedDocumentPromptNote({ fileName, appendedCount, pointCount }),
  };
}
