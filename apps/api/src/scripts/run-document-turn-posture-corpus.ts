/**
 * Live TypeSafe shadow corpus for Document Turn Posture.
 * Shadow only — does not mutate a Document.
 *
 * From apps/api:
 *   pnpm exec tsx src/scripts/run-document-turn-posture-corpus.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DOCUMENT_TURN_POSTURE_CORPUS } from '@keeper/shared';
import { evaluateDocumentTurnPostureShadow } from '../services/kip/documentTurnPostureShadow.js';

async function main() {
  const results = [];
  for (const row of DOCUMENT_TURN_POSTURE_CORPUS) {
    const shadow = await evaluateDocumentTurnPostureShadow({
      turn: row.text,
      dialogTitle: 'Finding the Plot',
      documentInContext: true,
      documentPointCount: 141,
      domainId: process.env.DOCUMENT_TURN_POSTURE_DOMAIN_ID || '9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9',
    });
    results.push({
      id: row.id,
      family: row.family,
      label: row.label,
      text: row.text,
      expectedMention: row.expectedMention,
      expectedEstablishedDirection: row.expectedEstablishedDirection,
      phraseSignal: shadow?.invocation.state.phraseSignal ?? null,
      typesafe: shadow
        ? {
            ok: shadow.ok,
            model: shadow.model,
            errorCode: shadow.errorCode ?? null,
            message: shadow.message ?? null,
            answers: shadow.answers,
            parsed: shadow.parsed,
            executed: shadow.executed,
            authorized: shadow.authorized,
          }
        : null,
    });
  }

  const outPath = resolve(process.cwd(), '../../tmp/document-turn-posture-corpus-results.json');
  writeFileSync(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(JSON.stringify({ outPath, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
