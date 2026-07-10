"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  fetchDomainSwitcherEntries,
  type DomainSwitcherEntry,
} from "../boards/domain/domainSwitcherData"
import { PlaybillCard } from "../components/PlaybillCard"
import { prefetchDomainShell } from "../boards/domain/domainShellCache"
import { buildDomainBoardPath } from "../shell/shellMode"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useSceneChangeOptional } from "../sceneChange/SceneChangeProvider"

export interface RealmPlaybillRailProps {
  anchorSlug?: string | null
  className?: string
}

export function RealmPlaybillRail({
  anchorSlug,
  className = "",
}: RealmPlaybillRailProps) {
  const navigate = useNavigate()
  const shell = useV0ShellOptional()
  const sceneChange = useSceneChangeOptional()
  const [domains, setDomains] = React.useState<DomainSwitcherEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    void fetchDomainSwitcherEntries()
      .then((rows) => {
        if (!cancelled) {
          setDomains(rows)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = React.useCallback(
    (slug: string) => {
      const path = buildDomainBoardPath(slug, "domain")
      const go = () => {
        if (shell?.openDomainWorkspace) {
          shell.openDomainWorkspace("domain")
        }
        navigate(path)
      }
      if (sceneChange) {
        void sceneChange.travelToSlug(slug, go)
        return
      }
      prefetchDomainShell(slug)
      go()
    },
    [navigate, shell, sceneChange],
  )

  const handlePrefetch = React.useCallback((slug: string) => {
    prefetchDomainShell(slug)
  }, [])

  if (isLoading && domains.length === 0) {
    return (
      <div className={`px-3 py-4 ${className}`}>
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Loading your domains…
        </p>
      </div>
    )
  }

  if (domains.length === 0) {
    return (
      <div className={`px-3 py-4 ${className}`}>
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          No domains in your reach yet.
        </p>
      </div>
    )
  }

  const normalizedAnchor = anchorSlug?.trim().toLowerCase() ?? null

  return (
    <div className={`realm-playbill-rail flex flex-col gap-3 px-3 py-3 ${className}`}>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em] px-0.5"
        style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
      >
        In your reach
      </p>
      {domains.map((domain) => (
        <PlaybillCard
          key={domain.id}
          domain={domain}
          variant="realm"
          isCurrent={normalizedAnchor === domain.slug.trim().toLowerCase()}
          onSelect={handleSelect}
          onPrefetch={handlePrefetch}
        />
      ))}
    </div>
  )
}
