"use client"

import * as React from "react"

const FIELD =
  "w-full border-0 border-b bg-transparent px-0 py-1.5 text-[13px] outline-none"

export function AddNamedRow({
  placeholder,
  label,
  onSubmit,
  disabled,
}: {
  placeholder: string
  label: string
  onSubmit: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="text-[12px] font-medium"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {label}
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-1.5 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        const next = value.trim()
        if (!next) return
        onSubmit(next)
        setValue("")
        setOpen(false)
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus
        className={FIELD}
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.4)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      />
      <div className="flex gap-3">
        <button type="submit" className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-accent-primary))" }}>
          Add
        </button>
        <button
          type="button"
          className="text-[12px]"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          onClick={() => {
            setOpen(false)
            setValue("")
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AddPointRow({
  onSubmit,
  disabled,
}: {
  onSubmit: (title: string, body: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="mt-1 text-[12px] font-medium"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Add Point
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!title.trim() && !body.trim()) return
        onSubmit(title.trim(), body.trim())
        setTitle("")
        setBody("")
        setOpen(false)
      }}
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Point title"
        autoFocus
        className={FIELD}
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.4)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Point body"
        rows={3}
        className={FIELD}
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.4)",
          color: "hsl(var(--theme-ink-primary))",
          resize: "vertical",
        }}
      />
      <div className="flex gap-3">
        <button type="submit" className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-accent-primary))" }}>
          Add
        </button>
        <button
          type="button"
          className="text-[12px]"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          onClick={() => {
            setOpen(false)
            setTitle("")
            setBody("")
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
