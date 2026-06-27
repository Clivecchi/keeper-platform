/**
 * Action Receipt Card Component
 * ==============================
 *
 * Renders a standardized action execution receipt in the chat UI.
 * Journey, Path, and Moment creation render as rich tappable cards.
 * All other actions fall back to the compact receipt layout.
 */

import React from "react"

export interface ActionReceipt {
  type: string
  status: "success" | "error" | "skipped"
  message: string
  errorCode?: string
  data?: {
    entityIds?: string[]
    draft?: { id: string; title: string; kind: string; key: string }
    moment?: { id: string; title: string; narrative?: string | null; journeyId?: string | null }
    journey?: { id: string; name: string; forward?: string | null }
    path?: { id: string; name: string; prelude?: string | null }
    links?: { open?: string; edit?: string }
    [key: string]: unknown
  }
}

export interface ActionReceiptCardProps {
  receipt: ActionReceipt
  onOpenDraft?: (draftId: string) => void
  onOpenMoment?: (momentId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenSoleMemory?: (memoryCardId: string) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    "draft.create": "Created",
    "draft.update": "Updated",
    "draft.delete": "Deleted",
    "draft.setActive": "Set active",
    "draft.list": "Listed",
    "draft.get": "Retrieved",
    "draft.read": "Retrieved",
    "draft.update.propose": "Proposed update",
    "moment.create": "Moment captured",
    "moment.keep": "Moment captured",
    "sole.save": "Memory saved",
    "image.generate": "Image generated",
    "journey.create": "Journey created",
    "journey.update": "Journey updated",
    "path.create": "Path created",
    "path.update": "Path updated",
  }
  return labels[actionType] || "Completed"
}

