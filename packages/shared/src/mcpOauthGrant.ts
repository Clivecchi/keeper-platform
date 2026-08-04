/** MCP OAuth grant records — External Access list/revoke (Option B). */

export type McpOAuthGrantStatus = 'active' | 'revoked';

export type McpOAuthGrantRecord = {
  id: string;
  domain_id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  scopes: string[];
  status: McpOAuthGrantStatus;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};
