// Simple in-memory log store for high-signal debug breadcrumbs
// Not persisted; safe for ephemeral environments

const MAX_LOGS = 1000;
const logs = [];

export function addLog(tag, payload = {}) {
  logs.push({ ts: new Date().toISOString(), tag, payload });
  if (logs.length > MAX_LOGS) logs.shift();
}

export function getLogs() {
  return logs.slice();
}

export default { addLog, getLogs };


