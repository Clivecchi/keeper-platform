import type { Request } from 'express';

// Domain Context types
export interface DomainContext {
  domain: Record<string, unknown>;
  isCustomDomain: boolean;
  originalHostname: string;
  resolvedSlug: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
  };
  domainContext?: DomainContext;
}

// Domain Permission types
export type DomainRole = 'admin' | 'user' | 'friend' | 'connection';
export type DomainPermissionType = 'read' | 'write' | 'share' | 'admin' | 'invite' | 'delete';

export interface DomainPermissionSummary {
  userId: string;
  role: DomainRole;
  permissions: DomainPermissionType[];
  grantedAt: Date;
  expiresAt?: Date | null;
  isOwner: boolean;
}

export interface UserPermissionSummary {
  domainId: string;
  role: DomainRole;
  permissions: DomainPermissionType[];
  grantedAt: Date;
  expiresAt?: Date;
  isOwner: boolean;
  source: string;
}

export interface GrantPermissionRequest {
  domainId: string;
  userId: string;
  role: DomainRole;
  permissions?: DomainPermissionType[];
  grantedBy: string;
  expiresAt?: Date;
}

export interface PermissionCheck {
  userId: string;
  domainId: string;
  permission: DomainPermissionType;
}

export interface PermissionResult {
  hasPermission: boolean;
  role?: DomainRole;
  permissions: DomainPermissionType[];
  inherited: boolean;
  expiresAt?: Date;
  source: 'direct' | 'ownership' | 'inherited' | 'none';
}

// Type helper for null/undefined conversion
export const convertNullToUndefined = (date: Date | null | undefined): Date | undefined => {
  return date === null ? undefined : date;
}; 