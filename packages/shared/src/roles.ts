export type DomainRole = 'admin' | 'user' | 'friend' | 'connection';
export interface RoleInfo {
  label: string;
  description: string;
}

export const ROLE_MAP: Record<DomainRole, RoleInfo> = {
  admin: { label: 'Admin', description: 'Full access to manage the domain' },
  user: { label: 'User', description: 'Read, write, and share content' },
  friend: { label: 'Friend', description: 'Collaborator with limited write access' },
  connection: { label: 'Connection', description: 'Read-only access' },
};

export const ROLE_OPTIONS = Object.entries(ROLE_MAP).map(([key, value]) => ({ value: key as DomainRole, label: value.label })); 