/**
 * Dialog Document read helpers for MCP (dialog.ro).
 * Strictly read-only — never creates sessions, messages, or agent replies.
 */
import { prisma } from '@keeper/database';
import type { GlossAnchor } from '@keeper/shared';
import { loadDialogDocumentForAgent } from './kip/loadDialogDocumentForAgent.js';
import { resolveMcpDomainLabel } from '../mcp/domainContext.js';

export type DialogMcpListItem = {
  id: string;
  title: string;
  entityKind: 'dialog' | 'draft';
  updatedAt: string;
};

export type DialogMcpMessagePreview = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export class DialogMcpService {
  /**
   * List Dialogs and document_manuscript drafts in the domain.
   * Shape mirrors library_list: compact id/title/updatedAt + entityKind.
   */
  static async listDialogs(params: {
    domainId: string;
    limit?: number;
  }): Promise<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    items: DialogMcpListItem[];
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 50);

    const [dialogs, drafts] = await Promise.all([
      prisma.dialog.findMany({
        where: { domain_id: params.domainId, is_archived: false },
        select: { id: true, title: true, updated_at: true },
        orderBy: { updated_at: 'desc' },
        take: limit,
      }),
      prisma.kip_drafts.findMany({
        where: {
          domain_id: params.domainId,
          kind: 'document_manuscript',
          status: { notIn: ['promoted', 'archived'] },
          dialog_id: { not: null },
        },
        select: { id: true, title: true, updated_at: true },
        orderBy: { updated_at: 'desc' },
        take: limit,
      }),
    ]);

    const items: DialogMcpListItem[] = [
      ...dialogs.map((row) => ({
        id: row.id,
        title: row.title,
        entityKind: 'dialog' as const,
        updatedAt: row.updated_at.toISOString(),
      })),
      ...drafts.map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled manuscript',
        entityKind: 'draft' as const,
        updatedAt: row.updated_at.toISOString(),
      })),
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);

    return { ...domain, items };
  }

  static async searchDialogs(params: {
    domainId: string;
    query: string;
    limit?: number;
  }): Promise<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    query: string;
    items: DialogMcpListItem[];
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const query = params.query.trim();
    if (!query) throw new Error('query is required');
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 20);

    const dialogs = await prisma.dialog.findMany({
      where: {
        domain_id: params.domainId,
        is_archived: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { forward_title: { contains: query, mode: 'insensitive' } },
          { step_title: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });

    return {
      ...domain,
      query,
      items: dialogs.map((row) => ({
        id: row.id,
        title: row.title,
        entityKind: 'dialog' as const,
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  }

  /**
   * Read a Dialog or document_manuscript draft and resolve an existing gloss carrier message.
   * Read-only: if no kip_message exists on a Dialog session, returns a clear error
   * (does not create sessions or carrier messages).
   */
  static async readDialog(params: {
    domainId: string;
    entityId: string;
    messageLimit?: number;
  }): Promise<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    entityKind: 'dialog' | 'draft';
    entityId: string;
    dialogId: string;
    title?: string;
    document: NonNullable<Awaited<ReturnType<typeof loadDialogDocumentForAgent>>>;
    messageId: string;
    suggestedAnchor: GlossAnchor;
    messages: DialogMcpMessagePreview[];
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const entityId = params.entityId.trim();
    if (!entityId) throw new Error('entityId is required');

    const resolved = await this.resolveEntityInDomain(params.domainId, entityId);
    const document = await loadDialogDocumentForAgent(resolved.dialogId, params.domainId);
    if (!document) {
      throw new Error(`Dialog document not found in domain: ${resolved.dialogId}`);
    }

    const messageLimit = Math.min(Math.max(Number(params.messageLimit ?? 8), 1), 20);
    const messages = await this.listRecentDialogMessages(resolved.dialogId, messageLimit);
    if (messages.length === 0) {
      throw new Error(
        `No kip_messages found for Dialog ${resolved.dialogId}. ` +
          'dialog_read is read-only and will not create a session or carrier message. ' +
          'Open the Dialog in Keeper and send at least one message, then retry.',
      );
    }

    const carrier = messages[0]!;
    const suggestedAnchor = this.buildSuggestedAnchor({
      entityKind: resolved.entityKind,
      entityId: resolved.entityId,
      dialogId: resolved.dialogId,
      document,
      messageId: carrier.id,
    });

    return {
      ...domain,
      entityKind: resolved.entityKind,
      entityId: resolved.entityId,
      dialogId: resolved.dialogId,
      ...(resolved.title ? { title: resolved.title } : {}),
      document,
      messageId: carrier.id,
      suggestedAnchor,
      messages,
    };
  }

  private static async resolveEntityInDomain(
    domainId: string,
    entityId: string,
  ): Promise<{
    entityKind: 'dialog' | 'draft';
    entityId: string;
    dialogId: string;
    title?: string;
  }> {
    const dialog = await prisma.dialog.findFirst({
      where: { id: entityId, domain_id: domainId, is_archived: false },
      select: { id: true, title: true },
    });
    if (dialog) {
      return {
        entityKind: 'dialog',
        entityId: dialog.id,
        dialogId: dialog.id,
        title: dialog.title,
      };
    }

    const draft = await prisma.kip_drafts.findFirst({
      where: {
        id: entityId,
        domain_id: domainId,
        kind: 'document_manuscript',
        status: { notIn: ['promoted', 'archived'] },
      },
      select: { id: true, title: true, dialog_id: true },
    });
    if (draft?.dialog_id) {
      return {
        entityKind: 'draft',
        entityId: draft.id,
        dialogId: draft.dialog_id,
        ...(draft.title?.trim() ? { title: draft.title.trim() } : {}),
      };
    }

    throw new Error(`Dialog or draft not found in domain: ${entityId}`);
  }

  private static async listRecentDialogMessages(
    dialogId: string,
    limit: number,
  ): Promise<DialogMcpMessagePreview[]> {
    const rows = await prisma.kip_messages.findMany({
      where: {
        kip_sessions: {
          dialog_id: dialogId,
          is_archived: false,
        },
      },
      select: {
        id: true,
        role: true,
        content: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content.length > 400 ? `${row.content.slice(0, 400)}…` : row.content,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private static buildSuggestedAnchor(params: {
    entityKind: 'dialog' | 'draft';
    entityId: string;
    dialogId: string;
    document: NonNullable<Awaited<ReturnType<typeof loadDialogDocumentForAgent>>>;
    messageId: string;
  }): GlossAnchor {
    if (params.entityKind === 'draft') {
      return {
        entityKind: 'draft',
        entityId: params.entityId,
        ...(params.document.points[0]?.id ? { nodeId: params.document.points[0].id } : {}),
        messageId: params.messageId,
      };
    }

    if (params.document.manuscriptDraftId) {
      return {
        entityKind: 'draft',
        entityId: params.document.manuscriptDraftId,
        ...(params.document.points[0]?.id ? { nodeId: params.document.points[0].id } : {}),
        messageId: params.messageId,
      };
    }

    return {
      entityKind: 'dialog',
      entityId: params.dialogId,
      messageId: params.messageId,
    };
  }
}
