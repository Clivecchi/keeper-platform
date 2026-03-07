import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { recordTrailEvent, useTrailEntries } from "../stores/trailStore"
import { useV0ShellOptional } from "../shell/V0ShellContext"

interface TrailAction {
  id: string
  label: string
  href: string
}

interface FooterTrailLabels {
  trail_label: string
  no_activity: string
  index: string
  view_drafts: string
  view_kept: string
  back_to_domain: string
}

interface FooterTrailProps {
  domainSlug?: string
  labels?: FooterTrailLabels
}

export function FooterTrail({ domainSlug, labels }: FooterTrailProps) {
  const navigate = useNavigate()
  const v0Shell = useV0ShellOptional()
  const entries = useTrailEntries(domainSlug)

  const actions = useMemo<TrailAction[]>(() => {
    if (!domainSlug) return []
    return [
      {
        id: "view-index",
        label: labels?.index ?? "Index",
        href: v0Shell ? v0Shell.buildFrameUrl("index") : `/d/${domainSlug}/board?frame=index`,
      },
      {
        id: "view-drafts",
        label: labels?.view_drafts ?? "View Drafts",
        href: v0Shell ? v0Shell.buildFrameUrl("moment") : `/d/${domainSlug}/board?frame=moment`,
      },
      {
        id: "view-kept",
        label: labels?.view_kept ?? "View Kept",
        href: v0Shell ? v0Shell.buildFrameUrl("moments") : `/d/${domainSlug}/board?frame=moments`,
      },
      {
        id: "back-domain",
        label: labels?.back_to_domain ?? "Back to Domain",
        href: v0Shell ? v0Shell.buildFrameUrl("cover") : `/d/${domainSlug}/board?frame=cover`,
      },
    ]
  }, [domainSlug, labels, v0Shell])

  const handleAction = (action: TrailAction) => {
    recordTrailEvent(domainSlug, {
      label: action.label,
      type: "navigation",
      href: action.href,
    })
    navigate(action.href)
  }

  const handleEntryClick = (label: string, href?: string) => {
    if (!href) return
    recordTrailEvent(domainSlug, {
      label,
      type: "navigation",
      href,
    })
    navigate(href)
  }

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px]"
      style={{ color: "var(--theme-ink-tertiary)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide opacity-60">{labels?.trail_label ?? "Trail"}</span>
        {entries.length === 0 ? (
          <span className="text-[10px] opacity-50">{labels?.no_activity ?? "No recent activity"}</span>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleEntryClick(entry.label, entry.href)}
              disabled={!entry.href}
              className="rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-70 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--theme-border-soft)",
                backgroundColor: "var(--theme-surface-paper)",
                boxShadow: "var(--theme-shadow-soft)",
              }}
              aria-label={entry.href ? `Go to ${entry.label}` : entry.label}
            >
              {entry.label}
            </button>
          ))
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              className="rounded-full border px-3 py-1 text-[10px] font-medium transition-colors opacity-70 hover:opacity-90"
              style={{
                borderColor: "var(--theme-border-soft)",
                backgroundColor: "var(--theme-surface-paper)",
                boxShadow: "var(--theme-shadow-soft)",
              }}
              aria-label={action.label}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
