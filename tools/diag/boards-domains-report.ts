/*
 * Boards & Domains Diagnostics Script
 * -----------------------------------
 * Static analysis + optional DB inspection.
 *
 * Outputs:
 * - reports/boards-domains-report.md
 * - reports/diag/*.json (artifacts)
 *
 * Run: pnpm tsx tools/diag/boards-domains-report.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as execCb } from 'child_process';
import util from 'util';

const exec = util.promisify(execCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

// Paths
const apiIndexPath = path.join(repoRoot, 'apps', 'api', 'src', 'index.ts');
const apiSrcDir = path.join(repoRoot, 'apps', 'api', 'src');
const prismaSchemaPath = path.join(repoRoot, 'packages', 'database', 'prisma', 'schema.prisma');
const reportsDir = path.join(repoRoot, 'reports');
const reportsDiagDir = path.join(repoRoot, 'reports', 'diag');
const reportMdPath = path.join(reportsDir, 'boards-domains-report.md');

type Mount = { base: string; varName: string; file: string | null };

async function ensureDirs(): Promise<void> {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.mkdir(reportsDiagDir, { recursive: true });
}

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

function findAll(regex: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = r.exec(text))) out.push(m);
  return out;
}

async function parseMountOrder(): Promise<{ mounts: Mount[]; imports: Record<string, string> }> {
  const indexSrc = await readText(apiIndexPath);

  const importRegex = /import\s+(?:([^\n]*?)\s+from\s+)?['"](\.\/[^'";]+)['"];?/g;
  const importMap: Record<string, string> = {};
  for (const m of findAll(importRegex, indexSrc)) {
    const binding = (m[1] || '').trim();
    const spec = m[2];
    if (!binding) continue;
    // Extract default binding or named as used variables
    // e.g., import domainRoutes from './api/domains/routes.js';
    const defaultMatch = binding.match(/^(\w+)/);
    if (defaultMatch) {
      importMap[defaultMatch[1]] = path.resolve(path.dirname(apiIndexPath), spec);
    }
    // Also expose destructured named bindings as potential variables
    const named = binding.match(/\{([^}]+)\}/);
    if (named) {
      const names = named[1].split(',').map(s => s.trim().split('\s+as\s+').pop()!).filter(Boolean);
      for (const n of names) importMap[n] = path.resolve(path.dirname(apiIndexPath), spec);
    }
  }

  const mountRegex = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*([^\)]+)\)/g;
  const mounts: Mount[] = [];
  for (const m of findAll(mountRegex, indexSrc)) {
    const base = m[1];
    const varName = m[2].split(',')[0].trim();
    // Clean trailing properties (e.g., boardDataRoRouter)
    const simpleVar = varName.replace(/\)\s*=>.*/, '').replace(/\s*,.*/, '').trim();
    const file = importMap[simpleVar] || null;
    mounts.push({ base, varName: simpleVar, file });
  }

  await fs.writeFile(path.join(reportsDiagDir, 'mounted-routes.json'), JSON.stringify({ mounts, imports: importMap }, null, 2));
  return { mounts, imports: importMap };
}

