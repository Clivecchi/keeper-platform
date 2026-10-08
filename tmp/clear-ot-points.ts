import 'dotenv/config';
import { prisma } from '@keeper/database';

const dialogId = 'cmv04yrn50001otb8mwjrj0as';
const draft = await prisma.kip_drafts.findFirst({
  where: { dialog_id: dialogId, kind: 'document_manuscript' },
  select: { id: true, spec_json: true },
});
if (!draft) throw new Error('manuscript missing');
const spec = draft.spec_json && typeof draft.spec_json === 'object' && !Array.isArray(draft.spec_json)
  ? draft.spec_json as Record<string, unknown>
  : {};
const before = Array.isArray(spec.points) ? spec.points.length : 0;
await prisma.kip_drafts.update({
  where: { id: draft.id },
  data: { spec_json: { ...spec, points: [] }, updated_at: new Date() },
});
const again = await prisma.dialog.findUnique({
  where: { id: dialogId },
  select: { id: true, title: true, available_to: true, user_id: true },
});
console.log(JSON.stringify({ cleared: before, dialog: again }));
await prisma.$disconnect();
