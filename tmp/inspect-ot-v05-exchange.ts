/**
 * Read-only snapshot of the Keeper Operational Truth Dialog.
 * Does not update messages, Points, or Sections.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });

const { prisma } = await import('@keeper/database');

const outDir = path.join(root, 'tmp', 'ot-exchange-snapshot-2026-10-10');
mkdirSync(outDir, { recursive: true });

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function versionMarks(text: string): string[] {
  const marks = new Set<string>();
  const patterns = [
    /Version\s+0\.\d+/gi,
    /October\s+\d{1,2}\s+2026/gi,
    /Section\s+0/gi,
    /\bS20\b/g,
    /\bS21\b/g,
    /capability index/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.match(pattern) ?? []) marks.add(match);
  }
  return [...marks];
}

function hashText(text: string): string {
  return createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
}

function clip(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

const dialog = await prisma.dialog.findFirst({
  where: { title: 'Keeper Operational Truth', is_archived: false },
  select: {
    id: true,
    domain_id: true,
    title: true,
    available_to: true,
    document_status: true,
    forward_title: true,
    forward_description: true,
    step_title: true,
    step_body: true,
    orientation: true,
    document_paths: true,
    updated_at: true,
  },
});
if (!dialog) throw new Error('dialog missing');

const manuscripts = await prisma.kip_drafts.findMany({
  where: {
    dialog_id: dialog.id,
    kind: 'document_manuscript',
    status: { notIn: ['promoted', 'archived'] },
  },
  orderBy: { updated_at: 'desc' },
});

const manuscript = manuscripts[0];
if (!manuscript) throw new Error('manuscript missing');

const versions = await prisma.kip_draft_versions.findMany({
  where: { draft_id: manuscript.id },
  orderBy: { version: 'asc' },
  select: {
    id: true,
    version: true,
    created_at: true,
    title: true,
    summary: true,
    status: true,
    spec_json: true,
  },
});

function pointRows(spec: unknown) {
  const record = asRecord(spec);
  const raw = record && Array.isArray(record.points) ? record.points : [];
  return raw.map((row, index) => {
    const point = asRecord(row) ?? {};
    const content = typeof point.content === 'string' ? point.content : '';
    const prelude = typeof point.prelude === 'string' ? point.prelude : '';
    return {
      n: index + 1,
      id: typeof point.id === 'string' ? point.id : '',
      prelude,
      status: typeof point.status === 'string' ? point.status : '',
      type: typeof point.type === 'string' ? point.type : '',
      proposedBy: typeof point.proposedBy === 'string' ? point.proposedBy : '',
      createdAt: typeof point.createdAt === 'string' ? point.createdAt : '',
      updatedAt: typeof point.updatedAt === 'string' ? point.updatedAt : '',
      pathGroupId: typeof point.pathGroupId === 'string' ? point.pathGroupId : '',
      referencesPointId: typeof point.referencesPointId === 'string' ? point.referencesPointId : '',
      contentChars: content.length,
      contentHash: hashText(`${prelude}\n${content}`),
      bodyHash: hashText(content),
      preludeKey: prelude.trim().toLowerCase(),
      head: clip(content, 140),
      marks: versionMarks(`${prelude}\n${content}`),
    };
  });
}

function versionSummary(spec: unknown, meta: { version: number; created_at: Date; title: string; summary: string | null }) {
  const rows = pointRows(spec);
  const marks = new Map<string, number>();
  for (const row of rows) {
    for (const mark of row.marks) marks.set(mark, (marks.get(mark) ?? 0) + 1);
  }
  return {
    version: meta.version,
    createdAt: meta.created_at.toISOString(),
    title: meta.title,
    summary: meta.summary,
    pointCount: rows.length,
    first: rows[0] ? { n: 1, prelude: rows[0].prelude, createdAt: rows[0].createdAt } : null,
    last: rows.at(-1)
      ? { n: rows.length, prelude: rows.at(-1)!.prelude, createdAt: rows.at(-1)!.createdAt }
      : null,
    marks: Object.fromEntries(marks),
    createdBuckets: bucket(rows.map((row) => row.createdAt)),
  };
}

function bucket(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = value ? value.slice(0, 16) : '(none)';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const currentPoints = pointRows(manuscript.spec_json);
const paths = Array.isArray(dialog.document_paths) ? dialog.document_paths : [];
const pathTitles = paths.map((row) => {
  const record = asRecord(row);
  return {
    id: typeof record?.id === 'string' ? record.id : '',
    title: typeof record?.title === 'string' ? record.title : '',
    prelude: typeof record?.prelude === 'string' ? record.prelude : '',
  };
});

const byPath = new Map<string, number>();
for (const point of currentPoints) {
  const key = point.pathGroupId || '(open)';
  byPath.set(key, (byPath.get(key) ?? 0) + 1);
}

const duplicatePreludes = new Map<string, number[]>();
const duplicateBodies = new Map<string, number[]>();
for (const point of currentPoints) {
  if (point.preludeKey) {
    const list = duplicatePreludes.get(point.preludeKey) ?? [];
    list.push(point.n);
    duplicatePreludes.set(point.preludeKey, list);
  }
  if (point.bodyHash) {
    const list = duplicateBodies.get(point.bodyHash) ?? [];
    list.push(point.n);
    duplicateBodies.set(point.bodyHash, list);
  }
}

const sessions = await prisma.kip_sessions.findMany({
  where: { dialog_id: dialog.id },
  select: { id: true, created_at: true, updated_at: true, is_archived: true, session_name: true },
  orderBy: { created_at: 'asc' },
});

const messages = await prisma.kip_messages.findMany({
  where: { session_id: { in: sessions.map((row) => row.id) } },
  orderBy: { created_at: 'asc' },
  select: {
    id: true,
    session_id: true,
    role: true,
    sender: true,
    content: true,
    metadata: true,
    created_at: true,
  },
});

function attachmentFingerprint(row: unknown) {
  const record = asRecord(row);
  if (!record) return null;
  const name = typeof record.name === 'string' ? record.name : '';
  const url = typeof record.url === 'string' ? record.url : '';
  const extracted = typeof record.extractedText === 'string' ? record.extractedText : '';
  const note = typeof record.extractNote === 'string' ? record.extractNote : '';
  let urlId = '';
  try {
    const parsed = new URL(url);
    urlId = `${parsed.host}${parsed.pathname}`;
  } catch {
    urlId = url.slice(0, 80);
  }
  return {
    name,
    type: typeof record.type === 'string' ? record.type : '',
    urlPath: urlId,
    urlHash: url ? hashText(url) : '',
    extractedChars: extracted.length,
    extractNote: note,
    marks: versionMarks(extracted.slice(0, 4000)),
    declaredHead: clip(extracted, 280),
    hasSection0: /Section 0/i.test(extracted),
    hasS20: /\bS20\b/.test(extracted),
    hasS21: /\bS21\b/.test(extracted),
    hasCapabilityIndex: /capability index/i.test(extracted),
  };
}

function actionFingerprint(row: unknown) {
  const record = asRecord(row);
  if (!record) return null;
  const data = asRecord(record.data);
  const document = asRecord(data?.document);
  const points = Array.isArray(document?.points) ? document.points : null;
  const spec = asRecord(data?.spec);
  const specPoints = Array.isArray(spec?.points) ? spec.points : null;
  const point = asRecord(data?.point);
  return {
    type: typeof record.type === 'string' ? record.type : '',
    status: typeof record.status === 'string' ? record.status : '',
    message: typeof record.message === 'string' ? clip(record.message, 300) : '',
    errorCode: typeof record.errorCode === 'string' ? record.errorCode : '',
    appendedCount: typeof data?.appendedCount === 'number' ? data.appendedCount : undefined,
    pointCount: typeof data?.pointCount === 'number' ? data.pointCount : undefined,
    fileName: typeof data?.fileName === 'string' ? data.fileName : undefined,
    dialogReadPoints: points
      ? {
          count: points.length,
          withId: points.filter((item) => typeof asRecord(item)?.id === 'string' && asRecord(item)?.id).length,
          withPrelude: points.filter((item) => typeof asRecord(item)?.prelude === 'string' && asRecord(item)?.prelude).length,
          previewChars: points.slice(0, 3).map((item) => {
            const preview = asRecord(item)?.preview;
            return typeof preview === 'string' ? preview.length : 0;
          }),
          firstPrelude: typeof asRecord(points[0])?.prelude === 'string' ? asRecord(points[0])?.prelude : '',
          lastPrelude: typeof asRecord(points.at(-1))?.prelude === 'string' ? asRecord(points.at(-1))?.prelude : '',
        }
      : undefined,
    draftReadPoints: specPoints ? specPoints.length : undefined,
    glossPoint: point
      ? {
          id: typeof point.id === 'string' ? point.id : '',
          number: typeof point.number === 'number' ? point.number : undefined,
          prelude: typeof point.prelude === 'string' ? point.prelude : '',
        }
      : undefined,
    threadId: typeof data?.threadId === 'string' ? data.threadId : undefined,
  };
}

const turnIndex = messages.map((message) => {
  const meta = asRecord(message.metadata) ?? {};
  const attachments = Array.isArray(meta.attachments) ? meta.attachments.map(attachmentFingerprint) : [];
  const actions = Array.isArray(meta.actionResults) ? meta.actionResults.map(actionFingerprint) : [];
  const trace = Array.isArray(meta.trace) ? meta.trace : Array.isArray(meta.roomTrace) ? meta.roomTrace : [];
  const traceLines = trace.slice(0, 40).map((event) => {
    const record = asRecord(event);
    if (!record) return '';
    const actor = asRecord(record.actor);
    const who = typeof actor?.slug === 'string' ? actor.slug : typeof actor?.kind === 'string' ? actor.kind : '';
    const what = typeof record.what === 'string' ? record.what : '';
    const label = typeof record.label === 'string' ? clip(record.label, 220) : '';
    return `${who} ${what}${label ? ` — ${label}` : ''}`;
  });
  const glossThreads = Array.isArray(meta.glossThreads) ? meta.glossThreads : [];
  return {
    id: message.id,
    at: message.created_at.toISOString(),
    sessionId: message.session_id,
    role: message.role,
    sender: message.sender,
    contentChars: (message.content ?? '').length,
    content: message.content ?? '',
    displayContent: typeof meta.displayContent === 'string' ? meta.displayContent : '',
    attachments,
    actions,
    traceLines,
    glossThreadCount: glossThreads.length,
    engage: meta.engage ?? null,
  };
});

const glossThreads = messages.flatMap((message) => {
  const meta = asRecord(message.metadata);
  const threads = Array.isArray(meta?.glossThreads) ? meta.glossThreads : [];
  return threads.map((thread) => {
    const record = asRecord(thread) ?? {};
    const anchor = asRecord(record.anchor) ?? {};
    const turns = Array.isArray(record.turns) ? record.turns : Array.isArray(record.messages) ? record.messages : [];
    return {
      messageId: message.id,
      threadId: typeof record.id === 'string' ? record.id : '',
      nodeId: typeof anchor.nodeId === 'string' ? anchor.nodeId : typeof record.nodeId === 'string' ? record.nodeId : '',
      entityId: typeof anchor.entityId === 'string' ? anchor.entityId : '',
      turnCount: turns.length,
      turns: turns.map((turn) => {
        const row = asRecord(turn) ?? {};
        const content = typeof row.content === 'string' ? row.content : typeof row.text === 'string' ? row.text : '';
        return {
          role: typeof row.role === 'string' ? row.role : '',
          at: typeof row.createdAt === 'string' ? row.createdAt : typeof row.at === 'string' ? row.at : '',
          chars: content.length,
          content,
        };
      }),
    };
  });
});

const snapshot = {
  capturedAt: new Date().toISOString(),
  dialog: {
    id: dialog.id,
    domainId: dialog.domain_id,
    title: dialog.title,
    availableTo: dialog.available_to,
    documentStatus: dialog.document_status,
    forwardTitle: dialog.forward_title,
    forwardDescription: dialog.forward_description,
    stepTitle: dialog.step_title,
    stepBody: dialog.step_body,
    orientationChars: dialog.orientation?.length ?? 0,
    updatedAt: dialog.updated_at.toISOString(),
    sections: pathTitles,
  },
  manuscripts: manuscripts.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
    summary: row.summary,
  })),
  versionSummaries: versions.map((row) => versionSummary(row.spec_json, row)),
  current: {
    manuscriptId: manuscript.id,
    pointCount: currentPoints.length,
    sectionMembership: pathTitles.map((section) => ({
      ...section,
      points: byPath.get(section.id) ?? 0,
    })),
    openPoints: byPath.get('(open)') ?? 0,
    duplicatePreludeGroups: [...duplicatePreludes.entries()]
      .filter(([, nums]) => nums.length > 1)
      .map(([prelude, nums]) => ({ prelude, nums })),
    duplicateBodyGroups: [...duplicateBodies.entries()]
      .filter(([, nums]) => nums.length > 1)
      .map(([bodyHash, nums]) => ({
        bodyHash,
        nums,
        prelude: currentPoints.find((point) => point.n === nums[0])?.prelude ?? '',
        head: currentPoints.find((point) => point.n === nums[0])?.head ?? '',
      })),
    points: currentPoints,
  },
  sessions,
  turns: turnIndex.map((turn) => ({
    ...turn,
    content: clip(turn.content, 1200),
    displayContent: clip(turn.displayContent, 1200),
  })),
  glossThreads: glossThreads.map((thread) => ({
    ...thread,
    turns: thread.turns.map((turn) => ({ ...turn, content: clip(turn.content, 2000) })),
  })),
};

writeFileSync(path.join(outDir, 'manuscript-spec.json'), JSON.stringify(manuscript.spec_json, null, 2));
writeFileSync(path.join(outDir, 'document-paths.json'), JSON.stringify(dialog.document_paths, null, 2));
writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify(snapshot, null, 2));
writeFileSync(
  path.join(outDir, 'turns-full.json'),
  JSON.stringify(
    turnIndex.map((turn) => ({
      id: turn.id,
      at: turn.at,
      role: turn.role,
      sender: turn.sender,
      content: turn.content,
      displayContent: turn.displayContent,
      attachments: turn.attachments,
      actions: turn.actions,
      traceLines: turn.traceLines,
    })),
    null,
    2,
  ),
);
writeFileSync(path.join(outDir, 'gloss-full.json'), JSON.stringify(glossThreads, null, 2));

const latestVersion = versions.at(-1);
if (latestVersion) {
  writeFileSync(
    path.join(outDir, `manuscript-version-${latestVersion.version}-before-next-write.json`),
    JSON.stringify(latestVersion.spec_json, null, 2),
  );
}

console.log(JSON.stringify({
  outDir,
  dialogId: dialog.id,
  manuscriptId: manuscript.id,
  pointCount: currentPoints.length,
  sectionCount: pathTitles.length,
  versions: versions.map((row) => row.version),
  messages: messages.length,
  glossThreads: glossThreads.length,
  duplicatePreludeGroups: snapshot.current.duplicatePreludeGroups.length,
  duplicateBodyGroups: snapshot.current.duplicateBodyGroups.length,
}, null, 2));

await prisma.$disconnect();
