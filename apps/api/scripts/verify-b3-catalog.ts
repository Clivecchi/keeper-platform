/**
 * B3 verification — dynamic catalog from Integration.metadata + refresh endpoint.
 *
 * Usage:
 *   npx tsx scripts/verify-b3-catalog.ts
 *   API_BASE=http://localhost:3002 JWT=... npx tsx scripts/verify-b3-catalog.ts
 */

import { prisma } from '@keeper/database';

const API_BASE = (process.env.API_BASE || 'http://localhost:3002').replace(/\/$/, '');
const JWT = process.env.JWT?.trim();

async function api(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (JWT) headers.Authorization = `Bearer ${JWT}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

async function main() {
  console.log('=== B3 catalog verification ===');
  console.log('API_BASE:', API_BASE);

  const service = 'together-ai';
  const sampleItems = [
    {
      id: 'meta-llama/Llama-3-8b-chat-hf',
      label: 'Llama 3 8B Chat',
      type: 'chat',
      metadata: { source: 'verify-b3-script' },
    },
    {
      id: 'meta-llama/Llama-2-70b-chat-hf',
      label: 'Llama 2 70B',
      type: 'language',
      metadata: { source: 'verify-b3-script' },
    },
  ];
  const fetchedAt = new Date().toISOString();

  const existing = await prisma.integration.findFirst({
    where: { service, tier: 'platform', domainId: null, userId: null },
  });

  const metadata = {
    catalog: { items: sampleItems, fetchedAt, source: 'live' as const },
    health: { api: 'connected' as const, lastChecked: fetchedAt },
  };

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        integration_type: 'AI_Model',
        status: 'connected',
        connectedAt: new Date(),
        metadata,
      },
    });
    console.log('Updated existing together-ai Integration with sample catalog');
  } else {
    await prisma.integration.create({
      data: {
        service,
        integration_type: 'AI_Model',
        tier: 'platform',
        domainId: null,
        userId: null,
        scopes: [],
        status: 'connected',
        connectedAt: new Date(),
        metadata,
      },
    });
    console.log('Created together-ai Integration with sample catalog');
  }

  const modelsRes = await api('/api/kip/models?provider=together-ai');
  console.log('\nGET /api/kip/models?provider=together-ai', modelsRes.status);
  console.log(JSON.stringify(modelsRes.body, null, 2));

  const data = (modelsRes.body as { data?: { models?: Array<{ id: string; source?: string }> } })?.data;
  const liveModels = data?.models?.filter((m) => m.source === 'live') ?? [];
  const hasCachedId = data?.models?.some((m) => m.id === sampleItems[0]?.id) ?? false;
  console.log('\nCondition 3:', hasCachedId && liveModels.length > 0 ? 'PASS' : 'FAIL');

  if (!JWT) {
    console.log('\nSkipping refresh call — set JWT env var for authenticated refresh test');
    return;
  }

  const refreshRes = await api(`/api/integrations/${service}/catalog/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log(`\nPOST /api/integrations/${service}/catalog/refresh`, refreshRes.status);
  console.log(JSON.stringify(refreshRes.body, null, 2));

  const refreshBody = refreshRes.body as { fetchedAt?: string; itemCount?: number };
  const condition5 =
    refreshRes.status === 200 &&
    typeof refreshBody.fetchedAt === 'string' &&
    typeof refreshBody.itemCount === 'number';
  console.log('\nCondition 5:', condition5 ? 'PASS' : 'FAIL');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
