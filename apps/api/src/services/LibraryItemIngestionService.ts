/**
 * LibraryItem ingestion — agent perspective generation on create (upload + url only, Pass 1).
 */

import { prisma } from '@keeper/database';
import { ModelProviderService } from './ModelProviderService.js';
import type { ModelContentPart } from './ModelProviderService.js';
import { embedLibraryItemPerspective } from './LibraryItemEmbeddingService.js';
import {
  extractPdfText,
  isGoogleDocUrl,
  isPdfBuffer,
  PDF_MAX_BYTES,
  PDF_MAX_EXTRACT_CHARS,
} from './pdfTextExtract.js';

const IMAGE_MIME_PREFIXES = ['image/'];
const TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml', 'application/javascript'];
const MAX_FETCH_BYTES = 512_000;
const MAX_TEXT_CHARS = 12_000;
const LIBRARY_READ_MAX_CHARS = PDF_MAX_EXTRACT_CHARS;

export type LibraryReadableKind = 'pdf' | 'text' | 'html' | 'image' | 'binary' | 'google-doc' | 'empty';

export type LibraryReadableText = {
  text: string;
  mime: string | null;
  kind: LibraryReadableKind;
  note?: string;
};

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

export async function fetchBlobWithAuth(url: string): Promise<Response> {
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

async function loadUploadContent(
  sourceRef: string,
  options?: { maxTextChars?: number; maxFetchBytes?: number },
): Promise<{
  mime: string | null;
  text: string | null;
  kind: LibraryReadableKind;
  note?: string;
  imageBase64: string | null;
  imageMediaType: string | null;
}> {
  const maxTextChars = options?.maxTextChars ?? MAX_TEXT_CHARS;
  const maxFetchBytes = options?.maxFetchBytes ?? MAX_FETCH_BYTES;
  const res = await fetchBlobWithAuth(sourceRef);
  if (!res.ok) {
    throw new Error(`Failed to fetch upload (${res.status})`);
  }
  const mime = res.headers.get('content-type')?.split(';')[0]?.trim() ?? guessMimeFromRef(sourceRef);

  if (isImageMime(mime)) {
    const buffer = Buffer.from(await res.arrayBuffer());
    const mediaType = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
    return {
      mime,
      text: null,
      kind: 'image',
      imageBase64: buffer.toString('base64'),
      imageMediaType: mediaType,
    };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const pdf = mime === 'application/pdf' || isPdfBuffer(buffer);
  if (pdf) {
    const slice = buffer.length > PDF_MAX_BYTES ? buffer.subarray(0, PDF_MAX_BYTES) : buffer;
    const extracted = extractPdfText(slice, maxTextChars);
    if (extracted.text.trim()) {
      return {
        mime: mime || 'application/pdf',
        text: extracted.text,
        kind: 'pdf',
        imageBase64: null,
        imageMediaType: null,
      };
    }
    return {
      mime: mime || 'application/pdf',
      text: null,
      kind: 'pdf',
      note: `PDF has no extractable text (${Math.round(buffer.length / 1024)}KB). It may be scanned images.`,
      imageBase64: null,
      imageMediaType: null,
    };
  }

  if (buffer.length > maxFetchBytes) {
    return {
      mime,
      text: `[Binary upload — ${Math.round(buffer.length / 1024)}KB, type ${mime ?? 'unknown'}]`,
      kind: 'binary',
      imageBase64: null,
      imageMediaType: null,
    };
  }

  if (
    mime &&
    (TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p)) || mime.includes('markdown'))
  ) {
    return {
      mime,
      text: buffer.toString('utf8').slice(0, maxTextChars),
      kind: 'text',
      imageBase64: null,
      imageMediaType: null,
    };
  }

  return {
    mime,
    text: `[Uploaded file — ${Math.round(buffer.length / 1024)}KB, type ${mime ?? 'unknown'}]`,
    kind: 'binary',
    imageBase64: null,
    imageMediaType: null,
  };
}

