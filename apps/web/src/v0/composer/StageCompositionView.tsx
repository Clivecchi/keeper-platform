"use client"

/**
 * One Stage walker. Node kind chooses the gesture.
 * A sequence plays the existing story screen. A stack plays Where are we?
 */

import * as React from "react"
import type {
  StageComposition,
  StageContinueAction,
  StageNode,
  StageReading,
  StageReadingItem,
} from "@keeper/shared"

function itemFor(reading: StageReading | null, id: string): StageReadingItem | null {
  return reading?.items.find((item) => item.id === id) ?? null
}

function citeIds(nodes: readonly StageNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.kind === "cite" || node.kind === "media") ids.push(node.readingId)
    else ids.push(...citeIds(node.children))
  }
  return ids
}

export function StageCompositionView({
  composition,
  reading,
  status,
  onContinue,
  sequence,
}: {
  composition: StageComposition | null
  reading: StageReading | null
  status: "loading" | "ready" | "error" | "story"
  onContinue: (action: StageContinueAction) => void
  sequence?: React.ReactNode
}) {
  const sequenceNode = composition?.nodes.find((node) => node.kind === "sequence")
  if (status === "story" || sequenceNode) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col"
        data-stage-sequence={sequenceNode ? citeIds(sequenceNode.kind === "sequence" ? sequenceNode.children : []).join(" ") : ""}
      >
        {sequence}
      </div>
    )
  }

  const primary = composition?.nodes.find(
    (node) => node.kind === "group" && node.emphasis === "primary",
  )
  const trail = composition?.nodes.find(
    (node) => node.kind === "group" && node.emphasis === "trail",
  )

  return (
    <div className="flex h-full min-h-0 justify-center overflow-y-auto px-6 py-6">
      <div className="w-full max-w-xl">
        <h1
          className="text-[1.75rem] font-medium tracking-tight"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          Where are we?
        </h1>
        {status === "loading" ? (
          <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Reading the trail…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            The trail could not be read.
          </p>
        ) : null}
        {status === "ready" && primary?.kind === "group" ? (
          <PrimaryStack node={primary} reading={reading} onContinue={onContinue} />
        ) : null}
        {status === "ready" && trail?.kind === "group" ? (
          <TrailGroup node={trail} reading={reading} />
        ) : null}
      </div>
    </div>
  )
}

function PrimaryStack({
  node,
  reading,
  onContinue,
}: {
  node: Extract<StageNode, { kind: "group" }>
  reading: StageReading | null
  onContinue: (action: StageContinueAction) => void
}) {
  const notes = node.children.flatMap((child) => {
    if (child.kind !== "cite") return []
    const item = itemFor(reading, child.readingId)
    return item ? [item] : []
  })
  const places = node.children.filter((child) => child.kind === "group")
  return (
    <>
      {notes.map((item) => {
        const quiet = item.source.kind === "uncertainty" && item.source.id === "empty"
        return (
          <p
            key={item.id}
            className={quiet ? "mt-6 text-[16px] leading-relaxed" : "mt-6 text-[17px] leading-relaxed"}
            style={{ color: quiet ? "hsl(var(--theme-ink-secondary))" : "hsl(var(--theme-ink-primary))" }}
          >
            {item.text}
          </p>
        )
      })}
      {places.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {places.map((place, index) => (
            <PlaceButton
              key={place.kind === "group" ? `place-${index}` : index}
              node={place}
              reading={reading}
              onContinue={onContinue}
            />
          ))}
        </ul>
      ) : null}
    </>
  )
}

function PlaceButton({
  node,
  reading,
  onContinue,
}: {
  node: StageNode
  reading: StageReading | null
  onContinue: (action: StageContinueAction) => void
}) {
  if (node.kind !== "group") return null
  const cites = node.children.filter((child) => child.kind === "cite")
  const placeCite = cites.find((child) => {
    if (child.kind !== "cite") return false
    const item = itemFor(reading, child.readingId)
    return Boolean(item && item.actions.length > 0)
  })
  const place = placeCite && placeCite.kind === "cite" ? itemFor(reading, placeCite.readingId) : null
  if (!place) return null
  const action = place.actions[0]
  const supports = cites.flatMap((child) => {
    if (child.kind !== "cite" || child.readingId === place.id) return []
    const item = itemFor(reading, child.readingId)
    return item ? [item] : []
  })
  const showName = place.source.kind === "domain"
  return (
    <li>
      <button
        type="button"
        className="w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-black/5"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
        onClick={() => {
          if (action) onContinue(action)
        }}
      >
        {showName ? <span className="block text-[17px] leading-relaxed">{place.text}</span> : null}
        {supports.map((item) => (
          <span
            key={item.id}
            className={showName ? "mt-1 block text-[15px] leading-relaxed" : "block text-[16px] leading-relaxed"}
            style={showName ? { color: "hsl(var(--theme-ink-secondary))" } : undefined}
          >
            {item.text}
          </span>
        ))}
        {!showName && supports.length === 0 ? (
          <span className="block text-[16px] leading-relaxed">{place.text}</span>
        ) : null}
      </button>
    </li>
  )
}

function TrailGroup({
  node,
  reading,
}: {
  node: Extract<StageNode, { kind: "group" }>
  reading: StageReading | null
}) {
  const lines = node.children.flatMap((child) => {
    if (child.kind !== "cite") return []
    const item = itemFor(reading, child.readingId)
    return item ? [item] : []
  })
  if (lines.length === 0) return null
  return (
    <details className="mt-10">
      <summary className="cursor-pointer text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Trail
      </summary>
      <div
        className="mt-3 space-y-3 text-[13px] leading-relaxed"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {lines.map((item) => (
          <p key={item.id}>{item.text}</p>
        ))}
      </div>
    </details>
  )
}
