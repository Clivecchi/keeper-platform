"use client"

import * as React from "react"

export function AuthorSaveBar({
  onSave,
  onCancel,
  onDelete,
  saveLabel = "Save",
  deleteLabel = "Delete",
  disabled,
  busy,
  dirty,
  deleteConfirm,
}: {
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  saveLabel?: string
  deleteLabel?: string
  disabled?: boolean
  busy?: boolean
  dirty?: boolean
  deleteConfirm?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || busy || dirty === false}
        className="text-[13px] font-semibold"
        style={{ color: "hsl(var(--theme-accent-primary))" }}
      >
        {busy ? "Saving…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="text-[13px] font-medium"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Cancel
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={() => {
            if (deleteConfirm && !window.confirm(deleteConfirm)) return
            onDelete()
          }}
          disabled={disabled || busy}
          className="ml-auto text-[13px] font-semibold"
          style={{ color: "hsl(var(--theme-status-error))" }}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  )
}

export function AutoGrowTextarea({
  value,
  onChange,
  className,
  style,
  placeholder,
  ariaLabel,
  minHeight = 72,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  ariaLabel?: string
  minHeight?: number
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`
  }, [value, minHeight])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      style={{
        ...style,
        overflow: "hidden",
        resize: "none",
        minHeight,
      }}
    />
  )
}

export function splitDisplayedPointForEdit(point: {
  title: string
  body: { text: string }
}): { title: string; body: string } {
  const title = point.title.trim()
  const body = point.body.text.trim()
  if (title && body.startsWith(title)) {
    const rest = body.slice(title.length).replace(/^\s*\n+/, "")
    return { title, body: rest }
  }
  return { title, body }
}

const TITLE_FIELD =
  "w-full border-0 bg-transparent px-0 py-0 outline-none"
const BODY_FIELD =
  "w-full border-0 bg-transparent px-0 py-0 outline-none"

export function InlinePointFields({
  title,
  body,
  onTitleChange,
  onBodyChange,
  titlePlaceholder = "Point title",
  bodyPlaceholder = "Write the Point",
}: {
  title: string
  body: string
  onTitleChange: (value: string) => void
  onBodyChange: (value: string) => void
  titlePlaceholder?: string
  bodyPlaceholder?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={titlePlaceholder}
        aria-label="Point title"
        autoFocus
        className={`${TITLE_FIELD} text-[20px] font-semibold leading-snug`}
        style={{
          color: "hsl(var(--theme-ink-primary))",
          fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
        }}
      />
      <AutoGrowTextarea
        value={body}
        onChange={onBodyChange}
        placeholder={bodyPlaceholder}
        ariaLabel="Point body"
        minHeight={120}
        className={`${BODY_FIELD} text-[15px] leading-[1.65]`}
        style={{
          color: "hsl(var(--theme-ink-secondary))",
          fontFamily: "var(--theme-font-ui, inherit)",
        }}
      />
    </div>
  )
}

export function AddPointEditor({
  onSubmit,
  onCancel,
  disabled,
}: {
  onSubmit: (title: string, body: string) => void
  onCancel: () => void
  disabled?: boolean
}) {
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const dirty = Boolean(title.trim() || body.trim())

  return (
    <div
      className="my-3 rounded-lg px-1 py-2"
      style={{ border: "1px solid hsl(var(--theme-border-soft) / 0.28)" }}
    >
      <InlinePointFields
        title={title}
        body={body}
        onTitleChange={setTitle}
        onBodyChange={setBody}
      />
      <AuthorSaveBar
        saveLabel="Save Point"
        dirty={dirty}
        disabled={disabled}
        onSave={() => {
          if (!dirty) return
          onSubmit(title.trim(), body.trim())
        }}
        onCancel={onCancel}
      />
    </div>
  )
}

export function AddNamedEditor({
  placeholder,
  saveLabel,
  onSubmit,
  onCancel,
  disabled,
}: {
  placeholder: string
  saveLabel: string
  onSubmit: (value: string) => void
  onCancel: () => void
  disabled?: boolean
}) {
  const [value, setValue] = React.useState("")
  const dirty = Boolean(value.trim())

  return (
    <div className="py-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus
        aria-label={placeholder}
        className="w-full border-0 bg-transparent px-0 py-1 text-[16px] font-semibold outline-none"
        style={{
          color: "hsl(var(--theme-ink-primary))",
          fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
        }}
      />
      <AuthorSaveBar
        saveLabel={saveLabel}
        dirty={dirty}
        disabled={disabled}
        onSave={() => {
          if (!dirty) return
          onSubmit(value.trim())
        }}
        onCancel={onCancel}
      />
    </div>
  )
}
