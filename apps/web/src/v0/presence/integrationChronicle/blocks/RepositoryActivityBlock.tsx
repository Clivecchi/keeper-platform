"use client"

import * as React from "react"
import { formatRelativeTime } from "../shared"
import { BlockShell, BlockTitle } from "./blockShell"

export type RepositoryCommit = {
  sha: string
  message?: string
  date?: string
  author?: string
}

export type RepositoryPullRequest = {
  number: number
  title: string
  state?: string
  updatedAt?: string
}

export type RepositoryBranch = {
  name: string
  protected?: boolean
}

export type RepositoryActivityBlockProps = {
  commits: RepositoryCommit[]
  pullRequests: RepositoryPullRequest[]
  branches: RepositoryBranch[]
}

type ActivityTab = "commits" | "pulls" | "branches"

export function RepositoryActivityBlock({
  commits,
  pullRequests,
  branches,
}: RepositoryActivityBlockProps) {
  const [tab, setTab] = React.useState<ActivityTab>("commits")
  const [selectedDetail, setSelectedDetail] = React.useState<string | null>(null)

  return (
    <BlockShell>
      <BlockTitle>Repository activity</BlockTitle>
      <div className="flex gap-1 mb-3">
        {(["commits", "pulls", "branches"] as ActivityTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="rounded-md border px-2.5 py-1 text-[11px] capitalize"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
              background: tab === t ? "var(--treatment-color-alpha-08)" : "transparent",
              color: "hsl(var(--theme-ink-secondary))",
            }}
          >
            {t === "pulls" ? "Pull Requests" : t}
          </button>
        ))}
      </div>

      {tab === "commits" ? (
        <ul className="flex flex-col gap-2">
          {commits.length === 0 ? (
            <li className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              No commits.
            </li>
          ) : (
            commits.map((c) => (
              <li key={c.sha}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(c.message ?? c.sha)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  <div style={{ color: "hsl(var(--theme-ink-primary))" }}>{c.message ?? c.sha}</div>
                  <div
                    className="text-[11px] mt-1"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    {c.sha} · {c.author ?? "—"} · {formatRelativeTime(c.date)}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : tab === "pulls" ? (
        <ul className="flex flex-col gap-2">
          {pullRequests.length === 0 ? (
            <li className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              No open pull requests.
            </li>
          ) : (
            pullRequests.map((pr) => (
              <li key={pr.number}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(`#${pr.number} ${pr.title}`)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  #{pr.number} {pr.title}
                  <span
                    className="ml-2 text-[11px]"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    {pr.state}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {branches.length === 0 ? (
            <li className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              No branches.
            </li>
          ) : (
            branches.map((b) => (
              <li key={b.name}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(b.name)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  {b.name}
                  {b.protected && (
                    <span
                      className="ml-2 text-[11px]"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      protected
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selectedDetail && (
        <p className="mt-2 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {selectedDetail}
        </p>
      )}
    </BlockShell>
  )
}
