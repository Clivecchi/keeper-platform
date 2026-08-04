"use client"

/**
 * @deprecated Thin re-export shim for the dialogCueing rename (see docs/dialog-cueing-plan.md).
 * Canonical implementation now lives in CastCueBar.tsx. Kept only so untouched call sites
 * (UniversalConversation.tsx, useAgentDialog.ts) keep compiling until their own pass lands.
 * New code should import CastCueBar / CastMemberChip / CastCueSelectionMode directly.
 */

export {
  CastCueBar as BoardInstrumentsBar,
  type CastMemberChip as BoardInstrumentChip,
  type CastCueSelectionMode as InstrumentSelectionMode,
  type CastCueBarProps as BoardInstrumentsBarProps,
} from "./CastCueBar"
