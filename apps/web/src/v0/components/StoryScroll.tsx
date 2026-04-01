"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"
import type { StoryChapter, StoryField, StoryScrollChanges, StoryScrollProps } from "./StoryScroll.types"

function parseNarrative(template: string): Array<{ type: "text"; text: string } | { type: "field"; id: string }> {
  const parts: Array<{ type: "text"; text: string } | { type: "field"; id: string }> = []
  const re = /\{([a-zA-Z0-9_-]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(template)) !== null) {
    if (m.index > last) parts.push({ type: "text", text: template.slice(last, m.index) })
    parts.push({ type: "field", id: m[1] })
    last = m.index + m[0].length
  }
  if (last < template.length) parts.push({ type: "text", text: template.slice(last) })
  return parts
}

function currentValue(field: StoryField, changes: StoryScrollChanges): string | string[] {
  return changes[field.id] !== undefined ? changes[field.id]! : field.value
}

function isChanged(field: StoryField, changes: StoryScrollChanges): boolean {
  return JSON.stringify(currentValue(field, changes)) !== JSON.stringify(field.value)
}

function fieldById(chapter: StoryChapter, id: string): StoryField | undefined {
  return chapter.fields.find((f) => f.id === id)
}

const inputReset =
  "appearance-none bg-transparent border-0 outline-none ring-0 p-0 m-0 shadow-none focus:ring-0 focus:outline-none"

