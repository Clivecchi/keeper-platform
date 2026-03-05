"use client"

/**
 * JourneyInvitationSlide — SlideType: journey_invitation
 *
 * The default cover card. Entry point to a Journey.
 * Renders from the domain frame JSON — no hardcoded content.
 *
 * Shows:
 *   - Domain wordmark    from domainFrame.theme.wordmark
 *   - Domain tagline     from domainFrame.theme.tagline
 *   - Forward button     label from domainFrame.forward.label
 *                        action triggers onForward()
 *
 * Available to all audience roles (guest, keeper, admin).
 *
 * Spec: Keeper JsonFrame Spec v0.1 · March 2026 — Step 5
 */

interface JourneyInvitationSlideProps {
  wordmark: string
  tagline: string
  forwardLabel: string
  onForward: () => void
}

export function JourneyInvitationSlide({
  wordmark,
  tagline,
  forwardLabel,
  onForward,
}: JourneyInvitationSlideProps) {
  return (
    <section
      aria-label="Journey invitation"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
    >
      {/* Wordmark */}
      <h2
        className="text-3xl md:text-4xl font-serif tracking-wide"
        style={{ color: "var(--theme-ink-primary)" }}
      >
        {wordmark}
      </h2>

      {/* Tagline */}
      <p
        className="text-sm leading-relaxed max-w-xs"
        style={{ color: "var(--theme-ink-secondary)" }}
      >
        {tagline}
      </p>

      {/* Forward CTA */}
      <button
        type="button"
        onClick={onForward}
        className="mt-2 rounded-full border px-5 py-2 text-[11px] font-medium tracking-wide uppercase transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
          color: "var(--theme-ink-primary)",
          letterSpacing: "0.12em",
        }}
      >
        {forwardLabel}
      </button>
    </section>
  )
}
