"use client"

import * as React from "react"

interface BoardItem {
  id: string
  name: string
  frameCount: number
}

const MY_BOARDS: BoardItem[] = [
  { id: "domain", name: "Domain Board", frameCount: 6 },
  { id: "design", name: "Design Board", frameCount: 3 },
]

const TEMPLATES: BoardItem[] = [
  { id: "keeper-starter", name: "Keeper Starter", frameCount: 4 },
]

interface DesignBoardListProps {
  activeBoardId: string
  onSelectBoard: (id: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function DesignBoardList({
  activeBoardId,
  onSelectBoard,
  collapsed,
  onToggleCollapsed,
}: DesignBoardListProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-3" style={{ width: 36, minWidth: 36 }}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
          aria-label="Expand board list"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M4 2L8 6L4 10" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "#e5e7eb" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#4b5563" }}
        >
          Boards
        </p>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1 rounded-md transition-colors hover:bg-gray-100"
          aria-label="Collapse board list"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M8 2L4 6L8 10" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-3 pb-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#9ca3af" }}
        >
          My Boards
        </p>
      </div>

      <ul className="px-2">
        {MY_BOARDS.map((board) => {
          const isActive = board.id === activeBoardId
          return (
            <li key={board.id}>
              <button
                type="button"
                onClick={() => onSelectBoard(board.id)}
                className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left transition-colors"
                style={{ background: isActive ? "#f3f4f6" : "transparent" }}
              >
                <span
                  className="text-[13px] leading-snug truncate"
                  style={{
                    color: isActive ? "#111827" : "#4b5563",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {board.name}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: "#9ca3af" }}>
                  {board.frameCount}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="px-4 pt-4 pb-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#9ca3af" }}
        >
          Templates
        </p>
      </div>

      <ul className="px-2 flex-1">
        {TEMPLATES.map((board) => {
          const isActive = board.id === activeBoardId
          return (
            <li key={board.id}>
              <button
                type="button"
                onClick={() => onSelectBoard(board.id)}
                className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left transition-colors"
                style={{ background: isActive ? "#f3f4f6" : "transparent" }}
              >
                <span
                  className="text-[13px] leading-snug truncate"
                  style={{
                    color: isActive ? "#111827" : "#4b5563",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {board.name}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: "#9ca3af" }}>
                  {board.frameCount}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
