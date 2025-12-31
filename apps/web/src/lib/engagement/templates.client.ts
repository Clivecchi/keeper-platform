/**
 * Engagement Template Client
 * ==========================
 * Fetch and cache engagement template definitions
 */

import { EngagementTemplate } from './types';

const cache = new Map<string, EngagementTemplate>();

export async function getTemplateByKey(templateKey: string): Promise<EngagementTemplate> {
  if (cache.has(templateKey)) {
    return cache.get(templateKey)!;
  }

  const res = await fetch(`/api/engagement/templates/${encodeURIComponent(templateKey)}`, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to load template ${templateKey}: ${res.status}`);
  }

  const data = (await res.json()) as EngagementTemplate;
  cache.set(templateKey, data);
  return data;
}

export function clearTemplateCache() {
  cache.clear();
}

export function getCachedTemplate(templateKey: string): EngagementTemplate | undefined {
  return cache.get(templateKey);
}

