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

/**
 * Create a new draft moment
 */
export async function createDraftMoment(options: {
  themeSlug?: string;
  title?: string;
  body?: string;
}): Promise<DraftMoment> {
  const response = await fetch(`${API_BASE_URL}/api/v0/moments/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      themeSlug: options.themeSlug,
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
  }
): Promise<DraftMoment> {
  const response = await fetch(`${API_BASE_URL}/api/v0/moments/drafts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
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
export async function getDraftMoment(id: string): Promise<DraftMoment> {
  const response = await fetch(`${API_BASE_URL}/api/v0/moments/drafts/${id}`);

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
export async function keepMoment(id: string): Promise<KeptMoment> {
  const response = await fetch(`${API_BASE_URL}/api/v0/moments/${id}/keep`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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