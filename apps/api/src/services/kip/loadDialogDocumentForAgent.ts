/**
 * Load Dialog Document cover + manuscript Points for agent generation context.
 * Mirrors Chronicle's DomainRealmStory read path — same fields, agent-facing summary.
 */

import { prisma } from '@keeper/database';
import {
  DOCUMENT_OPEN_SECTION,
  isAuthoredDocumentForward,
  isOpenSectionId,
  parseDocumentPathDeclarations,
  resolveDocumentForward,
  summarizeDraftPointsForAgent,
} from '@keeper/shared';

export type AgentDialogDocument = {
  dialogId: string;
  title?: string;
  status?: string;
  forward?: { title: string; description: string };
  forwardAuthored?: boolean;
  step?: { title: string; body: string };
  paths: ReturnType<typeof parseDocumentPathDeclarations>;
  points: ReturnType<typeof summarizeDraftPointsForAgent>;
  manuscriptDraftId?: string;
  titleSource?: string | null;
};

export type DialogReadHonesty = {
  documentUnbuilt: boolean;
  honesty: string;
};

export type DialogDocumentPromptInput = {
  dialogId: string;
  title?: string;
  status?: string;
  forward?: { title: string; description: string };
  forwardAuthored?: boolean;
  step?: { title: string; body: string };
  paths?: Array<{ id: string; title: string; prelude?: string }>;
  points?: Array<{
    preview?: string;
    prelude?: string;
    status?: string;
    referencesPointId?: string;
    pathGroupId?: string;
  }>;
  manuscriptDraftId?: string;
};

function formatPointLine(
  index: number,
  point: NonNullable<DialogDocumentPromptInput['points']>[number],
): string {
  const title = typeof point.prelude === 'string' ? point.prelude.trim() : '';
  const preview = typeof point.preview === 'string' ? point.preview.trim() : '';
  const body = title && preview && title !== preview
    ? `${title} — ${preview}`
    : title || preview;
  const waiting = point.status === 'proposed' ? '[proposed] ' : '';
  return body ? `${index}. ${waiting}${body}` : `${index}.`;
}

/**
 * Agent-facing Document body. Points stay numbered 1–N in Document order
 * and are listed under the Section they already belong to.
 */
