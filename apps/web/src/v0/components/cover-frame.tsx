"use client"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"
import { DesignFrame } from "../frames/DesignFrame"
import { CoverBody } from "../frames/cover/CoverBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"
import { getBlobProxyUrl } from "../../lib/blobProxy"

const COVER_IMPRINT = "KE3P"

const COVER_CONSTANTS = {
  pad: "clamp(1.5rem, 5vw, 3.25rem)",
  imprintSize: "0.78rem",
  ruleWidth: "3.25rem",
}

interface DomainData {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  theme?: { coverImage?: string | null } | null;
}

export function CoverFrame({
  styleId = 'neutral',
  themeSlug,
  domainData
}: {
  styleId?: StyleId,
  themeSlug?: string | null,
  domainData?: DomainData
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fetchedCoverUrl, setFetchedCoverUrl] = useState<string | null>(null);

  // Fallback: when domainData has id but no theme.coverImage (e.g. old API or by-slug omits theme),
  // fetch domain by ID to get full theme. Only when authenticated (endpoint requires auth).
  useEffect(() => {
    const domainId = domainData?.id
    const hasCoverFromProps = !!domainData?.theme?.coverImage
    const isRealId = domainId && !domainId.startsWith("fallback-")
    if (!isAuthenticated || !isRealId || hasCoverFromProps) return

    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch(`/api/domains/${domainId}`) as { domain?: { theme?: { coverImage?: string | null } } }
        if (ignore) return
        const url = res?.domain?.theme?.coverImage ?? null
        if (url) setFetchedCoverUrl(url)
      } catch {
        // Ignore; by-slug response is the source of truth when available
      }
    })()
    return () => { ignore = true }
  }, [domainData?.id, domainData?.theme?.coverImage, isAuthenticated])

  // Dynamic cover content based on domain — never show hardcoded fallback to visitors.
  // When domainData is loading (fallback id) or missing, show nothing until real data loads.
  const isPlaceholder = !domainData?.id || domainData.id.startsWith("fallback-");
  const coverTitle = isPlaceholder ? undefined : (domainData?.name ?? undefined);
  const coverLiner = isPlaceholder ? undefined : (domainData?.description ?? undefined);
  const domainLabel = domainData?.slug || domainData?.name || "domain";
  const domainSlug = domainData?.slug || "default";
  const userLabel = user?.name || user?.email || "Account";
  const menuLabel = `${domainLabel} · ${userLabel}`;

  const coverStateParam = searchParams.get("coverState") || searchParams.get("cover")
  const coverState = coverStateParam === "open" ? "open" : "closed"

  const coverImageUrl = domainData?.theme?.coverImage ?? fetchedCoverUrl ?? null
  const displayUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground = displayUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : { backgroundColor: "hsl(var(--theme-surface-page))" }

  const handleLogout = async () => {
    try {
      await fetch(`${(import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com'}/api/kam/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Ignore logout failures and clear local state anyway.
    } finally {
      logout();
      navigate('/d/default/board?frame=cover');
    }
  };

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <div
        className="min-h-screen"
        style={{
          padding: COVER_CONSTANTS.pad,
          color: "var(--theme-ink-primary)",
          ...pageBackground,
        }}
      >
        {/* Cover Frame imprint header */}
        <header className="space-y-4 mb-8" aria-label="Cover Frame">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <p
            className="uppercase tracking-[0.42em] text-center"
            style={{ fontSize: COVER_CONSTANTS.imprintSize, color: "var(--theme-ink-tertiary)" }}
          >
            {COVER_IMPRINT}
          </p>
          <div className="justify-self-end">
            {isAuthenticated && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
                  style={{
                    borderColor: "var(--theme-border-soft)",
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
                    color: "var(--theme-ink-primary)",
                  }}
                  aria-label="Open profile menu"
                >
                  {menuLabel}
                </button>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-md shadow-lg border py-1 z-50"
                      style={{
                        backgroundColor: "hsl(var(--theme-surface-paper) / 0.95)",
                        borderColor: "var(--theme-border-soft)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="block w-full text-left px-4 py-2 text-xs hover:opacity-80"
                        style={{ color: "var(--theme-ink-primary)" }}
                      >
                        Settings
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate(`/d/${domainSlug}/admin`);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs hover:opacity-80"
                          style={{ color: "var(--theme-ink-primary)" }}
                        >
                          Domain Admin
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-xs hover:opacity-80"
                        style={{ color: "var(--theme-ink-primary)" }}
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <div
            className="h-px"
            style={{ width: COVER_CONSTANTS.ruleWidth, backgroundColor: "var(--theme-line-hairline)" }}
            aria-hidden
          />
        </div>
      </header>

        <DesignFrame
          styleId={styleId}
          themeSlug={themeSlug}
          title={coverState === "open" ? coverTitle : undefined}
          subtitle={coverState === "open" ? coverLiner : undefined}
          themeSwitcherSlot={<ThemeSwitcher />}
        >
          <CoverBody domainData={domainData} themeSlug={themeSlug} onNavigate={navigate} coverState={coverState} />
        </DesignFrame>
      </div>
    </StyleScope>
  )
}