async function locateEndpoints(mounts: Mount[]) {
  const targets = [
    { method: 'GET', path: '/api/domains/my' },
    { method: 'GET', path: '/api/domains/:id/management-board' },
    { method: 'GET', path: '/api/board-data/:id' },
  ];

  const results: any[] = [];

  // Helper: scan a router file for a route definition
  async function scanFileFor(filePath: string, httpMethod: string, localPath: string): Promise<null | { file: string; snippet: string }> {
    try {
      const src = await readText(filePath);
      const method = httpMethod.toLowerCase();
      const routerRegex = new RegExp(`\\brouter\\.${method}\\(\\\s*['\"]${localPath.replace(/[.*+?^${}()|[\]\\]/g, r => r.replace(/./g, m => `\\${m}`))}['\"]`);
      const managementRegex = new RegExp(`${method}\\\(\\s*['\"]/:(?:id|domainId)/management-board`);
      const boardDataRegex = new RegExp(`${method}\\\(\\s*['\"]/:(?:id)\\b`);
      if (localPath === '/my' && routerRegex.test(src)) {
        const idx = src.search(routerRegex);
        return { file: filePath, snippet: src.slice(Math.max(0, idx - 200), idx + 400) };
      }
      if (localPath.includes('management-board') && (managementRegex.test(src))) {
        const idx = src.search(managementRegex);
        return { file: filePath, snippet: src.slice(Math.max(0, idx - 200), idx + 500) };
      }
      if (localPath === '/:id' && boardDataRegex.test(src) && filePath.endsWith('api/boards.ts')) {
        const idx = src.search(boardDataRegex);
        return { file: filePath, snippet: src.slice(Math.max(0, idx - 200), idx + 800) };
      }
    } catch {}
    return null;
  }

  // Determine candidate routers by base prefixes
  for (const t of targets) {
    const base = t.path.split('/').slice(0, 3).join('/') || '/'; // e.g., /api/domains
    const tail = t.path.replace(base, '') || '/';
    const candidates = mounts.filter(m => t.path.startsWith(m.base));
    const ordered = candidates; // already in mount order

    const found: any[] = [];
    for (const m of ordered) {
      if (!m.file) continue;
      // The router file may delegate; search the file and also nearby files
      const primary = await scanFileFor(m.file.replace(/\.js$/, '.ts'), t.method, tail);
      if (primary) found.push({ via: m, handler: primary });

      // Also search sibling known files
      const extras = [
        path.join(apiSrcDir, 'api', 'domains.ts'),
        path.join(apiSrcDir, 'api', 'domains', 'routes.ts'),
        path.join(apiSrcDir, 'api', 'domains.management.ts'),
        path.join(apiSrcDir, 'api', 'boards.ts'),
      ];
      for (const e of extras) {
        const alt = await scanFileFor(e, t.method, tail);
        if (alt) found.push({ via: m, handler: alt });
      }
    }

    results.push({ endpoint: `${t.method} ${t.path}`, base, tail, handlers: found });
  }

  await fs.writeFile(path.join(reportsDiagDir, 'endpoint-handlers.json'), JSON.stringify(results, null, 2));
  return results;
}

