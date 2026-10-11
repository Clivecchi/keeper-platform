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
  reconciled?: boolean;
  matchedCount?: number;
  proposedCount?: number;
  sourceTruncated?: boolean;
}): string {
  const cut = input.sourceTruncated
    ? ' The file continued past this read, so later sections were not compared and this is not the whole source.'
    : '';
  if (input.reconciled) {
    const proposed = input.proposedCount ?? 0;
    return [
      'ATTACHED WRITING WAS COMPARED WITH THIS DOCUMENT.',
      `Keeper did not add another copy of “${input.fileName}”.`,
      `${input.matchedCount ?? 0} existing Points kept their identities. ${input.pointCount} Points remain.`,
      proposed > 0
        ? `${proposed} difference${proposed === 1 ? '' : 's'} are a Review proposal. Apply is the human.`
        : 'Nothing new was proposed.',
      `${cut}`.trim(),
      'Say what matched, then do the next unfinished action the writing names.',
    ].filter(Boolean).join('\n');
  }
  return [
    'ATTACHED WRITING IS NOW THIS DOCUMENT.',
    `Keeper brought “${input.fileName}” into this Dialog (${input.appendedCount} points; ${input.pointCount} in the Document).${cut}`,
    'The Document exists. Do not say it was not created. Do not hunt GitHub for a stand-in file.',
    'Say what landed, then do the next unfinished action the writing names.',
  ].join('\n');
}

/** Later action results must not drop the ingest or compare receipt. */
export function keepLandedDocumentReceipt<T extends { type: string }>(
  results: T[],
  landed: T | null,
): T[] {
  if (!landed) return results;
  if (results.some((result) => result.type === 'document.ingest')) return results;
  return [landed, ...results];
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
  let reconciled = false;
  let matchedCount = 0;
  let proposedCount = 0;

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
        sourceTruncated: read.truncated === true,
      });
      appendedCount += landed.appendedCount;
      pointCount = landed.pointCount;
      manuscriptId = landed.manuscriptId;
      dialogTitle = landed.dialogTitle;
      names.push(file.name);
      truncated = truncated || landed.truncated || read.truncated === true;
      reconciled = reconciled || landed.reconciled === true;
      matchedCount += landed.matchedCount ?? 0;
      proposedCount += landed.proposedCount ?? 0;
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
  const tail = truncated
    ? ' The file continued past this read, so later sections were not compared and this is not the whole source.'
    : '';
  const difference = proposedCount > 0
    ? `${proposedCount} difference${proposedCount === 1 ? '' : 's'} ${proposedCount === 1 ? 'is' : 'are'} a Review proposal.`
    : 'Nothing new was proposed.';
  const message = reconciled
    ? `Compared “${fileName}” with this Document. ${matchedCount} existing Point${matchedCount === 1 ? '' : 's'} kept their identities. ${difference} Nothing was appended.${tail}`
    : `Brought “${fileName}” into this Document — ${appendedCount} point${appendedCount === 1 ? '' : 's'}.${tail}`;
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
        ...(reconciled ? { reconciled: true, matchedCount, proposedCount } : {}),
        ...(truncated ? { sourceTruncated: true } : {}),
      },
    },
    promptNote: attachedDocumentPromptNote({
      fileName,
      appendedCount,
      pointCount,
      reconciled,
      matchedCount,
      proposedCount,
      sourceTruncated: truncated,
    }),
  };
}
