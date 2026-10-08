"use client"

/**
 * Right curtain while the performance is up.
 * Cast and placed objects support the stage. A selected Dialog stays work in hand,
 * not a second stage.
 */

import { getCachedBoardNavData } from "../boardNavDataCache"
import { useUniversalBoardOptional } from "../UniversalBoardContext"
import { OnStageObjectList } from "../../composer/OnStageObjectList"
import { useStageCurtainOptional } from "./stageCurtain"

export function StageSupportCurtain({ domainId }: { domainId: string | null }) {
  const board = useUniversalBoardOptional()
  const curtain = useStageCurtainOptional()
  const cast = curtain?.cast
  const dialogId = board?.selection.selectedDialogId ?? null
  const dialogs = domainId
    ? getCachedBoardNavData<Array<{ id: string; title?: string | null }>>(domainId, "dialogs")
    : null
  const workTitle = dialogId
    ? dialogs?.find((dialog) => dialog.id === dialogId)?.title?.trim() || "Work in hand"
    : ""

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section className="shrink-0 px-3 pb-2 pt-3" aria-label="Cast">
        <h3
          className="mb-2 text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Cast
        </h3>
        {cast && cast.instruments.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {cast.instruments.map((member) => {
              const cued = cast.selectionMode === "multi"
                ? cast.activeSlugs.includes(member.slug) || member.isDirector === true
                : cast.activeSlug === member.slug || member.isDirector === true
              return (
                <li key={member.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      if (member.isDirector && cast.leadLocked) return
                      cast.onInvoke?.(member.slug)
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left"
                    style={{
                      background: cued ? "hsl(var(--theme-accent-primary) / 0.14)" : "transparent",
                    }}
                  >
                    <span className="text-[14px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                      {member.label}
                    </span>
                    <span className="text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                      {member.isDirector ? "Lead" : "Cast"}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-1 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Cast appears with the conversation.
          </p>
        )}
      </section>
      <OnStageObjectList layout="chronicle" />
      {dialogId ? (
        <section className="shrink-0 px-3 py-3" aria-label="Work in hand">
          <h3
            className="mb-1 text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Work in hand
          </h3>
          <button
            type="button"
            onClick={() => board?.actions.onDialogSelect(dialogId)}
            className="w-full rounded-lg px-2.5 py-2 text-left"
          >
            <span className="block text-[14px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              {workTitle}
            </span>
            <span className="block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Open the conversation
            </span>
          </button>
        </section>
      ) : null}
    </div>
  )
}
