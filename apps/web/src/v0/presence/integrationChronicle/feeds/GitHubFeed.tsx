"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"
import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_GITHUB_REPOSITORY,
  GITHUB_REPO_PLACEHOLDER,
} from "../../../../lib/githubIntegrationDefaults"
import { FeedError, FeedShimmer, formatRelativeTime } from "../shared"

export type GitHubTab = "commits" | "pulls" | "branches"

export type GitHubCommit = { sha: string; message?: string; date?: string; author?: string }
export type GitHubPR = { number: number; title: string; state?: string; updated_at?: string }
export type GitHubBranch = { name: string; protected?: boolean }

export type GitHubFeedData = {
  repoName: string
  branch: string
  commits: GitHubCommit[]
  pulls: GitHubPR[]
  branches: GitHubBranch[]
}

const PLACEHOLDER_REPO = GITHUB_REPO_PLACEHOLDER

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

function isUsableRepoSlug(value: string | undefined): value is string {
  return Boolean(value && value.includes("/") && value !== PLACEHOLDER_REPO)
}

export function formatGitHubProxyError(err: unknown): string {
  const apiErr = err as Error & {
    data?: { error?: string; data?: { message?: string; documentation_url?: string } | string }
  }
  const nested = apiErr.data?.data
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return `GitHub: ${nested.message}`
  }
  if (typeof nested === "string" && nested.length > 0) {
    return nested
  }
  const msg = apiErr.message
  if (msg && msg !== "Proxy request failed") return msg
  return "GitHub feed unavailable — check repository access and try again."
}

async function loadDomainGitHubContext(
  domainId: string,
): Promise<{ repo?: string; branch?: string }> {
  try {
    const domainRes = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`)
    const domain = (domainRes as { domain?: Record<string, unknown> })?.domain
    const settings =
      domain?.settings && typeof domain.settings === "object"
        ? (domain.settings as Record<string, unknown>)
        : {}
    const ideBuild =
      settings.ideBuildContext && typeof settings.ideBuildContext === "object"
        ? (settings.ideBuildContext as Record<string, unknown>)
        : {}
    const repo =
      typeof ideBuild.activeRepository === "string" ? ideBuild.activeRepository : undefined
    const branch =
      typeof ideBuild.activeBranch === "string" ? ideBuild.activeBranch : undefined
    return {
      repo: isUsableRepoSlug(repo) ? repo : undefined,
      branch: branch?.trim() || undefined,
    }
  } catch {
    return {}
  }
}

async function resolveGitHubRepository(
  domainId: string,
): Promise<{ fullName: string; branch?: string }> {
  const domainCtx = await loadDomainGitHubContext(domainId)
  if (domainCtx.repo) {
    return { fullName: domainCtx.repo, branch: domainCtx.branch }
  }

  return {
    fullName: DEFAULT_GITHUB_REPOSITORY,
    branch: DEFAULT_GITHUB_BRANCH,
  }
}

export function useGitHubFeedData(domainId: string, connected: boolean) {
  const [data, setData] = React.useState<GitHubFeedData>({
    repoName: "—",
    branch: "main",
    commits: [],
    pulls: [],
    branches: [],
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    if (!connected) return
    setLoading(true)
    setError(null)
    try {
      const { fullName, branch: configuredBranch } = await resolveGitHubRepository(domainId)
      const repoRes = await githubProxy<{ full_name?: string; default_branch?: string }>(
        `/repos/${fullName}`,
      )
      const repoName = repoRes.full_name ?? fullName
      const branch = configuredBranch ?? repoRes.default_branch ?? "main"

      const [commitRes, prRes, branchRes] = await Promise.all([
        githubProxy<
          Array<{ sha: string; commit?: { message?: string; author?: { date?: string; name?: string } } }>
        >(`/repos/${fullName}/commits?per_page=8`).catch(() => []),
        githubProxy<Array<{ number: number; title: string; state?: string; updated_at?: string }>>(
          `/repos/${fullName}/pulls?state=open&per_page=8`,
        ).catch(() => []),
        githubProxy<Array<{ name: string; protected?: boolean }>>(
          `/repos/${fullName}/branches?per_page=8`,
        ).catch(() => []),
      ])

      setData({
        repoName,
        branch,
        commits: (Array.isArray(commitRes) ? commitRes : []).map((c) => ({
          sha: c.sha?.slice(0, 7) ?? "—",
          message: c.commit?.message?.split("\n")[0],
          date: c.commit?.author?.date,
          author: c.commit?.author?.name,
        })),
        pulls: Array.isArray(prRes) ? prRes : [],
        branches: Array.isArray(branchRes) ? branchRes : [],
      })
    } catch (err) {
      setError(formatGitHubProxyError(err))
    } finally {
      setLoading(false)
    }
  }, [connected, domainId])

  React.useEffect(() => {
    if (connected) void reload()
  }, [connected, reload])

  return { data, loading, error, reload }
}

export type GitHubFeedProps = {
  data: GitHubFeedData
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function GitHubFeed({ data, loading, error, onRetry }: GitHubFeedProps) {
  const [tab, setTab] = React.useState<GitHubTab>("commits")
  const [selectedDetail, setSelectedDetail] = React.useState<string | null>(null)
  const { commits, pulls, branches } = data

  return (
    <>
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
        {loading ? (
          <FeedShimmer rows={4} />
        ) : error ? (
          <FeedError message={error} onRetry={onRetry} />
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
    </>
  )
}