export function formatDialogDocumentForAgent(doc: DialogDocumentPromptInput): string {
  const lines = [
    'DIALOG DOCUMENT (live Document for this Dialog — same source Chronicle renders):',
    `Dialog id: ${doc.dialogId}${doc.title ? ` — ${doc.title}` : ''}${doc.status ? ` [${doc.status}]` : ''}`,
  ];
  if (doc.manuscriptDraftId) {
    lines.push(
      'Keeper will write new Points to this Dialog manuscript — omit payload.id on draft.update.propose.',
    );
  }
  if (doc.forward) {
    const unwritten = doc.forwardAuthored === false;
    lines.push(
      unwritten
        ? `Forward (directional objective of this Dialog) — slot present${
            doc.forward.title ? ` (holding “${doc.forward.title}”)` : ''
          }; the objective is not written yet.`
        : `Forward (directional objective of this Dialog) — ${doc.forward.title}: ${doc.forward.description}`,
    );
  } else {
    lines.push(
      'Forward (directional objective of this Dialog) — not written yet. Every Document can have a Forward.',
    );
  }
  if (doc.step) {
    lines.push(`Step — ${doc.step.title}: ${doc.step.body}`);
  }

  const hosts = (doc.points ?? []).filter((point) => !point.referencesPointId);
  const numbered = hosts.slice(0, 80).map((point, index) => ({ point, n: index + 1 }));
  const sections = doc.paths ?? [];

  if (sections.length > 0) {
    lines.push(
      'Sections (Point number is Chronicle identity — use it in actions). This is the current Document — evidence, not a lock. When you propose a better one, nest or set sectionId to the Section each Point should belong to. Omit sectionId only when you are not moving that Point. Never dump named work into Open.',
    );
    for (const section of sections) {
      const members = numbered.filter((row) => row.point.pathGroupId === section.id);
      lines.push(`${section.title}`);
      if (members.length === 0) {
        lines.push('  (empty)');
      } else {
        for (const row of members) {
          lines.push(`  ${formatPointLine(row.n, row.point)}`);
        }
      }
    }
    const openMembers = numbered.filter(
      (row) =>
        isOpenSectionId(row.point.pathGroupId)
        || !sections.some((section) => section.id === row.point.pathGroupId),
    );
    lines.push(`${DOCUMENT_OPEN_SECTION.title} (quieter Section — only for Points that do not yet fit)`);
    if (openMembers.length === 0) {
      lines.push('  (empty)');
    } else {
      for (const row of openMembers) {
        lines.push(`  ${formatPointLine(row.n, row.point)}`);
      }
    }
  } else if (numbered.length > 0) {
    lines.push(
      'Sections: Open (quieter Section for Points that do not yet fit). Name Sections when you reorganize — do not leave a Document as Open-only.',
    );
    lines.push(
      `Points (${numbered.length} — refer to existing ones by number or title; Keeper owns ids):`,
    );
    for (const row of numbered) {
      lines.push(formatPointLine(row.n, row.point));
    }
  } else {
    lines.push('Sections: Open (quieter Section for Points that do not yet fit).');
    lines.push('Points: (none loaded for this Dialog manuscript yet).');
  }

  lines.push(
    'Point title is prelude — a short label that tells the story of the Point (e.g. "Agent Narrates, Doesn\'t Act"), not a cut of the body. Always set prelude/title on new Points. To rename: draft.point.rewrite with pointId set to the number (1, 2, 3…) or the current title; prelude is the new title; omit content to keep the body. To Gloss a Point (depth beside it, not a rewrite): gloss.append with pointId 1–N or the current title, and content. Do not weave Gloss into the Point body. The Dialog id above is not a Point id.',
    'This Document is the primary conversational background. Stay aware of the Domain. If Working on is a Draft, do not treat this manuscript as the Point write target.',
    'When the user asks about this Dialog\'s Document, Forward, Sections, or Points, use this block — do not claim the Document is absent when fields above are present.',
    'When asked to pick or name one item from a Section, reply with an exact Point title/preview from this block only. If you cannot match a real Point, say you cannot find that item — do not invent a name.',
  );
  return lines.join('\n');
}

/** Empty Points = unbuilt Document. Agents must not claim they read a body. */
export function buildDialogReadHonesty(pointCount: number): DialogReadHonesty {
  if (pointCount <= 0) {
    return {
      documentUnbuilt: true,
      honesty:
        'Document is unbuilt — no Points loaded. Do not claim you read a body. Report the title and say the Document has no Points yet.',
    };
  }
  return {
    documentUnbuilt: false,
    honesty: `Document has ${pointCount} Point(s) — same source Chronicle renders. Use these Points; do not invent others.`,
  };
}

export async function loadDialogDocumentForAgent(
  dialogId: string,
  domainId: string,
): Promise<AgentDialogDocument | null> {
  const dialog = await prisma.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId },
    select: {
      id: true,
      title: true,
      title_source: true,
      document_status: true,
      forward_title: true,
      forward_description: true,
      step_title: true,
      step_body: true,
      document_paths: true,
    },
  });
  if (!dialog) return null;

  const stepTitle = dialog.step_title?.trim() ?? '';
  const stepBody = dialog.step_body?.trim() ?? '';
  const forward = resolveDocumentForward({
    forwardTitle: dialog.forward_title,
    forwardDescription: dialog.forward_description,
    dialogTitle: dialog.title,
  });

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
    ...(dialog.title_source ? { titleSource: dialog.title_source } : {}),
    ...(dialog.title?.trim() ? { title: dialog.title.trim() } : {}),
    ...(dialog.document_status ? { status: dialog.document_status } : {}),
    forward,
    forwardAuthored: isAuthoredDocumentForward({
      forwardTitle: dialog.forward_title,
      forwardDescription: dialog.forward_description,
    }),
    ...(stepTitle && stepBody
      ? { step: { title: stepTitle, body: stepBody } }
      : {}),
    paths: parseDocumentPathDeclarations(dialog.document_paths),
    points,
    ...(manuscript?.id ? { manuscriptDraftId: manuscript.id } : {}),
  };
}
