/*
 * Verify Domain Management Board mounts (compiled JS preferred)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDiagDir = path.join(repoRoot, 'reports', 'diag');

const filesPreferred = [
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains.js'),
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains', 'routes.js'),
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains.management.js'),
  path.join(repoRoot, 'apps', 'api', 'src', 'index.js'),
];
const filesFallback = [
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains.ts'),
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains', 'routes.ts'),
  path.join(repoRoot, 'apps', 'api', 'src', 'api', 'domains.management.ts'),
  path.join(repoRoot, 'apps', 'api', 'src', 'index.ts'),
];

async function ensureDirs() { await fs.mkdir(reportsDiagDir, { recursive: true }); }
async function tryRead(p: string): Promise<string | null> { try { return await fs.readFile(p, 'utf8'); } catch { return null; } }
function findAll(regex: RegExp, text: string): RegExpExecArray[] { const out: RegExpExecArray[] = []; let m: RegExpExecArray | null; const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'); while ((m = r.exec(text))) out.push(m); return out; }

async function main() {
  await ensureDirs();
  const sources: Record<string, string> = {};
  let partial = false;
  for (let i = 0; i < filesPreferred.length; i++) {
    const src = await tryRead(filesPreferred[i]) ?? await tryRead(filesFallback[i]);
    if (!await tryRead(filesPreferred[i])) partial = true;
    if (src) sources[filesPreferred[i]] = src;
  }

  // Extract handlers for /:id/management-board and /:domainId/management-board
  const handlers: Array<{ file: string; varName: string; path: string; authMiddlewarePresent: boolean; permissionCheckPresent: boolean }> = [];
  for (const [file, src] of Object.entries(sources)) {
    // Find router var names
    const routers = Array.from(new Set(findAll(/\bconst\s+(\w+)\s*=\s*Router\s*\(/g, src).map(m => m[1])));
    for (const rv of routers) {
      const routeRegex = new RegExp(`${rv}\\.get\\(\\s*['\"].*?\\/(?:id|domainId)\\/management-board['\"]`, 'g');
      const matches = findAll(routeRegex, src);
      for (const m of matches) {
        const start = m.index!;
        const snippet = src.slice(Math.max(0, start - 200), start + 600);
        const auth = /authMiddlewareCompat/.test(snippet);
        const perm = /checkPermission\(|requireDomainAdminCompat/.test(snippet);
        const which = snippet.match(/['\"]\/(?:id|domainId)\/management-board['\"]/);
        handlers.push({ file: path.relative(repoRoot, file), varName: rv, path: which ? which[0].replace(/['\"]/g,'') : '/:id/management-board', authMiddlewarePresent: auth, permissionCheckPresent: perm });
      }
    }
  }

  // Mount order: read index for app.use('/api/domains', ...)
  const indexSrc = sources[filesPreferred[3]];
  const mounts: Array<{ base: string; arg: string }> = [];
  if (indexSrc) {
    for (const m of findAll(/app\.use\(\s*['\"]\/api\/domains['\"]\s*,\s*([^\)]+)\)/g, indexSrc)) {
      mounts.push({ base: '/api/domains', arg: m[1].split(',')[0].trim() });
    }
  }

  const json = { partial, handlers, mounts };
  await fs.writeFile(path.join(reportsDiagDir, 'dmb-mounts.json'), JSON.stringify(json, null, 2));
  const md = [
    'DMB Mounts',
    '',
    `Mounted under /api/domains in order: ${mounts.map(m => m.arg).join(' -> ') || 'none'}`,
    'Handlers:',
    ...handlers.map(h => `- ${h.file} :: ${h.varName} ${h.path} [auth=${h.authMiddlewarePresent?'yes':'no'} perms=${h.permissionCheckPresent?'yes':'no'}]`),
    partial ? 'NOTE: PARTIAL (compiled JS not found for some files)' : '',
    ''
  ].filter(Boolean).join('\n');
  await fs.writeFile(path.join(reportsDiagDir, 'dmb-mounts.md'), md, 'utf8');
  console.log('Wrote reports/diag/dmb-mounts.json and .md');
}

main().catch(err => { console.error(err); process.exit(1); });


