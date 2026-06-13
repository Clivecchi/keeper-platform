"use client"

import * as React from "react"
import {
  copyConsoleDiagToClipboard,
  formatConsoleDiagForCopy,
  getConsoleDiagEntries,
  getLatestNavPanelBoardDefSnapshot,
  installConsoleDiagCapture,
  subscribeConsoleDiag,
  type ConsoleDiagEntry,
} from "../../../lib/consoleDiagCapture"
import { useBoardDefs } from "../../boards/useBoardDefs"
import { useV0ShellOptional } from "../../shell/V0ShellContext"

export interface DialogDiagStreamProps {
  active: boolean
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}

function levelClass(level: ConsoleDiagEntry["level"]): string {
  switch (level) {
    case "error":
      return "dialog-diag-line--error"
    case "warn":
      return "dialog-diag-line--warn"
    default:
      return ""
  }
}

export function DialogDiagStream({ active }: DialogDiagStreamProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [, bump] = React.useReducer((n: number) => n + 1, 0)
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle")
  const shell = useV0ShellOptional()
  const boardDefs = useBoardDefs()

  React.useEffect(() => {
    installConsoleDiagCapture()
    return subscribeConsoleDiag(bump)
  }, [])

  const liveEntries = React.useMemo(() => {
    void bump
    return active ? [...getConsoleDiagEntries()] : []
  }, [active, bump])

  const boardDefSnapshot = React.useMemo(
    () => getLatestNavPanelBoardDefSnapshot(liveEntries),
    [liveEntries],
  )

  const mismatch =
    boardDefSnapshot &&
    boardDefSnapshot.definitionParam !== boardDefSnapshot.activeBoardDefId

  React.useEffect(() => {
    if (!active) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [active, liveEntries.length])

  React.useEffect(() => {
    if (copyState === "idle") return
    const timer = window.setTimeout(() => setCopyState("idle"), 1800)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const handleCopy = React.useCallback(async () => {
    try {
      await copyConsoleDiagToClipboard(liveEntries)
      setCopyState("copied")
    } catch {
      try {
        await navigator.clipboard.writeText(formatConsoleDiagForCopy(liveEntries))
        setCopyState("copied")
      } catch {
        setCopyState("failed")
      }
    }
  }, [liveEntries])

  const handleSelectBoardDef = React.useCallback(
    (boardDefId: string) => {
      shell?.selectBoardDefinition(boardDefId)
    },
    [shell],
  )

  if (!active) return null

  return (
    <div className="dialog-diag-stream">
      {boardDefSnapshot && (
        <div className={`dialog-diag-boarddefs${mismatch ? " dialog-diag-boarddefs--mismatch" : ""}`}>
          <div className="dialog-diag-boarddefs-head">
            <span className="dialog-diag-boarddefs-label">Board Definitions</span>
            <span className="dialog-diag-boarddefs-meta">
              ?definition=
              <code>{boardDefSnapshot.definitionParam ?? "—"}</code>
              {" · "}
              active=
              <code>{boardDefSnapshot.activeBoardDefId ?? "—"}</code>
              {mismatch ? " · mismatch" : " · synced"}
            </span>
          </div>
          {shell?.workspaceBoardId === "designer" && boardDefs.length > 0 && (
            <div className="dialog-diag-boarddefs-pills">
              {boardDefs.map((def) => {
                const selected =
                  def.boardId === boardDefSnapshot.activeBoardDefId ||
                  def.boardId === boardDefSnapshot.definitionParam
                return (
                  <button
                    key={def.boardId}
                    type="button"
                    className={`dialog-diag-boarddef-pill${selected ? " dialog-diag-boarddef-pill--active" : ""}`}
                    onClick={() => handleSelectBoardDef(def.boardId)}
                    title={`Switch to ${def.displayName}`}
                  >
                    {def.displayName}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} className="dialog-diag-scroll" aria-live="polite">
        {liveEntries.length === 0 ? (
          <p className="dialog-diag-empty">Waiting for console output…</p>
        ) : (
          liveEntries.map((entry) => (
            <div key={entry.id} className={`dialog-diag-line ${levelClass(entry.level)}`.trim()}>
              <span className="dialog-diag-time">{formatTime(entry.timestamp)}</span>
              <span className="dialog-diag-text">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="dialog-diag-copy"
        onClick={() => void handleCopy()}
        aria-label="Copy diagnostic log"
        title="Copy diagnostic log"
      >
        {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
      </button>
    </div>
  )
}
