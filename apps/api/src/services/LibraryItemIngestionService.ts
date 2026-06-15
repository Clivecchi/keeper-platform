/**
 * LibraryItem ingestion — agent perspective generation on create (upload + url only, Pass 1).
 */

import { prisma } from '@keeper/database';
import { ModelProviderService } from './ModelProviderService.js';
import type { ModelContentPart } from './ModelProviderService.js';
import { embedLibraryItemPerspective } from './LibraryItemEmbeddingService.js';

const IMAGE_MIME_PREFIXES = ['image/'];
const TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml', 'application/javascript'];
const MAX_FETCH_BYTES = 512_000;
const MAX_TEXT_CHARS = 12_000;

function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return IMAGE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

function guessMimeFromRef(sourceRef: string): string | null {
  const lower = sourceRef.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(lower)) return 'image/jpeg';
  if (/\.(md|markdown|txt)(\?|$)/.test(lower)) return 'text/plain';
  if (/\.json(\?|$)/.test(lower)) return 'application/json';
  if (/\.pdf(\?|$)/.test(lower)) return 'application/pdf';
  return null;
}

async function fetchBlobWithAuth(url: string): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isPrivate = url.includes('.private.') && url.includes('blob.vercel-storage.com');
  let res = await fetch(url, {
    headers: isPrivate && token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401 && token && url.includes('blob.vercel-storage.com')) {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }
  return res;
}

async function loadUploadContent(sourceRef: string): Promise<{
  mime: string | null;
  text: string | null;
  imageUrl: string | null;
}> {
  const res = await fetchBlobWithAuth(sourceRef);
  if (!res.ok) {
    throw new Error(`Failed to fetch upload (${res.status})`);
  }
  const mime = res.headers.get('content-type')?.split(';')[0]?.trim() ?? guessMimeFromRef(sourceRef);

  if (isImageMime(mime)) {
    return { mime, text: null, imageUrl: sourceRef };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_FETCH_BYTES) {
    return {
      mime,
      text: `[Binary upload — ${Math.round(buffer.length / 1024)}KB, type ${mime ?? 'unknown'}]`,
      imageUrl: null,
    };
  }

  if (
    mime &&
    (TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p)) ||
      mime === 'application/pdf' ||
      mime.includes('markdown'))
  ) {
    return { mime, text: buffer.toString('utf8').slice(0, MAX_TEXT_CHARS), imageUrl: null };
  }

  return {
    mime,
    text: `[Uploaded file — ${Math.round(buffer.length / 1024)}KB, type ${mime ?? 'unknown'}]`,
    imageUrl: null,
  };
}

async function loadUrlContent(sourceRef: string): Promise<{ text: string; title: string | null }> {
  const res = await fetch(sourceRef, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Keeper-LibraryBot/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL (${res.status})`);
  }
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  const raw = await res.text();
  const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? null;

  if (contentType.includes('html')) {
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: stripped.slice(0, MAX_TEXT_CHARS), title };
  }

  return { text: raw.slice(0, MAX_TEXT_CHARS), title };
}

async function resolveAgentForPerspective(agentId: string | null | undefined) {
  if (!agentId) return null;
  return prisma.kip_agents.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, model: true, model_provider: true },
  });
}

async function generatePerspectiveText(params: {
  agentName: string;
  provider: string;
  model: string;
  userId?: string | null;
  prompt: string;
  imageUrl?: string | null;
}): Promise<string> {
  const parts: ModelContentPart[] = [{ type: 'text', text: params.prompt }];
  if (params.imageUrl) {
    parts.push({ type: 'image_url', image_url: { url: params.imageUrl } });
  }

  const response = await ModelProviderService.callModel({
    provider: params.provider as 'openai' | 'anthropic' | 'together-ai' | 'elevenlabs',
    userId: params.userId ?? undefined,
    messages: [
      {
        role: 'system',
        content:
          'You assess reference materials for a Keeper domain library. Write a concise agent perspective (2–4 sentences): what this item is, why it matters, and how it might be used. Be specific to the content — never generic filler.',
      },
      { role: 'user', content: parts.length === 1 ? params.prompt : parts },
    ],
    settings: {
      model: params.model,
      temperature: 0.3,
      max_tokens: 400,
    },
  });

  if (!response.success || !response.content?.trim()) {
    throw new Error(response.error || 'Agent perspective generation failed');
  }
  return response.content.trim();
}

export async function contextualizeLibraryItem(params: {
  libraryItemId: string;
  sourceType: 'upload' | 'url';
  sourceRef: string;
  displayLabel?: string | null;
  assignedAgentId?: string | null;
  userId?: string | null;
}): Promise<{ agent_perspective: string | null; embeddingStored: boolean }> {
  const agent = await resolveAgentForPerspective(params.assignedAgentId);
  const agentName = agent?.name ?? 'Agent';
  const provider = agent?.model_provider ?? 'openai';
  const model = agent?.model ?? 'gpt-4o-mini';

  let perspective: string | null = null;

  try {
    if (params.sourceType === 'upload') {
      const loaded = await loadUploadContent(params.sourceRef);
      const label = params.displayLabel?.trim() || params.sourceRef.split('/').pop() || 'Upload';
      const prompt = loaded.imageUrl
        ? `Library upload "${label}". Describe what you see in this image and note how it could support this Keeper domain.`
        : `Library upload "${label}" (${loaded.mime ?? 'unknown type'}).\n\nContent excerpt:\n${loaded.text ?? '[empty]'}\n\nSummarize key points and note how this material could support the domain.`;

      perspective = await generatePerspectiveText({
        agentName,
        provider,
        model,
        userId: params.userId,
        prompt,
        imageUrl: loaded.imageUrl,
      });
    } else {
      const loaded = await loadUrlContent(params.sourceRef);
      const label = params.displayLabel?.trim() || loaded.title || params.sourceRef;
      const prompt = `Library link "${label}" (${params.sourceRef}).\n\nFetched content excerpt:\n${loaded.text}\n\nSummarize what this page/resource covers and why it may matter for this Keeper domain.`;

      perspective = await generatePerspectiveText({
        agentName,
        provider,
        model,
        userId: params.userId,
        prompt,
      });
    }
  } catch (err) {
    console.error('[LibraryItemIngestion] Perspective generation failed:', err);
    perspective = `Unable to generate perspective automatically: ${err instanceof Error ? err.message : 'unknown error'}`;
  }

  if (perspective) {
    await prisma.libraryItem.update({
      where: { id: params.libraryItemId },
      data: { agent_perspective: perspective },
    });
  }

  let embeddingStored = false;
  if (perspective) {
    embeddingStored = await embedLibraryItemPerspective(
      params.libraryItemId,
      perspective,
      params.userId,
    );
  }

  return { agent_perspective: perspective, embeddingStored };
}
