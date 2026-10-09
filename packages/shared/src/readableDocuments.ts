/**
 * Text documents an agent can read from an upload.
 * PDF and images stay on their own paths. Word and Excel are not text.
 */

export const READABLE_TEXT_EXTENSIONS = [
  'md',
  'markdown',
  'mdx',
  'txt',
  'text',
  'log',
  'json',
  'csv',
  'tsv',
  'yaml',
  'yml',
  'xml',
  'html',
  'htm',
  'rtf',
  'ini',
  'toml',
  'cfg',
  'conf',
] as const;

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  mdx: 'text/markdown',
  txt: 'text/plain',
  text: 'text/plain',
  log: 'text/plain',
  json: 'application/json',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  rtf: 'application/rtf',
  ini: 'text/plain',
  toml: 'application/toml',
  cfg: 'text/plain',
  conf: 'text/plain',
};

const GENERIC_CONTENT_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-download',
  'application/force-download',
  'application/binary',
]);

export const READABLE_TEXT_FILE_ACCEPT = [
  ...READABLE_TEXT_EXTENSIONS.map((extension) => `.${extension}`),
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/xml',
  'application/yaml',
].join(',');

/** Composer and Library file pickers: images, PDF, and readable text. */
export const AGENT_ATTACHMENT_ACCEPT = `image/*,.pdf,application/pdf,${READABLE_TEXT_FILE_ACCEPT}`;

export function fileExtension(nameOrUrl: string | null | undefined): string | null {
  if (!nameOrUrl?.trim()) return null;
  const path = nameOrUrl.trim().split('?')[0]?.split('#')[0] ?? '';
  const base = path.split('/').pop() ?? path;
  const match = base.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isReadableTextDocument(nameOrUrl: string | null | undefined): boolean {
  const extension = fileExtension(nameOrUrl);
  if (!extension) return false;
  return (READABLE_TEXT_EXTENSIONS as readonly string[]).includes(extension);
}

export function isGenericBinaryContentType(mime: string | null | undefined): boolean {
  const normalized = mime?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalized) return true;
  return GENERIC_CONTENT_TYPES.has(normalized);
}

export function isTextContentType(mime: string | null | undefined): boolean {
  const normalized = mime?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalized || isGenericBinaryContentType(normalized)) return false;
  if (normalized.startsWith('text/')) return true;
  return (
    normalized === 'application/json'
    || normalized === 'application/xml'
    || normalized === 'application/yaml'
    || normalized === 'application/x-yaml'
    || normalized === 'application/toml'
    || normalized === 'application/rtf'
    || normalized === 'text/rtf'
    || normalized.includes('markdown')
    || normalized === 'application/javascript'
    || normalized === 'text/javascript'
  );
}

export function contentTypeForTextDocument(nameOrUrl: string | null | undefined): string | null {
  const extension = fileExtension(nameOrUrl);
  if (!extension) return null;
  return EXTENSION_CONTENT_TYPES[extension] ?? null;
}

/** Prefer the filename when the browser or blob store sent a generic type. */
export function uploadContentTypeForFile(
  name: string | null | undefined,
  browserType: string | null | undefined,
): string {
  const fromName = contentTypeForTextDocument(name);
  if (fromName) return fromName;
  const browser = browserType?.split(';')[0]?.trim() ?? '';
  if (browser && !isGenericBinaryContentType(browser)) return browser;
  return browser || 'application/octet-stream';
}

function looksLikeText(sample: Uint8Array | null | undefined): boolean {
  if (!sample || sample.length === 0) return false;
  const slice = sample.subarray(0, 8192);
  let controls = 0;
  for (const byte of slice) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) controls += 1;
  }
  return controls / slice.length < 0.02;
}

export function shouldReadUploadAsText(params: {
  contentType?: string | null;
  name?: string | null;
  sourceRef?: string | null;
  sample?: Uint8Array | null;
}): boolean {
  if (isReadableTextDocument(params.name) || isReadableTextDocument(params.sourceRef)) return true;
  if (isTextContentType(params.contentType)) return true;
  if (isGenericBinaryContentType(params.contentType) && looksLikeText(params.sample)) return true;
  return false;
}
