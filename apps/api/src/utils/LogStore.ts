// Simple in-memory ring buffer for capturing runtime debug messages that
// we want surfaced through the /debug endpoint. This is NOT persisted and
// will be cleared on process restart (which is fine for ephemeral logs).

const MAX = 50;
const logs: { ts: string; source: string; message: any }[] = [];

export function addLog(source: string, message: any) {
  logs.push({ ts: new Date().toISOString(), source, message });
  if (logs.length > MAX) logs.shift();
}

export function getLogs() {
  return logs.slice();
}
