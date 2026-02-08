import { getAuthToken } from '../../lib/authTokenStore';

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

export interface MomentClaim {
  token: string;
  expiresAt?: string;
}

export interface KeptMomentResult {
  data: KeptMoment;
  claim?: MomentClaim;
}

interface DomainScopedOptions {
  domainSlug?: string;
  /** Active journey to bind the moment to */
  journeyId?: string;
  /** Active keeper to bind the moment to */
  keeperId?: string;
}

interface DraftRequestOptions extends DomainScopedOptions {
  includeAnonymousKey?: boolean;
}

function hasSessionCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith('keeper_session='));
}

function generateAnonKey() {
  if (typeof window === 'undefined') return undefined;
  const cryptoObj = window.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function getOrCreateAnonKey(domainSlug?: string) {
  if (typeof window === 'undefined' || !domainSlug) return undefined;
  const storageKey = `keeper_anon_moment_key:${domainSlug}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = generateAnonKey();
  if (!next) return undefined;
  window.localStorage.setItem(storageKey, next);
  return next;
}

function buildDomainHeaders(options?: DraftRequestOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Inject JWT auth token if available (primary auth mechanism)
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options?.domainSlug) {
    headers['x-domain-slug'] = options.domainSlug;
  }

  const shouldIncludeAnon =
    options?.includeAnonymousKey !== false &&
    options?.domainSlug &&
    !hasSessionCookie() &&
    !token; // Skip anon key if we have a real auth token

  if (shouldIncludeAnon) {
    const anonKey = getOrCreateAnonKey(options.domainSlug);
    if (anonKey) {
      headers['x-anon-key'] = anonKey;
    }
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

  const headers = buildDomainHeaders({ domainSlug: options.domainSlug });
  const url = `${API_BASE_URL}/api/v0/moments/drafts`;
  logDraftRequest('createDraft', url, headers);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      domainSlug: options.domainSlug,
      themeSlug: themeSlugSafe,
      title: options.title,
      body: options.body,
    }),
    credentials: 'include',
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
  const headers = buildDomainHeaders({ domainSlug: options?.domainSlug });
  const url = `${API_BASE_URL}/api/v0/moments/drafts/${id}`;
  logDraftRequest('updateDraft', url, headers);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
    credentials: 'include',
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
  const headers = buildDomainHeaders({ domainSlug: options?.domainSlug });
  const url = `${API_BASE_URL}/api/v0/moments/drafts/${id}`;
  logDraftRequest('getDraft', url, headers);

  const response = await fetch(url, { headers, credentials: 'include' });

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
): Promise<KeptMomentResult> {
  const headers = buildDomainHeaders({ domainSlug: options?.domainSlug });
  const url = `${API_BASE_URL}/api/v0/moments/${id}/keep`;
  logDraftRequest('keepDraft', url, headers);

  // Include journey/keeper context in the keep request
  const body: Record<string, string> = {};
  if (options?.journeyId) body.journeyId = options.journeyId;
  if (options?.keeperId) body.keeperId = options.keeperId;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to keep moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to keep moment');
  }

  return {
    data: result.data,
    claim: result.claim,
  };
}

export async function claimMoment(token: string): Promise<KeptMoment> {
  const response = await fetch(`${API_BASE_URL}/api/v0/moments/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to claim moment: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to claim moment');
  }

  return result.data;
}

export interface KeptMomentSummary {
  id: string;
  title: string;
  body: string;
  keptAt: string | null;
  createdAt: string;
  journeyId?: string | null;
  journeyName?: string | null;
  domain?: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function getKeptMoments(options: {
  domainSlug: string;
  limit?: number;
  journeyId?: string;
}): Promise<KeptMomentSummary[]> {
  const url = new URL(`${API_BASE_URL}/api/v0/moments`);
  url.searchParams.set('domainSlug', options.domainSlug);
  url.searchParams.set('status', 'kept');
  if (options.limit) {
    url.searchParams.set('limit', String(options.limit));
  }
  if (options.journeyId) {
    url.searchParams.set('journeyId', options.journeyId);
  }

  const response = await fetch(url.toString(), {
    headers: buildDomainHeaders({ domainSlug: options.domainSlug }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get kept moments: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to get kept moments');
  }

  return result.data;
}