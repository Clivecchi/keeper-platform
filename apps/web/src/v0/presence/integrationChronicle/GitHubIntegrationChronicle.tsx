"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import {
  ActionButton,
  CapabilityChips,
  FeedError,
  FeedShimmer,
  HeroZone,
  StatusStrip,
  confirmDestructiveAction,
  formatRelativeTime,
  useIntegrationConnection,
  useResolvedCapabilities,
  IntegrationUnconnectedState,
  formatConnectedAt,
} from "./shared"

type GitHubTab = "commits" | "pulls" | "branches"

type GitHubCommit = { sha: string; message?: string; date?: string; author?: string }
type GitHubPR = { number: number; title: string; state?: string; updated_at?: string }
type GitHubBranch = { name: string; protected?: boolean }

async function githubProxy<T>(endpoint: string): Promise<T> {
  return apiFetch("/api/integrations/proxy", {
    method: "POST",
    body: JSON.stringify({
      service: "github",
      method: "GET",
      endpoint,
    }),
  }) as Promise<T>
}

export function GitHubIntegrationChronicle({
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: {
  domainId: string
  boardId?: string
  agentSlug?: string
}) {
  const conn = useIntegrationConnection("github", domainId)
  const capabilities = useResolvedCapabilities(agentSlug, boardId)
  const [tab, setTab] = React.useState<GitHubTab>("commits")
  const [repoName, setRepoName] = React.useState<string>("—")
  const [branch, setBranch] = React.useState<string>("main")
  const [commits, setCommits] = React.useState<GitHubCommit[]>([])
  const [pulls, setPulls] = React.useState<GitHubPR[]>([])
  const [branches, setBranches] = React.useState<GitHubBranch[]>([])
  const [feedLoading, setFeedLoading] = React.useState(false)
  const [feedError, setFeedError] = React.useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = React.useState<string | null>(null)

  const loadFeed = React.useCallback(async () => {
    if (conn.status !== "connected") return
    // incomplete — GitHub feed via Nango proxy not active until GitHub connection established
    setFeedLoading(true)
    setFeedError(null)
    try {
      const repoRes = await githubProxy<{ full_name?: string; default_branch?: string }>(
        "/repos/owner/repo",
      )
      const fullName = repoRes.full_name ?? "owner/repo"
      setRepoName(fullName)
      setBranch(repoRes.default_branch ?? "main")

      const [commitRes, prRes, branchRes] = await Promise.all([
        githubProxy<Array<{ sha: string; commit?: { message?: string; author?: { date?: string; name?: string } } }>>(
          `/repos/${fullName}/commits?per_page=8`,
        ).catch(() => []),
        githubProxy<Array<{ number: number; title: string; state?: string; updated_at?: string }>>(
          `/repos/${fullName}/pulls?state=open&per_page=8`,
        ).catch(() => []),
        githubProxy<Array<{ name: string; protected?: boolean }>>(
          `/repos/${fullName}/branches?per_page=8`,
        ).catch(() => []),
      ])

      setCommits(
        (Array.isArray(commitRes) ? commitRes : []).map((c) => ({
          sha: c.sha?.slice(0, 7) ?? "—",
          message: c.commit?.message?.split("\n")[0],
          date: c.commit?.author?.date,
          author: c.commit?.author?.name,
        })),
      )
      setPulls(Array.isArray(prRes) ? prRes : [])
      setBranches(Array.isArray(branchRes) ? branchRes : [])
    } catch (err) {
      setFeedError(
        err instanceof Error
          ? err.message
          : "GitHub feed unavailable — connect GitHub and configure repository access.",
      )
    } finally {
      setFeedLoading(false)
    }
  }, [conn.status])

  React.useEffect(() => {
    if (conn.status === "connected") void loadFeed()
  }, [conn.status, loadFeed])

  const handleCreateBranch = React.useCallback(async () => {
    // incomplete — GitHub PR creation requires human confirmation gate
    const name = window.prompt("New branch name:")
    if (!name?.trim()) return
    conn.setError("Create Branch is not yet wired — // incomplete")
  }, [conn])

  const handleOpenPR = React.useCallback(async () => {
    // incomplete — GitHub PR creation requires human confirmation gate
    const ok = await confirmDestructiveAction(
      "Open a pull request via Cloud? This action requires confirmation and is not fully wired yet.",
    )
    if (!ok) return
    conn.setError("Open PR is not yet wired — // incomplete")
  }, [conn])

  if (conn.loading) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (conn.status !== "connected") {
    return (
      <IntegrationUnconnectedState
        serviceSlug="github"
        busy={conn.busy}
        error={conn.error}
        onConnect={() => void conn.connect()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <HeroZone title="GitHub" subtitle={`${repoName} · ${branch}`} glow="healthy" />

      {conn.integration?.connectedAt && (
        <StatusStrip>Connected {formatConnectedAt(conn.integration.connectedAt)}</StatusStrip>
      )}

      <StatusStrip>
        {repoName} · {branch} · Last commit {formatRelativeTime(commits[0]?.date)}
      </StatusStrip>

      <div className="flex gap-1">
        {(["commits", "pulls", "branches"] as GitHubTab[]).map((t) => (
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

      <div>
        {feedLoading ? (
          <FeedShimmer rows={4} />
        ) : feedError ? (
          <FeedError message={feedError} onRetry={() => void loadFeed()} />
        ) : tab === "commits" ? (
          <ul className="flex flex-col gap-2">
            {commits.map((c) => (
              <li key={c.sha}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(c.message ?? c.sha)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  <div style={{ color: "hsl(var(--theme-ink-primary))" }}>{c.message ?? c.sha}</div>
                  <div className="text-[11px] mt-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {c.sha} · {c.author ?? "—"} · {formatRelativeTime(c.date)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : tab === "pulls" ? (
          <ul className="flex flex-col gap-2">
            {pulls.map((pr) => (
              <li key={pr.number}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(`#${pr.number} ${pr.title}`)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  #{pr.number} {pr.title}
                  <span className="ml-2 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {pr.state}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            {branches.map((b) => (
              <li key={b.name}>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(b.name)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
                >
                  {b.name}
                  {b.protected && (
                    <span className="ml-2 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                      protected
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedDetail && (
        <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {selectedDetail}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="View on GitHub"
          onClick={() => {
            window.open(`https://github.com/${repoName}`, "_blank", "noopener,noreferrer")
          }}
        />
        <ActionButton label="Create Branch" onClick={() => void handleCreateBranch()} />
        <ActionButton label="Open PR" variant="danger" onClick={() => void handleOpenPR()} />
        <ActionButton label="Disconnect" onClick={() => void conn.disconnect()} disabled={conn.busy} />
      </div>

      {conn.error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {conn.error}
        </p>
      )}

      <CapabilityChips capabilities={capabilities} />
    </div>
  )
}
