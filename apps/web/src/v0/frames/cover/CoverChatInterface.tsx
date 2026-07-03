"use client"

import * as React from "react"
import type { AudienceRole, DomainFrameCoverChatInterface } from "../../data/domain-frame.types"
import { isVisibleToAudience } from "@keeper/shared"

export interface CoverChatInterfaceProps {
  chat_interface: DomainFrameCoverChatInterface
  domainSlug: string
  /** From `V0ShellContext.resolvedAudience` — never re-resolved here. */
  audience: AudienceRole | null
  /** Opens the full Companion diary panel (threshold tease only on Cover). */
  onOpenCompanion?: () => void
}

/** Merge partial JSON with safe defaults for gating. */
export function mergeCoverChatInterface(
  raw: DomainFrameCoverChatInterface | undefined,
): DomainFrameCoverChatInterface {
  return {
    enabled: false,
    available_to: [],
    ...raw,
  }
}

export function CoverChatInterface({
  chat_interface,
  domainSlug,
  audience,
  onOpenCompanion,
}: CoverChatInterfaceProps) {
  const {
    label,
    enabled,
    placeholder,
    available_to,
    submit_label: submitLabel,
  } = chat_interface

  void domainSlug

  if (!enabled || !audience || !isVisibleToAudience(available_to, audience)) {
    return null
  }

  const hint =
    placeholder?.trim() ||
    "Ask Kip which journey to start with — or press Forward to begin the featured story."

  return (
    <section
      aria-label={label ?? "Cover orientation"}
      className="mt-6 w-full max-w-md border-t pt-6 text-center"
      style={{ borderColor: "var(--theme-border-soft)" }}
    >
      {label ? (
        <p
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "var(--theme-ink-tertiary)" }}
        >
          {label}
        </p>
      ) : null}

      <p className="text-sm leading-relaxed" style={{ color: "var(--theme-ink-secondary)" }}>
        {hint}
      </p>

      {onOpenCompanion ? (
        <button
          type="button"
          onClick={onOpenCompanion}
          className="mt-4 rounded-full border px-4 py-2 text-[11px] font-medium uppercase tracking-wide transition-opacity hover:opacity-90"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.75)",
            color: "var(--theme-ink-primary)",
          }}
        >
          {submitLabel ?? "Talk to Kip"}
        </button>
      ) : null}
    </section>
  )
}
