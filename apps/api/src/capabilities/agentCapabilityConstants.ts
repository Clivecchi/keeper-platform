/**
 * Core capability strings from Keeper Agent Capability Architecture (May 2026).
 * Infrastructure capabilities live in infraCapabilities.ts.
 */

export const CORE_CAPABILITIES = {
  ACTIONS_EXECUTE: 'actions.execute',
  ACTIONS_RECEIPT: 'actions.receipt',
  SESSIONS_PERSIST: 'sessions.persist',
  SESSIONS_RESUME: 'sessions.resume',
  SOLE_READ: 'sole.read',
  SOLE_WRITE: 'sole.write',
  ECHO_RECEIVE: 'echo.receive',
  DRAFTS_CREATE: 'drafts.create',
} as const;

/** Jev Probe — typed questions over supplied evidence. Kip action, not an MCP tool. */
export const JEV_PROBE_CAPABILITY = 'jev.probe';

export type CoreCapability = (typeof CORE_CAPABILITIES)[keyof typeof CORE_CAPABILITIES];
