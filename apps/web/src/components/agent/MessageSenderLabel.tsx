import clsx from "clsx"

export type MessageSenderVariant = "agent" | "user" | "collaborator" | "echo" | "delegation-failed"

export interface MessageSenderLabelProps {
  name: string
  variant?: MessageSenderVariant
  className?: string
}

/** Gloss-inspired pill identifying who sent a dialog message. */
export function MessageSenderLabel({
  name,
  variant = "agent",
  className,
}: MessageSenderLabelProps) {
  const trimmed = name.trim()
  if (!trimmed) return null

  return (
    <span
      className={clsx("dialog-sender-label", `dialog-sender-label--${variant}`, className)}
      title={trimmed}
    >
      {variant !== "user" ? (
        <span className="dialog-sender-label__mark" aria-hidden>
          ∞
        </span>
      ) : null}
      <span className="dialog-sender-label__name">{trimmed}</span>
    </span>
  )
}
