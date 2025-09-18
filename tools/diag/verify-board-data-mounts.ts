/*
 * Verify board-data mounts by scanning compiled JS (fallback to TS if needed)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDiagDir = path.join(repoRoot, 'reports', 'diag');

const filesPreferred = [
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'boards.js'),
  path.join(repoRoot, 'apps', 'api', 'src', 'index.js'),
];
const filesFallback = [
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'boards.ts'),
  path.join(repoRoot, 'apps', 'api', 'src', 'index.ts'),
];

async function ensureDirs() {
  await fs.mkdir(reportsDiagDir, { recursive: true });
}

async function tryRead(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}

function findAll(regex: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = r.exec(text))) out.push(m);
  return out;
}

async function main() {
  await ensureDirs();
  const boardsSrc = (await tryRead(filesPreferred[0])) ?? (await tryRead(filesFallback[0]));
  const indexSrc = (await tryRead(filesPreferred[1])) ?? (await tryRead(filesFallback[1]));
  const partial = !await tryRead(filesPreferred[0]) || !await tryRead(filesPreferred[1]);

  const result: any = { partial: Boolean(partial) };

  // Identify Router variables and routes in boards file
  const varToRoutes: Record<string, Array<{ method: string; path: string }>> = {};
  const routerVars: string[] = [];
  if (boardsSrc) {
    for (const m of findAll(/\bconst\s+(\w+)\s*=\s*Router\s*\(/g, boardsSrc)) {
      routerVars.push(m[1]);
      varToRoutes[m[1]] = [];
    }
    for (const m of findAll(/\b(\w+)\.(get|post|patch|delete)\(\s*['\"]([^'\"]+)['\"]/g, boardsSrc)) {
      const rv = m[1];
      const method = m[2].toUpperCase();
      const p = m[3];
      if (!varToRoutes[rv]) varToRoutes[rv] = [];
      varToRoutes[rv].push({ method, path: p });
    }
  }

  // Determine default export variable name from boards file
  let defaultExportVar: string | null = null;
  if (boardsSrc) {
    const m = boardsSrc.match(/export\s+default\s+(\w+)/);
    if (m) defaultExportVar = m[1];
  }

  // Parse app.use mounts in index file
  const mounts: Array<{ base: string; arg: string }> = [];
  const boardDataMounts: Array<{ base: string; arg: string }> = [];
  const importMap: Record<string, string> = {};
  if (indexSrc) {
    // imports
    for (const m of findAll(/import\s+([^\n]+?)\s+from\s+['\"](\.\/[^'\"]+)['\"]/g, indexSrc)) {
      const bindings = m[1];
      const spec = m[2];
      const def = bindings.match(/^(\w+)/);
      if (def) importMap[def[1]] = spec;
      const named = bindings.match(/\{([^}]+)\}/);
      if (named) {
        const names = named[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean);
        for (const n of names) importMap[n] = spec;
      }
    }
    for (const m of findAll(/app\.use\(\s*['\"]([^'\"]+)['\"]\s*,\s*([^\)]+)\)/g, indexSrc)) {
      const base = m[1];
      const arg = m[2].split(',')[0].trim();
      mounts.push({ base, arg });
      if (base === '/api/board-data') boardDataMounts.push({ base, arg });
    }
  }

  // Routes on default router
  const defaultRoutes = defaultExportVar ? (varToRoutes[defaultExportVar] || []) : [];
  const foundGetIdHandler = defaultRoutes.some(r => r.method === 'GET' && r.path === '/:id');

  // If not found, search any router var for GET /:id and whether exported
  let fallbackGetId: Array<{ varName: string; exported: boolean }> = [];
  if (!foundGetIdHandler && boardsSrc) {
    for (const v of Object.keys(varToRoutes)) {
      if (varToRoutes[v].some(r => r.method === 'GET' && r.path === '/:id')) {
        const exported = v === defaultExportVar || new RegExp(`export\s+\{[^}]*\b${v}\b[^}]*\}`,'m').test(boardsSrc);
        fallbackGetId.push({ varName: v, exported });
      }
    }
  }

  const summary = {
    mountedBase: '/api/board-data',
    mounts: boardDataMounts.map(m => ({ base: m.base, arg: m.arg, importSource: importMap[m.arg] || null })),
    routerVars: Object.keys(varToRoutes),
    defaultExportVar,
    routesOnDefault: defaultRoutes.map(r => `${r.method} ${r.path}`),
    foundGetIdHandler,
    fallbackGetId,
    partial: Boolean(partial)
  };

  await fs.writeFile(path.join(reportsDiagDir, 'board-data-mounts.json'), JSON.stringify(summary, null, 2));
  const md = [
    'Board-Data Mounts',
    '',
    `mountedBase: /api/board-data`,
    `routers mounted: ${summary.mounts.map(m => `${m.arg}${m.importSource ? ' ← '+m.importSource : ''}`).join(', ') || 'none'}`,
    `default export var: ${defaultExportVar || 'unknown'}`,
    `routes on default: ${summary.routesOnDefault.join(', ') || 'none'}`,
    `foundGetIdHandler: ${foundGetIdHandler}`,
    fallbackGetId.length ? `fallback GET '/:id' on: ${fallbackGetId.map(f => `${f.varName}${f.exported ? ' (exported)' : ''}`).join(', ')}` : '',
    summary.partial ? 'NOTE: PARTIAL (scanned TS fallback, compiled JS not found)' : '',
    ''
  ].filter(Boolean).join('\n');
  await fs.writeFile(path.join(reportsDiagDir, 'board-data-mounts.md'), md, 'utf8');

  console.log('Wrote reports/diag/board-data-mounts.json and .md');
}

main().catch(err => { console.error(err); process.exit(1); });


