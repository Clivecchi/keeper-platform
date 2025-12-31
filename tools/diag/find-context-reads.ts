/*
 * Find occurrences of req.domainContext and req.context in compiled JS (fallback to TS)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDiagDir = path.join(repoRoot, 'reports', 'diag');
const searchDirs = [path.join(repoRoot, 'apps', 'api', 'src')];

async function ensureDirs() { await fs.mkdir(reportsDiagDir, { recursive: true }); }

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(p));
    else if (e.isFile() && (p.endsWith('.js') || p.endsWith('.ts'))) out.push(p);
  }
  return out;
}

async function main() {
  await ensureDirs();
  const files = (await Promise.all(searchDirs.map(listFiles))).flat();
  const hits: Array<{ file: string; line: number; snippet: string; kind: 'domainContext' | 'context' }> = [];

  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('req.domainContext')) {
        hits.push({ file: path.relative(repoRoot, f), line: i + 1, snippet: line.trim().slice(0, 240), kind: 'domainContext' });
      }
      if (line.includes('req.context')) {
        hits.push({ file: path.relative(repoRoot, f), line: i + 1, snippet: line.trim().slice(0, 240), kind: 'context' });
      }
    }
  }

  await fs.writeFile(path.join(reportsDiagDir, 'context-reads.json'), JSON.stringify(hits, null, 2));
  const mdLines = ['Context Reads', '', ...hits.map(h => `- ${h.kind} :: ${h.file}:${h.line} — ${h.snippet}`), ''];
  await fs.writeFile(path.join(reportsDiagDir, 'context-reads.md'), mdLines.join('\n'), 'utf8');
  console.log('Wrote reports/diag/context-reads.json and .md');
}

main().catch(err => { console.error(err); process.exit(1); });


