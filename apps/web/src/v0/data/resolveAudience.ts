/**
 * resolveAudience
 *
 * @deprecated Use `resolveDomainAudience` from `@keeper/shared` with domain role context.
 * Legacy helper without friend/connection domain roles.
 */

import type { AudienceRole } from "./domain-frame.types"
import { resolveDomainAudience } from "@keeper/shared"

export interface AuthState {
  isAuthenticated: boolean
  isAdmin: boolean
}

export function resolveAudience(auth: AuthState): AudienceRole {
  return resolveDomainAudience({
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    isOwner: false,
    domainRole: null,
  })
}
