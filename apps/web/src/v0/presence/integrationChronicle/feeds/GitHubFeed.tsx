"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"
import {
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_GITHUB_REPOSITORY,
  GITHUB_REPO_PLACEHOLDER,
} from "../../../../lib/githubIntegrationDefaults"

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

      const [commitRes, prRes, branchRes, integrationsRes] = await Promise.all([
        githubProxy<
          Array<{ sha: string; commit?: { message?: string; author?: { date?: string; name?: string } } }>
        >(`/repos/${fullName}/commits?per_page=8`).catch(() => []),
        githubProxy<Array<{ number: number; title: string; state?: string; updated_at?: string }>>(
          `/repos/${fullName}/pulls?state=open&per_page=8`,
        ).catch(() => []),
        githubProxy<Array<{ name: string; protected?: boolean }>>(
          `/repos/${fullName}/branches?per_page=8`,
        ).catch(() => []),
        apiFetch("/api/integrations").catch(() => []),
      ])

      let commits = (Array.isArray(commitRes) ? commitRes : []).map((c) => ({
        sha: c.sha?.slice(0, 7) ?? "—",
        message: c.commit?.message?.split("\n")[0],
        date: c.commit?.author?.date,
        author: c.commit?.author?.name,
      }))
      let pulls = Array.isArray(prRes) ? prRes : []
      let branches = Array.isArray(branchRes) ? branchRes : []

      const githubIntegration = (
        Array.isArray(integrationsRes) ? integrationsRes : []
      ).find((row) => row && typeof row === "object" && (row as { service?: string }).service === "github") as
        | { metadata?: { repository_activity?: Record<string, unknown> } }
        | undefined
      const activity = githubIntegration?.metadata?.repository_activity
      if (activity && typeof activity === "object") {
        const lastPush = activity.lastPush as
          | { message?: string; author?: string; timestamp?: string; ref?: string }
          | undefined
        if (lastPush?.message) {
          commits = [
            {
              sha: "webhook",
              message: lastPush.message,
              date: lastPush.timestamp,
              author: lastPush.author,
            },
            ...commits.filter((c) => c.sha !== "webhook"),
          ]
        }
        const lastPr = activity.lastPullRequest as
          | { number?: number; title?: string; state?: string; updatedAt?: string }
          | undefined
        if (lastPr?.title) {
          const prRow = {
            number: lastPr.number ?? 0,
            title: lastPr.title,
            state: lastPr.state,
            updated_at: lastPr.updatedAt,
          }
          pulls = [prRow, ...pulls.filter((p) => p.number !== prRow.number)]
        }
        const branchCount =
          typeof activity.branchCount === "number" ? activity.branchCount : undefined
        if (branchCount != null && branches.length < branchCount) {
          const placeholders = Array.from({ length: branchCount - branches.length }, (_, i) => ({
            name: `branch-${i + 1}`,
          }))
          branches = [...branches, ...placeholders]
        }
      }

      setData({
        repoName,
        branch,
        commits,
        pulls,
        branches,
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
