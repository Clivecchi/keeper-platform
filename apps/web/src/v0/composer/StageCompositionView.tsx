"use client"

/**
 * One Stage walker. Layout, emphasis, gesture, and dress come from the Composition.
 * Sentences come from the Reading. The heading is the truth's name.
 */

import * as React from "react"
import type {
  StageCiteGesture,
  StageComposition,
  StageCompositionDress,
  StageContinueAction,
  StageEmphasis,
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

const EMPHASIS_CLASS: Record<StageEmphasis, string> = {
  primary: "text-[17px] leading-relaxed",
  support: "text-[15px] leading-relaxed",
  trail: "text-[13px] leading-relaxed",
}

const EMPHASIS_COLOR: Record<StageEmphasis, string> = {
  primary: "hsl(var(--theme-ink-primary))",
  support: "hsl(var(--theme-ink-secondary))",
  trail: "hsl(var(--theme-ink-tertiary))",
}

export function StageCompositionView({
  composition,
  reading,
  status,
  onContinue,
  sequence,
  title,
}: {
  composition: StageComposition | null
  reading: StageReading | null
  status: "loading" | "ready" | "error" | "story"
  onContinue: (action: StageContinueAction) => void
  sequence?: React.ReactNode
  title?: string
}) {
  const sequenceNode = composition?.nodes.find((node) => node.kind === "sequence")
  if (sequenceNode && sequence) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col"
        data-stage-sequence={citeIds(sequenceNode.kind === "sequence" ? sequenceNode.children : []).join(" ")}
        data-stage-span={composition?.dress?.span ?? "center"}
      >
        {sequence}
      </div>
    )
  }

  const dress = composition?.dress
  const titleMode = dress?.title ?? "display"
  const density = dress?.density ?? "close"
  const field = dress?.field ?? "clear"

  return (
    <div
      className={[
        "flex h-full min-h-0 justify-center overflow-y-auto",
        density === "open" ? "px-10 py-10" : "px-6 py-6",
        dress?.motion === "arrive" ? "stage-composition-arrive" : "",
      ].join(" ")}
      data-stage-field={field}
      data-stage-density={density}
      data-stage-span={dress?.span ?? "center"}
    >
      <div className={density === "open" ? "w-full max-w-3xl" : "w-full max-w-xl"}>
        <div className={field === "paper" ? "theme-reading-plane rounded-md px-6 py-6" : undefined}>
          {titleMode !== "none" && title ? (
            <h1
              className={
                titleMode === "quiet"
                  ? "text-[15px] leading-relaxed"
                  : "text-[1.75rem] font-medium tracking-tight"
              }
              style={{
                color: titleMode === "quiet"
                  ? "hsl(var(--theme-ink-secondary))"
                  : "hsl(var(--theme-ink-primary))",
              }}
            >
              {title}
            </h1>
          ) : null}
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
          {status !== "loading" && status !== "error"
            ? composition?.nodes.map((node, index) => (
                <CompositionNode
                  key={nodeKey(node, index)}
                  node={node}
                  reading={reading}
                  onContinue={onContinue}
                  dress={dress}
                />
              ))
            : null}
        </div>
      </div>
    </div>
  )
}

function nodeKey(node: StageNode, index: number): string {
  if (node.kind === "cite" || node.kind === "media") return `${node.kind}-${node.readingId}`
  return `${node.kind}-${index}`
}

function CompositionNode({
  node,
  reading,
  onContinue,
  dress,
  hero = false,
}: {
  node: StageNode
  reading: StageReading | null
  onContinue: (action: StageContinueAction) => void
  dress?: StageCompositionDress
  hero?: boolean
}) {
  if (node.kind === "cite" || node.kind === "media") {
    return (
      <CiteNode
        node={node}
        reading={reading}
        onContinue={onContinue}
        hero={hero}
      />
    )
  }
  if (node.kind === "sequence") {
    const index = Math.min(Math.max(0, node.index), Math.max(0, node.children.length - 1))
    return (
      <div className="mt-6 space-y-4" data-stage-layout="sequence">
        {node.children.map((child, childIndex) => (
          <div key={nodeKey(child, childIndex)} style={{ opacity: childIndex === index ? 1 : 0.72 }}>
            <CompositionNode node={child} reading={reading} onContinue={onContinue} dress={dress} />
          </div>
        ))}
      </div>
    )
  }

  const gap = dress?.density === "open" ? "gap-8" : "gap-3"
  if (node.layout === "row") {
    return (
      <div className={`mt-6 flex flex-wrap ${gap}`} data-stage-layout="row" data-stage-emphasis={node.emphasis}>
        {node.children.map((child, index) => (
          <div key={nodeKey(child, index)} className="min-w-[12rem] flex-1">
            <CompositionNode node={child} reading={reading} onContinue={onContinue} dress={dress} />
          </div>
        ))}
      </div>
    )
  }
  if (node.layout === "split") {
    const [first, ...rest] = node.children
    return (
      <div className={`mt-6 grid ${gap} md:grid-cols-2`} data-stage-layout="split" data-stage-emphasis={node.emphasis}>
        <div>{first ? <CompositionNode node={first} reading={reading} onContinue={onContinue} dress={dress} /> : null}</div>
        <div className={`flex flex-col ${gap}`}>
          {rest.map((child, index) => (
            <CompositionNode key={nodeKey(child, index)} node={child} reading={reading} onContinue={onContinue} dress={dress} />
          ))}
        </div>
      </div>
    )
  }
  if (node.layout === "hero") {
    const [first, ...rest] = node.children
    return (
      <div className="mt-6" data-stage-layout="hero" data-stage-emphasis={node.emphasis}>
        {first ? (
          <CompositionNode node={first} reading={reading} onContinue={onContinue} dress={dress} hero />
        ) : null}
        <div className={`mt-6 flex flex-col ${gap}`}>
          {rest.map((child, index) => (
            <CompositionNode key={nodeKey(child, index)} node={child} reading={reading} onContinue={onContinue} dress={dress} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={`mt-6 flex flex-col ${gap}`} data-stage-layout="stack" data-stage-emphasis={node.emphasis}>
      {node.children.map((child, index) => (
        <CompositionNode key={nodeKey(child, index)} node={child} reading={reading} onContinue={onContinue} dress={dress} />
      ))}
    </div>
  )
}

function CiteNode({
  node,
  reading,
  onContinue,
  hero,
}: {
  node: Extract<StageNode, { kind: "cite" | "media" }>
  reading: StageReading | null
  onContinue: (action: StageContinueAction) => void
  hero: boolean
}) {
  const item = itemFor(reading, node.readingId)
  if (!item) return null
  const emphasis: StageEmphasis = node.kind === "cite" ? node.emphasis : "primary"
  const gesture: StageCiteGesture = node.kind === "cite"
    ? node.gesture ?? (item.actions.length > 0 ? "place" : "text")
    : "text"
  const action = gesture === "place" ? item.actions[0] : undefined
  const className = hero ? "text-[1.75rem] font-medium leading-snug tracking-tight" : EMPHASIS_CLASS[emphasis]
  const color = EMPHASIS_COLOR[emphasis]
  if (action) {
    return (
      <button
        type="button"
        className={`mt-3 w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-black/5 ${className}`}
        style={{ color }}
        data-stage-gesture="place"
        onClick={() => onContinue(action)}
      >
        {item.text}
      </button>
    )
  }
  return (
    <p className={`mt-3 ${className}`} style={{ color }} data-stage-gesture={gesture}>
      {item.text}
    </p>
  )
}
