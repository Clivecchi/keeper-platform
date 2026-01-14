const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface DraftMoment {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'kept';
  themeSlug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeptMoment {
  id: string;
  title: string;
  body: string;
  status: 'kept';
  keptAt: string;
  createdAt: string;
  updatedAt: string;
}

interface DomainScopedOptions {
  domainSlug?: string;
}

function buildDomainHeaders(domainSlug?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (domainSlug) {
    headers['x-domain-slug'] = domainSlug;
  }

  return headers;
}

function logDraftRequest(
  label: string,
  url: string,
  headers: Record<string, string>
) {
  if (import.meta.env.DEV) {
    console.log('[v0Moments] Draft request', {
      label,
      url,
      headers,
      hasDomainSlug: Boolean(headers['x-domain-slug']),
    });
  }
}

/**
 * Create a new draft moment
 */
export async function createDraftMoment(options: {
  themeSlug?: string;
  title?: string;
  body?: string;
  domainSlug?: string;
}): Promise<DraftMoment> {
  // Ensure themeSlug is never null - default to 'neutral'
  const themeSlugSafe = options.themeSlug || 'neutral'

  const headers = buildDomainHeaders(options.domainSlug);
  const url = `${API_BASE_URL}/api/v0/moments/drafts`;
  logDraftRequest('createDraft', url, headers);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      themeSlug: themeSlugSafe,
      title: options.title,
      body: options.body,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create draft moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create draft moment');
  }

  return result.data;
}

/**
 * Update a draft moment
 */
export async function updateDraftMoment(
  id: string,
  updates: {
    title?: string;
    body?: string;
    themeSlug?: string;
  },
  options?: DomainScopedOptions
): Promise<DraftMoment> {
  const headers = buildDomainHeaders(options?.domainSlug);
  const url = `${API_BASE_URL}/api/v0/moments/drafts/${id}`;
  logDraftRequest('updateDraft', url, headers);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update draft moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to update draft moment');
  }

  return result.data;
}

/**
 * Get a draft moment (for loading on page refresh)
 */
export async function getDraftMoment(
  id: string,
  options?: DomainScopedOptions
): Promise<DraftMoment> {
  const headers = buildDomainHeaders(options?.domainSlug);
  const url = `${API_BASE_URL}/api/v0/moments/drafts/${id}`;
  logDraftRequest('getDraft', url, headers);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to get draft moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get draft moment');
  }

  return result.data;
}

/**
 * Mark a moment as kept (published)
 */
export async function keepMoment(
  id: string,
  options?: DomainScopedOptions
): Promise<KeptMoment> {
  const headers = buildDomainHeaders(options?.domainSlug);
  const url = `${API_BASE_URL}/api/v0/moments/${id}/keep`;
  logDraftRequest('keepDraft', url, headers);

  const response = await fetch(url, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to keep moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to keep moment');
  }

  return result.data;
}