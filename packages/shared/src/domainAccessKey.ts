/** Domain external access key scopes — MCP capability gates. */
export const DOMAIN_ACCESS_KEY_SCOPES = ['library.ro', 'library.rw', 'gloss.rw'] as const;

export type DomainAccessKeyScope = (typeof DOMAIN_ACCESS_KEY_SCOPES)[number];

export type DomainAccessKeyStatus = 'active' | 'revoked';

export type DomainAccessKeyRecord = {
  id: string;
  domain_id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  status: DomainAccessKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainAccessKeyCreateResult = DomainAccessKeyRecord & {
  /** Shown once at creation — never stored or returned again. */
  secret: string;
};

export function isDomainAccessKeyScope(value: string): value is DomainAccessKeyScope {
  return (DOMAIN_ACCESS_KEY_SCOPES as readonly string[]).includes(value);
}