export function StoryScroll({ schema, onChange, kipPlaceholder, sendPrompt, onKipMessage, className }: StoryScrollProps) {
  const [changes, setChanges] = React.useState<StoryScrollChanges>({})
  const [focusedChapter, setFocusedChapter] = React.useState<string>(() => schema.chapters[0]?.id ?? "")
  const [pastChapters, setPastChapters] = React.useState<string[]>([])
  const [grace, setGrace] = React.useState({ top: 0, height: 0 })
  const [wordChoiceOpen, setWordChoiceOpen] = React.useState<string | null>(null)
  const [kipDraft, setKipDraft] = React.useState("")

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const chapterRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

  const pushChange = React.useCallback(
    (fieldId: string, value: string | string[]) => {
      setChanges((prev) => {
        const next = { ...prev, [fieldId]: value }
        onChange?.(next)
        return next
      })
    },
    [onChange],
  )

  const recomputeScrollState = React.useCallback(() => {
    const root = scrollRef.current
    if (!root || schema.chapters.length === 0) return

    const rootRect = root.getBoundingClientRect()
    const line = rootRect.top + rootRect.height * 0.32

    const past: string[] = []
    let focused = schema.chapters[0].id
    let bestId = schema.chapters[0].id
    let bestScore = Number.POSITIVE_INFINITY

    for (const ch of schema.chapters) {
      const el = chapterRefs.current[ch.id]
      if (!el) continue
      const rect = el.getBoundingClientRect()

      if (rect.bottom <= rootRect.top + 2) past.push(ch.id)

      if (rect.top <= line && rect.bottom >= line) {
        focused = ch.id
        bestScore = -1
        break
      }
      const center = (rect.top + rect.bottom) / 2
      const score = Math.abs(center - line)
      if (score < bestScore) {
        bestScore = score
        bestId = ch.id
      }
    }

    if (bestScore >= 0) focused = bestId

    setPastChapters(past)
    setFocusedChapter(focused)
  }, [schema.chapters])

  React.useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    recomputeScrollState()
    root.addEventListener("scroll", recomputeScrollState, { passive: true })
    const ro = new ResizeObserver(recomputeScrollState)
    ro.observe(root)
    return () => {
      root.removeEventListener("scroll", recomputeScrollState)
      ro.disconnect()
    }
  }, [recomputeScrollState])

  React.useLayoutEffect(() => {
    const el = chapterRefs.current[focusedChapter]
    if (!el) return
    setGrace({ top: el.offsetTop, height: el.offsetHeight })
  }, [focusedChapter, schema])

  React.useLayoutEffect(() => {
    const id = requestAnimationFrame(() => recomputeScrollState())
    return () => cancelAnimationFrame(id)
  }, [schema.chapters, recomputeScrollState])

  const scrollChapterIntoView = (id: string) => {
    chapterRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const focusedAccent =
    schema.chapters.find((c) => c.id === focusedChapter)?.accentColor ?? "hsl(var(--theme-border-strong))"

  const submitKip = () => {
    const msg = kipDraft.trim()
    if (!msg) return
    if (sendPrompt) void sendPrompt(msg)
    else onKipMessage?.(msg)
    setKipDraft("")
  }

  return (
    <div
      className={`flex min-h-[min(560px,85vh)] flex-col overflow-hidden rounded-lg border border-border bg-background ${className ?? ""}`}
    >
      {pastChapters.length > 0 && (
        <div
          className="shrink-0 border-b border-border px-3 py-1.5 opacity-[0.28] transition-opacity hover:opacity-[0.42]"
          aria-label="Past chapters"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {pastChapters.map((id) => {
              const ch = schema.chapters.find((c) => c.id === id)
              if (!ch) return null
              return (
                <button
                  key={id}
                  type="button"
                  className="truncate max-w-[10rem] underline-offset-2 hover:underline"
                  onClick={() => scrollChapterIntoView(id)}
                >
                  {ch.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative px-6 py-8 pl-10">
          <div
            className="pointer-events-none absolute z-10 w-0.5 rounded-full transition-all duration-300 ease-out"
            style={{
              left: 14,
              top: grace.top,
              height: Math.max(grace.height, 24),
              backgroundColor: focusedAccent,
            }}
            aria-hidden
          />

          {schema.chapters.map((chapter) => (
            <ChapterBlock
              key={chapter.id}
              chapter={chapter}
              chapterRef={(el) => {
                chapterRefs.current[chapter.id] = el
              }}
              isPast={pastChapters.includes(chapter.id)}
              isFocused={focusedChapter === chapter.id}
              changes={changes}
              pushChange={pushChange}
              wordChoiceOpen={wordChoiceOpen}
              setWordChoiceOpen={setWordChoiceOpen}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-secondary px-4 py-3">
        <div className="flex items-end gap-2">
          <span className="pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Kip</span>
          <input
            type="text"
            className={`min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground`}
            placeholder={kipPlaceholder ?? "Ask Kip…"}
            value={kipDraft}
            onChange={(e) => setKipDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submitKip()
              }
            }}
          />
          <button
            type="button"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label="Send"
            onClick={submitKip}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChapterBlockProps {
  chapter: StoryChapter
  chapterRef: (el: HTMLDivElement | null) => void
  isPast: boolean
  isFocused: boolean
  changes: StoryScrollChanges
  pushChange: (id: string, v: string | string[]) => void
  wordChoiceOpen: string | null
  setWordChoiceOpen: (id: string | null) => void
}

function ChapterBlock({
  chapter,
  chapterRef,
  isPast,
  isFocused,
  changes,
  pushChange,
  wordChoiceOpen,
  setWordChoiceOpen,
}: ChapterBlockProps) {
  const segments = React.useMemo(() => parseNarrative(chapter.narrative), [chapter.narrative])

  return (
    <div
      ref={chapterRef}
      className={`mb-14 scroll-mt-6 transition-[opacity,background-color] duration-300 ${
        isPast ? "opacity-[0.35]" : "opacity-100"
      } ${isFocused ? "-mx-2 rounded-lg bg-secondary/70 px-3 py-5" : ""}`}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{chapter.label}</p>
      <div className="text-[15px] font-serif leading-[2] text-foreground">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <span key={`t-${i}`} className="whitespace-pre-wrap">
                {seg.text}
              </span>
            )
          }
          const field = fieldById(chapter, seg.id)
          if (!field) {
            return (
              <span key={`m-${i}`} className="text-muted-foreground">
                {`{${seg.id}}`}
              </span>
            )
          }
          return (
            <InlineField
              key={`f-${chapter.id}-${field.id}-${i}`}
              field={field}
              accentColor={chapter.accentColor}
              changes={changes}
              pushChange={pushChange}
              expanded={wordChoiceOpen === field.id}
              onToggleWordChoice={() =>
                setWordChoiceOpen(wordChoiceOpen === field.id ? null : field.id)
              }
            />
          )
        })}
      </div>
    </div>
  )
}

interface InlineFieldProps {
  field: StoryField
  accentColor: string
  changes: StoryScrollChanges
  pushChange: (id: string, v: string | string[]) => void
  expanded: boolean
  onToggleWordChoice: () => void
}

function InlineField({
  field,
  accentColor,
  changes,
  pushChange,
  expanded,
  onToggleWordChoice,
}: InlineFieldProps) {
  const changed = isChanged(field, changes)
  const val = currentValue(field, changes)

  if (field.type === "readonly") {
    const t = Array.isArray(val) ? val.join(", ") : String(val)
    return (
      <span className="whitespace-pre-wrap text-foreground">
        {t}
      </span>
    )
  }

  if (field.type === "text") {
    const s = typeof val === "string" ? val : ""
    const widthCh = Math.max(4, field.size ?? 12)
    return (
      <input
        type="text"
        value={s}
        onChange={(e) => pushChange(field.id, e.target.value)}
        style={{
          width: `${widthCh}ch`,
          ...(changed ? { borderBottomColor: `color-mix(in srgb, ${accentColor} 40%, transparent)` } : {}),
        }}
        className={`${inputReset} inline-block align-baseline font-serif text-[15px] leading-[2] text-foreground border-b border-transparent hover:border-muted-foreground/50 focus:border-secondary-foreground ${
          changed ? "border-b" : ""
        }`}
      />
    )
  }

  if (field.type === "color") {
    const hex = typeof val === "string" ? val : "#000000"
    return <InlineColorSwatch value={hex} onChange={(v) => pushChange(field.id, v)} />
  }

  if (field.type === "wordchoice") {
    const word = typeof val === "string" ? val : ""
    const opts = field.options ?? []
    if (!expanded) {
      return (
        <button
          type="button"
          className={`${inputReset} cursor-pointer border-b border-dashed border-muted-foreground/50 font-serif text-[15px] leading-[2] text-foreground hover:border-secondary-foreground`}
          onClick={onToggleWordChoice}
        >
          {word}
        </button>
      )
    }
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1 align-baseline">
        {opts.map((opt) => {
          const active = opt === word
          return (
            <button
              key={opt}
              type="button"
              className={`rounded-sm border px-1.5 py-0 text-xs transition-colors ${
                active
                  ? "border-foreground bg-muted text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-secondary-foreground"
              }`}
              onClick={() => {
                pushChange(field.id, opt)
                onToggleWordChoice()
              }}
            >
              {opt}
            </button>
          )
        })}
      </span>
    )
  }

  if (field.type === "pills") {
    const selected = Array.isArray(val) ? val : []
    const opts = field.availableOptions ?? []
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline">
        {opts.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              className={`rounded-sm border px-2 py-0 text-xs font-sans transition-colors hover:border-border ${
                active
                  ? "border-muted-foreground text-foreground"
                  : "border-transparent text-muted-foreground line-through opacity-40"
              }`}
              onClick={() => {
                const next = active ? selected.filter((x) => x !== opt) : [...selected, opt]
                pushChange(field.id, next)
              }}
            >
              {opt}
            </button>
          )
        })}
      </span>
    )
  }

  return null
}

function InlineColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <span className="group inline-flex items-baseline gap-1 align-baseline">
      <button
        type="button"
        className="mt-1.5 inline-flex h-3 w-3 shrink-0 rounded-sm border border-border p-0 align-top"
        style={{ backgroundColor: value }}
        onClick={() => inputRef.current?.focus()}
        aria-label="Edit color"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        aria-label="Color hex value"
        className={`${inputReset} min-w-0 max-w-[9ch] border-b border-transparent text-[12px] text-muted-foreground opacity-0 w-0 overflow-hidden transition-all duration-150 group-hover:w-[7ch] group-hover:opacity-100 group-hover:text-muted-foreground focus:w-[7ch] focus:border-border focus:text-foreground focus:opacity-100`}
      />
    </span>
  )
}
