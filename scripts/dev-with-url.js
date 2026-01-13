#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting Keeper Platform Development Servers...\n');

// Start API server
const apiServer = spawn('pnpm', ['dev'], {
  cwd: join(rootDir, 'apps/api'),
  stdio: 'pipe',
  shell: true
});

// Start Web server
const webServer = spawn('pnpm', ['dev'], {
  cwd: join(rootDir, 'apps/web'),
  stdio: 'pipe',
  shell: true
});

let apiReady = false;
let webReady = false;
let urlsDisplayed = false;

function displayUrls() {
  if (urlsDisplayed) return;
  urlsDisplayed = true;
  
  console.log('\n🎉 Keeper Platform Development Environment');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌐 Frontend: http://localhost:5173');
  console.log('🔧 API:      http://localhost:3002');
  console.log('📊 Database: http://localhost:5555 (Prisma Studio)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Monitor API server
apiServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[API] ${output}`);
  
  if (output.includes('Server running') || output.includes('listening')) {
    apiReady = true;
    if (webReady && !urlsDisplayed) {
      setTimeout(displayUrls, 1000);
    }
  }
});

apiServer.stderr.on('data', (data) => {
  console.error(`[API Error] ${data.toString()}`);
});

// Monitor Web server
webServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Web] ${output}`);
  
  if (output.includes('Local:') || output.includes('ready in')) {
    webReady = true;
    if (apiReady && !urlsDisplayed) {
      setTimeout(displayUrls, 1000);
    }
  }
});

webServer.stderr.on('data', (data) => {
  console.error(`[Web Error] ${data.toString()}`);
});

// Fallback: display URLs after 10 seconds
setTimeout(() => {
  if (!urlsDisplayed) {
    displayUrls();
  }
}, 10000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  apiServer.kill('SIGINT');
  webServer.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  apiServer.kill('SIGTERM');
  webServer.kill('SIGTERM');
  process.exit();
});

// Handle server exits
apiServer.on('close', (code) => {
  console.log(`[API] Server exited with code ${code}`);
});

webServer.on('close', (code) => {
  console.log(`[Web] Server exited with code ${code}`);
}); 