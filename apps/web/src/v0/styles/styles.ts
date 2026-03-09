/**
 * styles.ts — compatibility shim
 *
 * StyleId is now the canonical source in styleRegistry.ts.
 * This file re-exports it so all existing frame imports remain unchanged.
 * The legacy --v0-* theme vars and Style/ToneId runtime objects have been removed.
 */
export type { StyleId } from './styleRegistry'
