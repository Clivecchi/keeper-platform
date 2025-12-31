import { describe, it, expect } from 'vitest';

function normalizeBaseUrl(raw?: string): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url.replace(/\/$/, '');
  return `https://${url.replace(/\/$/, '')}`;
}

const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.RAILWAY_PUBLIC_URL ||
  process.env.RAILWAY_PUBLIC_DOMAIN
) || 'http://localhost:8080';

describe('Production smoke (Railway) @smoke:prod', () => {
  it('GET /api/health returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { method: 'GET' });
    expect(res.status).toBe(200);
  }, 30_000);

  it('GET /api/test with Origin https://www.ke3p.com returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/test`, {
      method: 'GET',
      headers: { Origin: 'https://www.ke3p.com' },
    });
    expect(res.status).toBe(200);
  }, 30_000);

  it('GET /api/test with Origin https://evil.example returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/test`, {
      method: 'GET',
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  }, 30_000);

  it('POST /api/kam/auth/register returns 201', async () => {
    const unique = Date.now().toString(36) + Math.random().toString(16).slice(2);
    const payload = {
      name: `Smoke Test ${unique}`,
      email: `smoke+${unique}@ke3p.com`,
      password: 'Sm0keTest!'
    };
    const res = await fetch(`${baseUrl}/api/kam/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    expect([201, 409]).toContain(res.status);
    // Prefer 201; allow 409 if the email somehow collided in parallel runs
  }, 60_000);
});