function summarizeGuards(snippet: string): { auth: boolean; perms: string[]; readsContext: string[]; errors: number[] } {
  const auth = /authMiddlewareCompat|kamAuth|kamOrUserAuth/.test(snippet);
  const perms: string[] = [];
  const canMatches = findAll(/can\(\s*\w+\s*,\s*['\"]([^'\"]+)['\"]\s*\)/g, snippet);
  for (const m of canMatches) perms.push(m[1]);
  const readsContext: string[] = [];
  if (/req\.context\?\.domainId|\(req as any\)\.context\?\.domainId/.test(snippet)) readsContext.push('req.context?.domainId');
  if (/req\.domainContext\?\.domain\?\.id/.test(snippet)) readsContext.push('req.domainContext?.domain?.id');
  const errors: number[] = [];
  if (/res\.status\(400\)/.test(snippet)) errors.push(400);
  if (/res\.status\(401\)/.test(snippet)) errors.push(401);
  if (/res\.status\(403\)/.test(snippet)) errors.push(403);
  if (/res\.status\(404\)/.test(snippet)) errors.push(404);
  if (/res\.status\(500\)/.test(snippet)) errors.push(500);
  return { auth, perms, readsContext, errors: Array.from(new Set(errors)).sort() };
}

async function extractPrismaModels(): Promise<{ Board: string; FrameInstance: string; Domain: string }> {
  const schema = await readText(prismaSchemaPath);
  function block(name: string): string {
    const r = new RegExp(`model\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`, 'm');
    const m = schema.match(r);
    return m ? m[0] : '';
  }
  const models = {
    Board: block('Board'),
    FrameInstance: block('FrameInstance'),
    Domain: block('Domain'),
  };
  await fs.writeFile(path.join(reportsDiagDir, 'prisma-models.json'), JSON.stringify(models, null, 2));
  return models;
}

async function discoverIncludes(): Promise<string[]> {
  // scan handlers for include patterns
  const files = [
    path.join(apiSrcDir, 'api', 'boards.ts'),
    path.join(apiSrcDir, 'api', 'domains.ts'),
    path.join(apiSrcDir, 'api', 'domains', 'routes.ts'),
    path.join(apiSrcDir, 'api', 'domains.management.ts'),
  ];
  const includes: string[] = [];
  for (const f of files) {
    try {
      const src = await readText(f);
      const matches = findAll(/include:\s*\{[\s\S]*?\}/g, src).map(m => m[0]);
      includes.push(...matches);
    } catch {}
  }
  await fs.writeFile(path.join(reportsDiagDir, 'includes.json'), JSON.stringify(includes, null, 2));
  return includes;
}

async function optionalDbCheck() {
  const hasDb = !!process.env.DATABASE_URL;
  const out: any = { enabled: hasDb };
  if (!hasDb) return out;

  // Run prisma CLI in packages/database
  const dbPkgDir = path.join(repoRoot, 'packages', 'database');
  try {
    const { stdout: statusStdout } = await exec('npx prisma migrate status --json', { cwd: dbPkgDir, env: process.env });
    out.migrateStatus = JSON.parse(statusStdout);
    await fs.writeFile(path.join(reportsDiagDir, 'prisma-migrate-status.json'), statusStdout);
  } catch (e: any) {
    out.migrateStatusError = String(e?.stderr || e?.message || e);
  }
  try {
    await exec('npx prisma db pull', { cwd: dbPkgDir, env: process.env });
    out.dbPull = 'ok';
  } catch (e: any) {
    out.dbPullError = String(e?.stderr || e?.message || e);
  }

  // Query information_schema via PrismaClient
  try {
    // Lazy import to avoid requiring prisma if no DATABASE_URL
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient();
    const tables = ['Domain', 'Board', 'FrameInstance'];
    const columns = Object.fromEntries(
      await Promise.all(
        tables.map(async (t) => {
          const rows = await (client as any).$queryRawUnsafe(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
            t
          );
          return [t, rows];
        })
      )
    );
    out.columns = columns;
    await fs.writeFile(path.join(reportsDiagDir, 'db-columns.json'), JSON.stringify(columns, null, 2));

    const indexes = Object.fromEntries(
      await Promise.all(
        tables.map(async (t) => {
          const rows = await (client as any).$queryRawUnsafe(
            `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`,
            t
          );
          return [t, rows];
        })
      )
    );
    out.indexes = indexes;
    await fs.writeFile(path.join(reportsDiagDir, 'db-indexes.json'), JSON.stringify(indexes, null, 2));
    await client.$disconnect();
  } catch (e: any) {
    out.dbQueryError = String(e?.message || e);
  }

  return out;
}

function deriveRiskFindings(data: {
  endpoints: any[];
  includes: string[];
}): string[] {
  const risks: string[] = [];

  // Risk 1: Dual handlers for management-board; order determines winner
  const mgmt = data.endpoints.find(e => String(e.endpoint).includes('/management-board'));
  if (mgmt && Array.isArray(mgmt.handlers) && mgmt.handlers.length > 1) {
    risks.push('Duplicate handlers for /api/domains/:id/management-board detected (multiple routers). Mount order determines which wins.');
  }

  // Risk 2: Domain context read mismatch
  const boardData = data.endpoints.find(e => String(e.endpoint).includes('/api/board-data/:id'));
  const anyReadsContext = (h: any) => summarizeGuards(h.handler.snippet).readsContext;
  if (boardData && boardData.handlers?.some((h: any) => anyReadsContext(h).includes('req.context?.domainId'))) {
    risks.push('Board data handler reads req.context?.domainId while domain middleware sets req.domainContext; potential mismatch.');
  }

  // Risk 3: Includes require FrameConfig; ensure present
  if (!data.includes.some(s => /FrameConfig/.test(s))) {
    risks.push('No explicit FrameConfig include found; verify include paths to prevent null-related runtime errors.');
  }

  return risks.slice(0, 3);
}

async function writeMarkdown(params: {
  mounts: Mount[];
  endpoints: any[];
  prismaModels: { Board: string; FrameInstance: string; Domain: string };
  db: any;
}) {
  const { mounts, endpoints, prismaModels, db } = params;

  const mountedOrderSection = [
    'Mounted Route Order',
    '',
    ...mounts.map(m => `- ${m.base} -> ${m.varName}${m.file ? ` (${path.relative(repoRoot, m.file)})` : ''}`),
    '',
  ].join('\n');

  function endpointSection(e: any): string {
    const lines: string[] = [];
    lines.push(`Endpoint: ${e.endpoint}`);
    if (!e.handlers?.length) {
      lines.push('  - No handler found in scanned files.');
      return lines.join('\n');
    }
    e.handlers.forEach((h: any, i: number) => {
      const guards = summarizeGuards(h.handler.snippet);
      lines.push(`  - Handler #${i + 1}: ${path.relative(repoRoot, h.handler.file)} (mounted via ${h.via.base} -> ${h.via.varName})`);
      lines.push(`    - Auth: ${guards.auth ? 'yes' : 'no'}; Perms: ${guards.perms.join(', ') || 'n/a'}; Errors: ${guards.errors.join(', ') || 'n/a'}`);
      lines.push(`    - Reads domain context: ${guards.readsContext.join(', ') || 'none'}`);
    });
    return lines.join('\n');
  }

  const contextSetSection = [
    'Domain Context Read vs Set',
    '',
    '- Setter: apps/api/src/middleware/domainResolutionMiddleware.ts (sets req.domainContext = { domain, isCustomDomain, originalHostname, resolvedSlug })',
    '- Readers observed:',
    ...endpoints.flatMap((e: any) => e.handlers?.map((h: any) => {
      const g = summarizeGuards(h.handler.snippet);
      return g.readsContext.length ? `  - ${path.relative(repoRoot, h.handler.file)} -> ${g.readsContext.join(', ')}` : [];
    }) || []),
    '',
  ].flat().join('\n');

  const loaderSection = [
    'Board Data Loader include/relations',
    '',
    '- apps/api/src/api/boards.ts uses include: { frames: { orderBy, include: { FrameConfig: true } } }',
    '',
  ].join('\n');

  const prismaSection = [
    'Prisma model cross-check (Board, FrameInstance, Domain)',
    '',
    '--- Board ---',
    prismaModels.Board || '(not found)',
    '',
    '--- FrameInstance ---',
    prismaModels.FrameInstance || '(not found)',
    '',
    '--- Domain ---',
    prismaModels.Domain || '(not found)',
    '',
  ].join('\n');

  const dbSection = [
    'Schema vs DB (optional)',
    '',
    db?.enabled ? '- DATABASE_URL detected; artifacts saved under reports/diag/' : '- PARTIAL (code-only): DATABASE_URL not set; skipped DB checks.'
  ].join('\n');

  const risks = deriveRiskFindings({ endpoints, includes: JSON.parse(await fs.readFile(path.join(reportsDiagDir, 'includes.json'), 'utf8') || '[]') });
  const risksSection = [
    'Top 3 Risk Findings',
    '',
    ...risks.map(r => `- ${r}`),
    '',
  ].join('\n');

  const endpointSections = endpoints.map(endpointSection).join('\n\n');

  const md = [
    '# Boards & Domains Diagnostics Report',
    '',
    mountedOrderSection,
    endpointSections,
    contextSetSection,
    loaderSection,
    prismaSection,
    dbSection,
    risksSection,
  ].join('\n');

  await fs.writeFile(reportMdPath, md, 'utf8');
}

async function main(): Promise<void> {
  await ensureDirs();

  const { mounts } = await parseMountOrder();
  const endpoints = await locateEndpoints(mounts);
  const prismaModels = await extractPrismaModels();
  await discoverIncludes();
  const db = await optionalDbCheck();
  await fs.writeFile(path.join(reportsDiagDir, 'summary.json'), JSON.stringify({ mounts, endpoints, db }, null, 2));
  await writeMarkdown({ mounts, endpoints, prismaModels, db });

  // Console note
  console.log(`Diagnostics complete. Markdown: ${path.relative(repoRoot, reportMdPath)}`);
}

main().catch(async (err) => {
  console.error('[diag] error', err);
  try { await fs.writeFile(path.join(reportsDiagDir, 'error.json'), JSON.stringify({ error: String(err?.message || err) }, null, 2)); } catch {}
  process.exit(1);
});


