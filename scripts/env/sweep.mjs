#!/usr/bin/env node
// scripts/env/sweep.mjs
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const DEBUG = args.has('--debug');

const ALLOW_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const IGNORE_DIRS = new Set(['node_modules','dist','build','coverage','.next','.vercel','.cache','.git']);

function log(...xs){ if (DEBUG) console.log('[env-sweep]', ...xs); }

// 1) Gather files: try git, else fallback to fs recursion
function trackedFiles() {
  try {
    const out = execSync('git ls-files', { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 5000 });
    const files = out.split('\n').filter(Boolean);
    log(`git ls-files returned ${files.length} files`);
    return files.filter(f => ALLOW_EXTS.has(extname(f)));
  } catch {
    log('git ls-files failed or timed out, falling back to fs walk');
    const files = [];
    function walk(dir) {
      let entries = [];
      try { entries = readdirSync(dir); } catch { return; }
      for (const name of entries) {
        if (IGNORE_DIRS.has(name)) continue;
        const full = join(dir, name);
        let st; try { st = statSync(full); } catch { continue; }
        if (st.isDirectory()) walk(full);
        else if (ALLOW_EXTS.has(extname(full))) files.push(full);
      }
    }
    walk(process.cwd());
    log(`fs walk found ${files.length} files`);
    return files;
  }
}

// 2) Read .env.example
const ENV_EXAMPLE = '.env.example';
if (!existsSync(ENV_EXAMPLE)) {
  console.error('ERROR: .env.example not found at repo root.');
  process.exit(2);
}
const exampleLines = readFileSync(ENV_EXAMPLE, 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const exampleKeys = new Set(
  exampleLines.map(l => l.split('=')[0].trim()).filter(k => /^[A-Z][A-Z0-9_]*$/.test(k))
);

// 3) Scan code for env usage
const serverEnv = new Set(); // process.env.*
const clientEnv = new Set(); // import.meta.env.*

const serverRe = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const clientRe = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g;

const files = trackedFiles();
for (const f of files) {
  let s = '';
  try { s = readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of s.matchAll(serverRe)) serverEnv.add(m[1]);
  for (const m of s.matchAll(clientRe)) clientEnv.add(m[1]);
}

// 4) Compute diffs
const referenced = new Set([...serverEnv, ...clientEnv]);
const missingInExample = [...referenced].filter(k => !exampleKeys.has(k));
const unusedInCode = [...exampleKeys].filter(k => !referenced.has(k));
const clientWithoutVite = [...clientEnv].filter(k => !k.startsWith('VITE_'));
const serverHasVite = [...serverEnv].filter(k => k.startsWith('VITE_'));

// 5) Report
function printList(title, arr) {
  console.log(`\n${title}: ${arr.length ? '' : '(none)'}`);
  arr.sort().forEach(k => console.log(' -', k));
}

console.log('=== ENV SWEEP REPORT ===');
console.log('Server refs  :', [...serverEnv].sort().join(', ') || '(none)');
console.log('Client refs  :', [...clientEnv].sort().join(', ') || '(none)');
console.log('Example keys :', [...exampleKeys].sort().join(', ') || '(none)');

printList('Missing from .env.example', missingInExample);
printList('Listed in .env.example but unused in code', unusedInCode);
printList('CLIENT keys without VITE_ prefix (must be VITE_*)', clientWithoutVite);
printList('SERVER refs mistakenly using VITE_*', serverHasVite);

// 6) Exit codes
if (CHECK) {
  const errors = [];
  if (missingInExample.length) errors.push('Missing keys in .env.example');
  if (clientWithoutVite.length) errors.push('Client keys missing VITE_ prefix');
  if (serverHasVite.length) errors.push('Server referenced VITE_* keys');
  if (errors.length) {
    console.error('\nENV SWEEP FAILED:', errors.join('; '));
    process.exit(1);
  }
}
