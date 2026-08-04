/**
 * Dialog Document read helpers for MCP (dialog.ro).
 * Reuses agent document load + ensures a gloss carrier kip_message when needed.
 */
import { prisma } from '@keeper/database';
import type { Prisma } from '@keeper/database';
import type { GlossAnchor } from '@keeper/shared';
import { loadDialogDocumentForAgent } from './kip/loadDialogDocumentForAgent.js';
import { resolveDomainLeadAgentFromDomain } from './domains/resolveDomainLeadAgent.js';
import { resolveMcpDomainLabel } from '../mcp/domainContext.js';

const DIALOG_LIST_SELECT = {
  id: true,
  title: true,
  document_status: true,
  forward_title: true,
  step_title: true,
  updated_at: true,
  created_at: true,
} as const;

export type DialogMcpListItem = {
  id: string;
  title: string;
  documentStatus: string;
  forwardTitle: string | null;
  stepTitle: string | null;
  updatedAt: string;
  createdAt: string;
};

function toListItem(row: {
  id: string;
  title: string;
  document_status: string;
  forward_title: string | null;
  step_title: string | null;
  updated_at: Date;
  created_at: Date;
}): DialogMcpListItem {
  return {
    id: row.id,
    title: row.title,
    documentStatus: row.document_status,
    forwardTitle: row.forward_title,
    stepTitle: row.step_title,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export class DialogMcpService {
  static async listDialogs(params: {
    domainId: string;
    limit?: number;
    status?: string;
  }): Promise<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    dialogs: DialogMcpListItem[];
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 50);
    const status = params.status?.trim();
    const rows = await prisma.dialog.findMany({
      where: {
        domain_id: params.domainId,
        is_archived: false,
        ...(status ? { document_status: status } : {}),
      },
      select: DIALOG_LIST_SELECT,
      orderBy: { updated_at: 'desc' },
      take: limit,
    });
    return { ...domain, dialogs: rows.map(toListItem) };
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
    dialogs: DialogMcpListItem[];
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const query = params.query.trim();
    if (!query) throw new Error('query is required');
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 20);

    const rows = await prisma.dialog.findMany({
      where: {
        domain_id: params.domainId,
        is_archived: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { forward_title: { contains: query, mode: 'insensitive' } },
          { step_title: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: DIALOG_LIST_SELECT,
      orderBy: { updated_at: 'desc' },
      take: limit,
    });

    return { ...domain, query, dialogs: rows.map(toListItem) };
  }

  /**
   * Read Dialog Document state for MCP + ensure a gloss carrier messageId.
   * Carrier creation is the minimal write needed so gloss.rw works without a prior Discuss turn.
   */
  static async readDialog(params: {
    domainId: string;
    dialogId: string;
    userId?: string | null;
  }): Promise<{
    domainId: string;
    domainName: string;
    domainSlug: string;
    document: NonNullable<Awaited<ReturnType<typeof loadDialogDocumentForAgent>>>;
    messageId: string;
    glossCarrier: {
      messageId: string;
      created: boolean;
      sessionId: string;
    };
    suggestedAnchor: GlossAnchor;
  }> {
    const domain = await resolveMcpDomainLabel(params.domainId);
    const dialogId = params.dialogId.trim();
    if (!dialogId) throw new Error('dialogId is required');

    const document = await loadDialogDocumentForAgent(dialogId, params.domainId);
    if (!document) {
      throw new Error(`Dialog document not found in domain: ${dialogId}`);
    }

    const glossCarrier = await this.ensureGlossCarrierMessage({
      domainId: params.domainId,
      dialogId,
      userId: params.userId,
    });

    const suggestedAnchor: GlossAnchor = document.manuscriptDraftId
      ? {
          entityKind: 'draft',
          entityId: document.manuscriptDraftId,
          ...(document.points[0]?.id ? { nodeId: document.points[0].id } : {}),
          messageId: glossCarrier.messageId,
        }
      : {
          entityKind: 'dialog',
          entityId: dialogId,
          messageId: glossCarrier.messageId,
        };

    return {
      ...domain,
      document,
      messageId: glossCarrier.messageId,
      glossCarrier,
      suggestedAnchor,
    };
  }

  /**
   * Find or create a kip_message that can own glossThreads for this Dialog.
   */
  static async ensureGlossCarrierMessage(params: {
    domainId: string;
    dialogId: string;
    userId?: string | null;
  }): Promise<{ messageId: string; created: boolean; sessionId: string }> {
    const dialog = await prisma.dialog.findFirst({
      where: { id: params.dialogId, domain_id: params.domainId },
      select: { id: true, user_id: true, title: true },
    });
    if (!dialog) {
      throw new Error(`Dialog not found in domain: ${params.dialogId}`);
    }

    const tagged = await prisma.kip_messages.findFirst({
      where: {
        kip_sessions: {
          dialog_id: dialog.id,
          is_archived: false,
        },
        metadata: {
          path: ['mcpGlossCarrier'],
          equals: true,
        },
      },
      select: { id: true, session_id: true },
      orderBy: { created_at: 'desc' },
    });
    if (tagged) {
      return {
        messageId: tagged.id,
        created: false,
        sessionId: tagged.session_id,
      };
    }

    // Prefer an existing user message on a Dialog session (Discuss path).
    const existingUser = await prisma.kip_messages.findFirst({
      where: {
        role: 'user',
        kip_sessions: {
          dialog_id: dialog.id,
          is_archived: false,
        },
      },
      select: { id: true, session_id: true },
      orderBy: { created_at: 'desc' },
    });
    if (existingUser) {
      return {
        messageId: existingUser.id,
        created: false,
        sessionId: existingUser.session_id,
      };
    }

    const session = await this.ensureDialogSession({
      domainId: params.domainId,
      dialogId: dialog.id,
      userId: params.userId ?? dialog.user_id,
    });

    const metadata: Prisma.InputJsonValue = {
      mcpGlossCarrier: true,
      purpose: 'mcp_gloss_carrier',
      dialogId: dialog.id,
    };

    const message = await prisma.kip_messages.create({
      data: {
        session_id: session.id,
        sender: 'mcp',
        role: 'user',
        content: `[MCP gloss carrier for Dialog "${dialog.title}"]`,
        metadata,
      },
      select: { id: true, session_id: true },
    });

    return {
      messageId: message.id,
      created: true,
      sessionId: message.session_id,
    };
  }

  private static async ensureDialogSession(params: {
    domainId: string;
    dialogId: string;
    userId?: string | null;
  }): Promise<{ id: string }> {
    const existing = await prisma.kip_sessions.findFirst({
      where: {
        dialog_id: params.dialogId,
        is_archived: false,
      },
      select: { id: true },
      orderBy: { updated_at: 'desc' },
    });
    if (existing) return existing;

    const domain = await prisma.domain.findUnique({
      where: { id: params.domainId },
      select: {
        id: true,
        slug: true,
        frame_json: true,
        settings: true,
        ownerId: true,
      },
    });
    if (!domain) throw new Error(`Domain not found: ${params.domainId}`);

    const lead = await resolveDomainLeadAgentFromDomain(prisma, domain);
    if (!lead) {
      throw new Error(
        `No lead agent for domain ${domain.slug}; cannot create gloss carrier session`,
      );
    }

    const userId = (params.userId?.trim() || domain.ownerId).trim();
    if (!userId) {
      throw new Error('userId is required to create a gloss carrier session');
    }

    return prisma.kip_sessions.create({
      data: {
        agent_id: lead.id,
        user_id: userId,
        dialog_id: params.dialogId,
        session_name: `MCP gloss · ${params.dialogId}`,
        topic: 'mcp_gloss_carrier',
      },
      select: { id: true },
    });
  }
}
