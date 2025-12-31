export type StudioAdminRole = 'DomainLead' | 'AgentDev' | 'AgentDeveloper';

function safeBase64UrlDecode(input: string): string | null {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const json = safeBase64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isStudioAdminFromToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const roles: unknown = (payload['roles'] as unknown) ?? (payload['platformRoles'] as unknown) ?? (payload['permissions'] as unknown);
  if (Array.isArray(roles)) {
    return roles.includes('DomainLead') || roles.includes('AgentDev') || roles.includes('AgentDeveloper');
  }
  if (typeof roles === 'string') {
    const norm = roles.split(/[ ,]/g).map((s) => s.trim());
    return norm.includes('DomainLead') || norm.includes('AgentDev') || norm.includes('AgentDeveloper');
  }
  return false;
}


