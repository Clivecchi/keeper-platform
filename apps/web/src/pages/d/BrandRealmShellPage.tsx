"use client"

import * as React from "react"
import { V0Shell } from "../../v0/shell/V0Shell"
import { KipChatDrawerProvider } from "../../v0/components/KipChatDrawer"
import { useResolvedHostDomain } from "../../hooks/useResolvedHostDomain"

/**
 * Brand realm entry at `/` — livecchi.us, livecchi.keeper.domains, etc.
 * Slug comes from hostname, not the URL path.
 */
const BrandRealmShellPage: React.FC = () => {
  const { domain, loading } = useResolvedHostDomain()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading…</div>
      </div>
    )
  }

  if (!domain?.slug || domain.source === "unresolved") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg">This address is not connected to a Keeper realm yet.</p>
        <p className="text-sm opacity-70">
          Finish custom domain setup in Configure, or use your Keeper address instead.
        </p>
      </div>
    )
  }

  return (
    <KipChatDrawerProvider>
      <V0Shell mode="brand" brandSlug={domain.slug} />
    </KipChatDrawerProvider>
  )
}

export default BrandRealmShellPage