export async function loadLibraryItemReadableText(params: {
  sourceRef: string;
  sourceType: string;
  maxChars?: number;
}): Promise<LibraryReadableText> {
  const maxChars = params.maxChars ?? LIBRARY_READ_MAX_CHARS;
  const ref = params.sourceRef.trim();
  if (!ref) {
    return { text: '', mime: null, kind: 'empty', note: 'Library item has no source.' };
  }

  if (params.sourceType === 'url') {
    if (isGoogleDocUrl(ref)) {
      return {
        text: '',
        mime: 'text/html',
        kind: 'google-doc',
        note:
          'Private Google Docs cannot be read from Keeper. Export a PDF, upload the file to Library, or paste the text.',
      };
    }
    const loaded = await loadUrlContent(ref, maxChars);
    return {
      text: loaded.text.slice(0, maxChars),
      mime: null,
      kind: 'html',
    };
  }

  const loaded = await loadUploadContent(ref, {
    maxTextChars: maxChars,
    maxFetchBytes: Math.max(MAX_FETCH_BYTES, PDF_MAX_BYTES),
  });
  return {
    text: (loaded.text ?? '').slice(0, maxChars),
    mime: loaded.mime,
    kind: loaded.kind,
    note: loaded.note,
  };
}

export async function attachLibraryItemExtractedText(
  results: Array<{ type: string; status: string; data?: Record<string, unknown> }>,
): Promise<void> {
  for (const result of results) {
    if (result.type !== 'library.read' || result.status !== 'success' || !result.data) continue;
    const item = result.data.item;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as { source_ref?: unknown; source_type?: unknown };
    const sourceRef = typeof record.source_ref === 'string' ? record.source_ref.trim() : '';
    const sourceType = typeof record.source_type === 'string' ? record.source_type : 'upload';
    if (!sourceRef) {
      result.data.extract_note = 'Library item has no source to read.';
      continue;
    }
    try {
      const loaded = await loadLibraryItemReadableText({
        sourceRef,
        sourceType,
        maxChars: LIBRARY_READ_MAX_CHARS,
      });
      if (loaded.text.trim()) {
        result.data.extracted_text = loaded.text.trim();
        result.data.content_kind = loaded.kind;
      } else {
        result.data.extract_note =
          loaded.note
          || 'No extractable document text. agent_perspective is a short summary, not the body.';
        result.data.content_kind = loaded.kind;
      }
    } catch (err) {
      result.data.extract_note = `Could not fetch library file: ${
        err instanceof Error ? err.message : 'unknown error'
      }`;
    }
  }
}

async function loadUrlContent(
  sourceRef: string,
  maxChars: number = MAX_TEXT_CHARS,
): Promise<{ text: string; title: string | null }> {
  const res = await fetch(sourceRef, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Keeper-LibraryBot/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL (${res.status})`);
  }
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (contentType === 'application/pdf' || isPdfBuffer(buffer) || /\.pdf(\?|$)/i.test(sourceRef)) {
    const extracted = extractPdfText(buffer, maxChars);
    return { text: extracted.text, title: null };
  }

  const raw = buffer.toString('utf8');
  const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? null;

  if (contentType.includes('html')) {
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: stripped.slice(0, maxChars), title };
  }

  return { text: raw.slice(0, maxChars), title };
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
  imageBase64?: string | null;
  imageMediaType?: string | null;
  documentText?: string | null;
}): Promise<string> {
  const parts: ModelContentPart[] = [{ type: 'text', text: params.prompt }];

  if (params.documentText?.trim()) {
    parts.push({
      type: 'text',
      text: `\n\n--- File content ---\n${params.documentText.trim()}`,
    });
  }

  if (params.imageBase64 && params.imageMediaType) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${params.imageMediaType};base64,${params.imageBase64}`,
      },
    });
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
      { role: 'user', content: parts },
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
      const prompt = loaded.imageBase64
        ? `Library upload "${label}". Describe what you see in this image and note how it could support this Keeper domain.`
        : `Library upload "${label}" (${loaded.mime ?? 'unknown type'}). Summarize key points from the file content and note how this material could support the domain.`;

      perspective = await generatePerspectiveText({
        agentName,
        provider,
        model,
        userId: params.userId,
        prompt,
        imageBase64: loaded.imageBase64,
        imageMediaType: loaded.imageMediaType,
        documentText: loaded.imageBase64 ? null : loaded.text,
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
