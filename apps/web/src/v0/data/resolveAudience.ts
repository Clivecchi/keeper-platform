/**
 * resolveAudience
 *
 * Resolves the visitor's audience role once, at the Frame level.
 * Every rendering decision — UI and Kip — flows from this resolved role.
 *
 * Rules (spec: Keeper JsonFrame Spec v0.1):
 *   Not authenticated  → "guest"
 *   Admin flag present → "admin"   (checked before keeper — admin is a subset of authenticated)
 *   Authenticated      → "keeper"
 *
 * Rule: This is called once in V0Shell. No child component resolves audience independently.
 */

import type { AudienceRole } from "./domain-frame.types"

export interface AuthState {
  isAuthenticated: boolean
  isAdmin: boolean
}

export function resolveAudience(auth: AuthState): AudienceRole {
  if (!auth.isAuthenticated) return "guest"
  if (auth.isAdmin) return "admin"
  return "keeper"
}
