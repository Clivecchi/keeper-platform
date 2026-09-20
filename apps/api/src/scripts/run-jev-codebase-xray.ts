/**
 * Jev Keeper Codebase X-Ray — developer experiment.
 * Reuses evaluateTypeSafe. Does not mutate Keeper state.
 *
 * From apps/api:
 *   pnpm exec tsx src/scripts/run-jev-codebase-xray.ts --dry-run
 *   pnpm exec tsx src/scripts/run-jev-codebase-xray.ts
 *   pnpm exec tsx src/scripts/run-jev-codebase-xray.ts --limit=8 --concurrency=2
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { TYPESAFE_DEFAULT_MODEL } from '../services/TypeSafeProvider.js';
import { resolveProviderApiKeyWithSource } from '../lib/resolveProviderApiKey.js';
import { architectureContextCharCount } from './jev-xray/architectureContext.js';
import { KEEPER_XRAY_QUESTIONS } from './jev-xray/questions.js';
import { buildCodeMap, renderCodeMapMarkdown } from './jev-xray/report.js';
import { runXray } from './jev-xray/runXray.js';
import { KEEPER_XRAY_UNIT_CATALOG, prepareUnits } from './jev-xray/selectUnits.js';

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function option(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return fallback;
  return hit.slice(prefix.length);
}

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start, '../..');
}

async function main() {
  const repoRoot = findRepoRoot(process.cwd());
  const dryRun = flag('dry-run');
  const limitRaw = option('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const concurrency = Number(option('concurrency', '4'));
  const model = option('model', TYPESAFE_DEFAULT_MODEL) ?? TYPESAFE_DEFAULT_MODEL;
  const outDir = resolve(repoRoot, option('out', 'tmp/jev-xray') ?? 'tmp/jev-xray');

  const prepared = prepareUnits(repoRoot);
  const units = typeof limit === 'number' && Number.isFinite(limit) ? prepared.units.slice(0, limit) : prepared.units;

  console.log(
    JSON.stringify(
      {
        repoRoot,
        dryRun,
        model,
        questionCount: KEEPER_XRAY_QUESTIONS.length,
        architectureChars: architectureContextCharCount(),
        catalog: KEEPER_XRAY_UNIT_CATALOG.length,
        prepared: prepared.units.length,
        missing: prepared.missing.map((row) => `${row.path}#${row.symbol}`),
        selected: units.map((unit) => `${unit.path}#${unit.symbol}`),
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  const resolved = await resolveProviderApiKeyWithSource('typesafe');
  if (!resolved.key) {
    console.error('No TypeSafe key. Set TYPESAFE_API_KEY or an active platform typesafe key.');
    process.exitCode = 1;
    return;
  }

  const started = Date.now();
  const { results } = await runXray(units, {
    apiKey: resolved.key,
    model,
    concurrency: Number.isFinite(concurrency) ? concurrency : 4,
    onUnit: (index, total, unit) => {
      console.log(`[${index}/${total}] ${unit.path}#${unit.symbol}`);
    },
  });

  const map = buildCodeMap({
    units: results,
    model,
    durationMs: Date.now() - started,
    keySource: resolved.source,
    questionCount: KEEPER_XRAY_QUESTIONS.length,
  });

  mkdirSync(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'results.json');
  const mdPath = resolve(outDir, 'code-map.md');
  writeFileSync(jsonPath, `${JSON.stringify(map, null, 2)}\n`);
  writeFileSync(mdPath, `${renderCodeMapMarkdown(map)}\n`);
  console.log(
    JSON.stringify(
      {
        outDir,
        jsonPath,
        mdPath,
        summary: map.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
