/**
 * Agent class role — responsibility, not identity.
 * Lead is a role any Agent may hold. Kip is a named Agent who currently holds it.
 */

export function isLeadAgentRole(role: string | null | undefined): boolean {
  return role?.trim().toLowerCase() === 'lead';
}
