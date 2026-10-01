"use client"

/**
 * Story workspace — Chronicle.
 * Order and provenance. The Dialog stays the conversation. Stage stays production.
 */

import * as React from "react"
import { storyMaterialToStageSlides, type KeeperStory } from "@keeper/shared"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { useDomainStoriesOptional } from "../composer/useDomainStories"
import { useKeeperStageOptional } from "../composer/useKeeperStage"

const KIND_LABEL: Record<string, string> = {
  capture: "Story Capture",
  moment: "Moment",
  message: "Dialog turn",
  point: "Point",
  media: "Media",
}

export function StoryPresence({ storyId }: { storyId: string }) {
  const stories = useDomainStoriesOptional()
  const stage = useKeeperStageOptional()
  const { actions } = useUniversalBoard()
  const story = stories?.set.stories.find((row) => row.id === storyId) ?? null
  const [title, setTitle] = React.useState(story?.title ?? "")
  const [description, setDescription] = React.useState(story?.description ?? "")

  React.useEffect(() => {
    setTitle(story?.title ?? "")
    setDescription(story?.description ?? "")
  }, [story?.id, story?.title, story?.description])

  if (!stories) return null

  if (stories.loading && !story) {
    return (
      <p className="px-5 py-8 text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading Story…
      </p>
    )
  }

  if (!story) {
    return (
      <p className="px-5 py-8 text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        This Story is not on the domain.
      </p>
    )
  }

  const commitMeta = () => {
    const nextTitle = title.trim() || story.title
    const nextDescription = description.trim()
    if (nextTitle === story.title && nextDescription === story.description) return
    void stories.saveStory({ ...story, title: nextTitle, description: nextDescription })
  }

  const takeToStage = () => {
    if (!stage || story.material.length === 0) return
    stage.replaceStorySlides(storyMaterialToStageSlides(story))
    const firstCapture = story.material.find((row) => row.kind === "capture" || row.kind === "message")
    actions.requestStageFocus(firstCapture?.sourceId ?? null)
    actions.openStageRoom()
    if (story.status !== "staged") {
      void stories.saveStory({ ...story, status: "staged" })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-5 py-5">
      <p
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))", margin: 0 }}
      >
        Story · {story.status === "staged" ? "Staged" : "Shaping"}
      </p>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitMeta}
        aria-label="Story title"
        className="keeper-treatment-title mt-2 w-full bg-transparent text-[28px] leading-tight outline-none"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={commitMeta}
        aria-label="Story forward"
        placeholder="Forward — what this telling is"
        rows={2}
        className="mt-3 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      />
      {stories.error ? (
        <p className="mt-3 text-[13px]" style={{ color: "hsl(var(--destructive))" }}>
          {stories.error}
        </p>
      ) : null}

      <ol className="mt-6 space-y-3" aria-label="Story material">
        {story.material.length === 0 ? (
          <li className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Nothing in this Story yet. Add a Story Capture from a Dialog Frame.
          </li>
        ) : (
          story.material.map((row, index) => (
            <li
              key={row.id}
              className="rounded-lg px-3 py-3"
              style={{
                background: "hsl(var(--theme-surface-paper) / 0.72)",
                border: "1px solid hsl(var(--theme-border-soft) / 0.6)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.12em]"
                style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))", margin: 0 }}
              >
                {index + 1} · {KIND_LABEL[row.kind] ?? row.kind}
              </p>
              <p
                className="keeper-treatment-title mt-1 text-[16px] leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))", margin: 0 }}
              >
                {row.title}
              </p>
              {row.excerpt ? (
                <p
                  className="mt-2 text-[13px] leading-relaxed"
                  style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
                >
                  {row.excerpt}
                </p>
              ) : null}
              <p className="mt-2 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}>
                Source {row.kind} {row.sourceId.slice(0, 8)}
                {row.dialogId ? ` · Dialog ${row.dialogId.slice(0, 8)}` : ""}
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  className="text-[12px] disabled:opacity-30"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                  disabled={index === 0 || stories.saving}
                  onClick={() => void stories.moveMaterial(story.id, row.id, -1)}
                >
                  Earlier
                </button>
                <button
                  type="button"
                  className="text-[12px] disabled:opacity-30"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                  disabled={index === story.material.length - 1 || stories.saving}
                  onClick={() => void stories.moveMaterial(story.id, row.id, 1)}
                >
                  Later
                </button>
                <button
                  type="button"
                  className="text-[12px]"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                  disabled={stories.saving}
                  onClick={() => void stories.removeMaterial(story.id, row.id)}
                >
                  Remove from Story
                </button>
              </div>
            </li>
          ))
        )}
      </ol>

      <button
        type="button"
        className="mt-6 self-start rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.12em] disabled:opacity-40"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          color: "hsl(var(--theme-ink-primary))",
          background: "hsl(var(--theme-surface-paper) / 0.8)",
        }}
        disabled={!stage || story.material.length === 0 || stories.saving}
        onClick={takeToStage}
      >
        Take Story to Stage
      </button>
    </div>
  )
}

export type { KeeperStory }
