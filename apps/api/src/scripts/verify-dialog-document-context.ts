/**
 * Read-only verify: Dialog Document loads for agent context + redaction helpers.
 * Usage: cd apps/api && npx tsx src/scripts/verify-dialog-document-context.ts
 */
import { prisma } from '@keeper/database';
import { redactForLog, resolveDialogParticipation } from '@keeper/shared';
import { loadDialogDocumentForAgent } from '../services/kip/loadDialogDocumentForAgent.js';

const DIALOG_ID = 'cmrtyoraw0001ot0033p5wiwm';

async function main() {
  console.log(
    'participation_cloud_default=',
    resolveDialogParticipation({}, { slug: 'cloud' }),
  );
  console.log(
    'redacted=',
    JSON.stringify(
      redactForLog({
        data: {
          token: 'eyJhbGciOiJIUzI1NiJ9.aaa.bbb',
          user: { email: 'x@y.z' },
        },
      }),
    ),
  );

  const dialog = await prisma.dialog.findUnique({
    where: { id: DIALOG_ID },
    select: { id: true, domain_id: true, forward_title: true, title: true },
  });
  console.log('dialog=', dialog);
  if (!dialog) {
    console.log('documentInContext=false (dialog not in this DB)');
    return;
  }
  const doc = await loadDialogDocumentForAgent(dialog.id, dialog.domain_id);
  console.log('documentInContext=', Boolean(doc?.dialogId));
  console.log('forward=', doc?.forward?.title ?? null);
  console.log('step=', doc?.step?.title ?? null);
  console.log('pointCount=', doc?.points?.length ?? 0);
  console.log(
    'sampleAgentTurnLog=',
    JSON.stringify({
      mechanism: 'plain_lead',
      documentInContext: Boolean(doc?.dialogId),
      documentHasForward: Boolean(doc?.forward),
      documentHasStep: Boolean(doc?.step),
      documentPointCount: doc?.points?.length ?? 0,
      castConsultSlugs: [],
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