function EntityLink({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  if (!onClick) return <>{children}</>
  return (
    <button
      type="button"
      onClick={onClick}
      className={`underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1 rounded ${className ?? ""}`}
      style={{ color: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
    >
      {children}
    </button>
  )
}

// ─── Rich entity cards (Journey / Path / Moment) ───────────────────────────

function JourneyReceiptCard({
  journey,
  onOpen,
}: {
  journey: { id: string; name: string; forward?: string | null }
  onOpen?: () => void
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: "hsl(var(--theme-surface-paper) / 0.95)",
      }}
    >
      <div
        className="px-3 py-1.5 border-b flex items-center gap-1.5"
        style={{
          borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
          background: "hsl(var(--theme-surface-elevated) / 0.6)",
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Journey
        </span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
          style={{ background: "hsl(142 40% 94%)", color: "hsl(142 50% 30%)", border: "1px solid hsl(142 30% 82%)" }}
        >
          Created
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {journey.name}
        </p>
        {journey.forward?.trim() && (
          <p className="mt-1 text-[11px] leading-relaxed line-clamp-2" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {journey.forward.trim()}
          </p>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 text-[11px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
          >
            Open Journey →
          </button>
        )}
      </div>
    </div>
  )
}

function PathReceiptCard({
  path,
}: {
  path: { id: string; name: string; prelude?: string | null }
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: "hsl(var(--theme-surface-paper) / 0.95)",
      }}
    >
      <div
        className="px-3 py-1.5 border-b flex items-center gap-1.5"
        style={{
          borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
          background: "hsl(var(--theme-surface-elevated) / 0.6)",
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Path
        </span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
          style={{ background: "hsl(210 40% 94%)", color: "hsl(210 50% 35%)", border: "1px solid hsl(210 30% 82%)" }}
        >
          Created
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {path.name}
        </p>
        {path.prelude?.trim() && (
          <p className="mt-1 text-[11px] leading-relaxed line-clamp-2" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {path.prelude.trim()}
          </p>
        )}
      </div>
    </div>
  )
}

function MomentReceiptCard({
  moment,
  onOpen,
}: {
  moment: { id: string; title: string; narrative?: string | null; journeyId?: string | null }
  onOpen?: () => void
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: "hsl(var(--theme-surface-paper) / 0.95)",
      }}
    >
      <div
        className="px-3 py-1.5 border-b flex items-center gap-1.5"
        style={{
          borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
          background: "hsl(var(--theme-surface-elevated) / 0.6)",
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Moment
        </span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
          style={{ background: "hsl(142 40% 94%)", color: "hsl(142 50% 30%)", border: "1px solid hsl(142 30% 82%)" }}
        >
          Captured
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {moment.title}
        </p>
        {moment.narrative?.trim() && (
          <p className="mt-1 text-[11px] leading-relaxed line-clamp-3" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {moment.narrative.trim()}
          </p>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 text-[11px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
          >
            Open Moment →
          </button>
        )}
      </div>
    </div>
  )
}

function SoleMemoryReceiptCard({
  topic,
  message,
  onOpen,
}: {
  topic?: string | null
  message: string
  onOpen?: () => void
}) {
  const title = topic?.trim() || message.replace(/^Memory saved:\s*/i, "").replace(/^"|"$/g, "") || "Reflection"

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        background: "hsl(var(--theme-surface-paper) / 0.95)",
      }}
    >
      <div
        className="px-3 py-1.5 border-b flex items-center gap-1.5"
        style={{
          borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
          background: "hsl(var(--theme-surface-elevated) / 0.6)",
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          SOLE Memory
        </span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
          style={{ background: "hsl(38 40% 94%)", color: "hsl(38 50% 30%)", border: "1px solid hsl(38 30% 82%)" }}
        >
          Saved
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          SOLE memory card recorded
        </p>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 text-[11px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
          >
            View in Chronicle →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export const ActionReceiptCard: React.FC<ActionReceiptCardProps> = ({
  receipt,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onOpenSoleMemory,
}) => {
  const { type, status, message, errorCode, data } = receipt
  const draft =
    data?.draft ??
    (typeof data?.draftId === "string"
      ? {
          id: data.draftId,
          title: typeof data?.title === "string" ? data.title : "Draft",
          kind: typeof data?.kind === "string" ? data.kind : "draft",
          key: typeof data?.key === "string" ? data.key : data.draftId,
        }
      : undefined)
  const moment = data?.moment as { id: string; title: string; narrative?: string | null; journeyId?: string | null } | undefined
  const journey = data?.journey as { id: string; name: string; forward?: string | null } | undefined
  const path = data?.path as { id: string; name: string; prelude?: string | null } | undefined
  const memoryCard = data?.memoryCard as { id?: string; topic?: string | null } | undefined
  const isSoleSave = type === "sole.save"
  const isImageGenerate = type === "image.generate"

  // SOLE memory saved — rich card with Chronicle navigation
  if (status === "success" && isSoleSave && memoryCard?.id) {
    return (
      <SoleMemoryReceiptCard
        topic={memoryCard.topic ?? (typeof data?.topic === "string" ? data.topic : null)}
        message={message}
        onOpen={onOpenSoleMemory ? () => onOpenSoleMemory(memoryCard.id!) : undefined}
      />
    )
  }

  // Image generation — render the image directly (success only)
  if (isImageGenerate && status === "success") {
    const imageUrl = data?.imageUrl as string | undefined
    const imagePrompt = data?.imagePrompt as string | undefined
    const subject = data?.subject as string | undefined

    if (imageUrl) {
      return (
        <div
          className="overflow-hidden rounded-xl border"
          style={{
            borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
            backgroundColor: "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
          }}
        >
          <img src={imageUrl} alt={subject ?? "Generated image"} className="w-full object-cover" loading="lazy" />
          {imagePrompt && (
            <p className="px-3 py-2 text-xs leading-relaxed" style={{ color: "var(--theme-ink-tertiary-color)" }}>
              {imagePrompt}
            </p>
          )}
        </div>
      )
    }
  }

  // Journey created/updated — rich card
  if (status === "success" && journey && (type === "journey.create" || type === "journey.update")) {
    return (
      <JourneyReceiptCard
        journey={journey}
        onOpen={onOpenJourney ? () => onOpenJourney(journey.id) : undefined}
      />
    )
  }

  // Path created/updated — rich card
  if (status === "success" && path && (type === "path.create" || type === "path.update")) {
    return <PathReceiptCard path={path} />
  }

  // Moment created/kept — rich card
  if (status === "success" && moment && (type === "moment.create" || type === "moment.keep" || type === "moment.capture")) {
    return (
      <MomentReceiptCard
        moment={moment}
        onOpen={onOpenMoment ? () => onOpenMoment(moment.id) : undefined}
      />
    )
  }

  // Error state
  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-xs font-semibold text-red-800">✗ Failed</p>
        <p className="mt-1 text-sm text-red-700">{message}</p>
        {errorCode && <p className="mt-1 text-xs text-red-600">Error code: {errorCode}</p>}
      </div>
    )
  }

  // Skipped state
  if (status === "skipped") {
    return (
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-panel) / 0.8)",
        }}
      >
        <p className="text-xs font-semibold" style={{ color: "var(--theme-ink-secondary-color)" }}>
          ⊘ Skipped
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--theme-ink-secondary-color)" }}>
          {message}
        </p>
      </div>
    )
  }

  // Default success state — compact receipt
  const actionLabel = getActionLabel(type)
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        backgroundColor: "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: "var(--theme-ink-primary-color)" }}>
            ✓ {actionLabel}
            {draft?.title && (
              <>
                :{" "}
                <EntityLink onClick={onOpenDraft && draft?.id ? () => onOpenDraft(draft.id) : undefined}>
                  {draft.title}
                </EntityLink>
              </>
            )}
          </p>
          {moment && (
            <p className="mt-1 text-xs" style={{ color: "var(--theme-ink-secondary-color)" }}>
              Moment{" "}
              <EntityLink onClick={onOpenMoment ? () => onOpenMoment(moment.id) : undefined}>
                {moment.title}
              </EntityLink>{" "}
              created and kept
            </p>
          )}
          {message && !moment && (draft?.title || isSoleSave) &&
            message !== `Draft ${actionLabel.toLowerCase()} successfully` && (
              <p className="mt-1 text-xs" style={{ color: "var(--theme-ink-secondary-color)" }}>
                {message}
              </p>
            )}
          {message && !moment && !draft?.title && !isSoleSave && (
            <p className="mt-1 text-xs" style={{ color: "var(--theme-ink-secondary-color)" }}>
              {message}
            </p>
          )}
          {isSoleSave && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--theme-ink-tertiary-color)" }}>
              SOLE memory card recorded
            </p>
          )}
          {draft && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--theme-ink-tertiary-color)" }}>
              {draft.kind} · {draft.key}
            </p>
          )}
        </div>
      </div>
      {onOpenDraft && draft?.id && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onOpenDraft(draft.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
          >
            View Draft →
          </button>
        </div>
      )}
    </div>
  )
}
