/**
 * Engagement Template Submission
 * ===============================
 * Submit actions to engagement template endpoints
 */

import { SubmitOptions, EngagementTemplate, SubmitResult } from './types';

export async function submitTemplate(
  template: EngagementTemplate,
  payload: Record<string, any>,
  opts: SubmitOptions = {}
): Promise<SubmitResult> {
  const body = { ...payload, ...opts };
  const method = template.method ?? 'POST';
  const url = resolveTemplateEndpoint(template, payload);

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(
      `Template submit failed: ${res.status} ${err.message || err.error || JSON.stringify(err)}`
    );
  }

  return safeJson(res);
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Resolve template endpoint with parameter substitution
 * Supports :param placeholders (e.g., /api/boards/:boardId/publish)
 */
function resolveTemplateEndpoint(template: EngagementTemplate, payload: Record<string, any>): string {
  let endpoint = template.endpoint;

  // If endpoint is already a full path, use it
  if (endpoint.startsWith('/api/')) {
    // Replace :param placeholders with actual values
    endpoint = endpoint.replace(/:(\w+)/g, (match, param) => {
      return payload[param] || match;
    });
    return endpoint;
  }

  // Map logical keys to concrete URLs
  const endpointMap: Record<string, string> = {
    'domain.board.setViewerMode': '/api/boards/:boardId/viewer-mode',
    'domain.board.addFrame': '/api/boards/:boardId/frames',
    'domain.board.updateFrame': '/api/boards/frames/:frameId',
    'domain.board.setCover': '/api/boards/:boardId/cover',
    'domain.board.upsertPathwayNav': '/api/boards/:boardId/nav',
    'domain.board.publish': '/api/boards/:boardId/publish',
    'domain.public.contact': '/api/domains/:domainId/contact',
    'domain.admin.update': '/api/domains/:domainId',
    'domain.admin.verify': '/api/domains/:domainId/custom-domain/verify',
    'domain.admin.addCustomDomain': '/api/domains/:domainId/custom-domain',
    'domain.admin.editApiKey': '/api/kip/user-keys',
    'domain.admin.assignAgent': '/api/domains/:domainId',
  };

  endpoint = endpointMap[endpoint] || `/api/engagement/${encodeURIComponent(endpoint)}`;

  // Replace :param placeholders
  endpoint = endpoint.replace(/:(\w+)/g, (match, param) => {
    return payload[param] || match;
  });

  return endpoint;
}

