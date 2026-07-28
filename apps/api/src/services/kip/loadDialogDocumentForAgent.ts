/**
 * Load Dialog Document cover + manuscript Points for agent generation context.
 * Mirrors Chronicle's DomainRealmStory read path — same fields, agent-facing summary.
 */

import { prisma } from '@keeper/database';
import {
  parseDocumentPathDeclarations,
  summarizeDraftPointsForAgent,
} from '@keeper/shared';

export type AgentDialogDocument = {
  dialogId: string;
  title?: string;
  status?: string;
  forward?: { title: string; description: string };
  step?: { title: string; body: string };
  paths: ReturnType<typeof parseDocumentPathDeclarations>;
  points: ReturnType<typeof summarizeDraftPointsForAgent>;
  manuscriptDraftId?: string;
};

export async function loadDialogDocumentForAgent(
  dialogId: string,
  domainId: string,
): Promise<AgentDialogDocument | null> {
  const dialog = await prisma.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId },
    select: {
      id: true,
      title: true,
      document_status: true,
      forward_title: true,
      forward_description: true,
      step_title: true,
      step_body: true,
      document_paths: true,
    },
  });
  if (!dialog) return null;

  const forwardTitle = dialog.forward_title?.trim() ?? '';
  const forwardDescription = dialog.forward_description?.trim() ?? '';
  const stepTitle = dialog.step_title?.trim() ?? '';
  const stepBody = dialog.step_body?.trim() ?? '';

  const manuscripts = await prisma.kip_drafts.findMany({
    where: {
      dialog_id: dialogId,
      domain_id: domainId,
      kind: 'document_manuscript',
      status: { notIn: ['promoted', 'archived'] },
    },
    select: { id: true, title: true, spec_json: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
    take: 3,
  });

  const manuscript = manuscripts[0];
  // Document manuscript is a living work tool — Lead may rewrite accepted Points.
  const points = manuscript
    ? summarizeDraftPointsForAgent(manuscript.spec_json, {
        treatAcceptedAsRewritable: true,
      })
    : [];

  return {
    dialogId: dialog.id,
    ...(dialog.title?.trim() ? { title: dialog.title.trim() } : {}),
    ...(dialog.document_status ? { status: dialog.document_status } : {}),
    ...(forwardTitle && forwardDescription
      ? { forward: { title: forwardTitle, description: forwardDescription } }
      : {}),
    ...(stepTitle && stepBody
      ? { step: { title: stepTitle, body: stepBody } }
      : {}),
    paths: parseDocumentPathDeclarations(dialog.document_paths),
    points,
    ...(manuscript?.id ? { manuscriptDraftId: manuscript.id } : {}),
  };
}
