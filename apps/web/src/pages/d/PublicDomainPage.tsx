/**
 * Public Domain Landing Page
 * Renders the Domain Design Board for public visitors
 * 
 * Route: /d/:slug
 * Example: /d/housefrogmore
 * 
 * Features:
 * - Loads domain by slug
 * - Shows public frames only (Hero, Activity, People)
 * - Hides admin frames (Operations, Keys)
 * - Works for both authenticated and unauthenticated visitors (hybrid access)
 * - Full viewport render with minimal inline auth controls
 * - No legacy shell UI (no top nav, no sidebar)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CoverFrame } from '../../v0/components/cover-frame';
import { MomentFrame } from '../../v0/components/moment-frame';
import { KeptMomentsFrame } from '../../v0/components/kept-moments-frame';
import { PresentFrame } from '../../v0/frames/present/PresentFrame';
import { DiagnosticsFrame } from '../../v0/frames/diagnostics/DiagnosticsFrame';
import { StyleOverrideProvider } from '../../v0/styles/StyleOverrideProvider';
import { V0ShellProvider } from '../../v0/shell/V0ShellContext';
import { FrameContextProvider } from '../../v0/shell/FrameContext';
import { PublicGuestChrome } from '../../mobile/PublicGuestChrome';
import '../../mobile/public-story.css';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useWorldMode } from '../../context/WorldModeContext';

/** Placeholder used while domain is loading or when API fails. Never shows hardcoded marketing copy. */
const getDomainFallback = (slug: string) => ({
  id: `fallback-${slug}`,
  name: '',
  slug,
  description: null as string | null,
});

export default function PublicDomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isPresentation } = useWorldMode(); // Ensure we're in Presentation mode
  const [domainData, setDomainData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check frame parameter for V0 routing
  const frame = searchParams.get("frame") || "cover";
  const themeSlug = searchParams.get("theme") || "diary-paper";
  const draftId = searchParams.get("draftId");
  const isMomentFrame = frame === "moment";
  const isMomentsFrame = frame === "moments";
  const isPresentFrame = frame === "present";
  const isDiagnosticsFrame = frame === "diagnostics";

  // Check if this is the /board route (always show board, even when authenticated)
  const isBoardRoute = location.pathname.includes('/board');

  useEffect(() => {
    if (slug) {
      // Set fallback data immediately for instant render
      const fallbackData = getDomainFallback(slug);
      setDomainData(fallbackData);

      // Optional: Try to load real domain data in background
      loadDomainFromAPI(slug, fallbackData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadDomainFromAPI(slug: string, _fallbackData: any) {
    try {
      const response = await apiFetch(`/api/domains/by-slug/${slug}`);
      if (response && response.id) {
        setDomainData(response);
        console.log('[PublicDomainPage] Loaded real domain data');
      }
    } catch (apiErr) {
      // API not available or domain not found - keep fallback data
      console.log('[PublicDomainPage] Using fallback data (API not available or failed)');
    }
  }

  // Ensure we're in Presentation mode (this route should always be Presentation)
  useEffect(() => {
    if (!isPresentation) {
      console.warn('[PublicDomainPage] Route /d/:slug should always be Presentation mode');
    }
  }, [isPresentation]);

  // No loading screen - render immediately with fallback data

  if (error || !domainData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Domain Not Found</h1>
          <p className="text-gray-600 mb-4">
            The domain "{slug}" could not be found.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }


  // Debug logging for render
  console.log('[PublicDomainPage] Rendering V0 with:', {
    frame,
    themeSlug,
    draftId,
    domainData: domainData?.name,
    isAuthenticated
  });

  // When authenticated and NOT on /board route, redirect to Commons (domain board)
  // Allow explicit V0 moment routing to stay on the board surface.
  if (isAuthenticated && slug && !isBoardRoute && !isMomentFrame && !isMomentsFrame && !isPresentFrame && !isDiagnosticsFrame) {
    return <Navigate to={`/d/${slug}/board?frame=commons`} replace />;
  }

  // Render V0 Cover or Moment based on frame parameter
  if (import.meta.env.DEV) {
    console.log('[PublicDomainPage] Rendering frame params', { frame, themeSlug, draftId });
  }
  return (
    <div className="min-h-screen presentation-mode public-story-shell public-story-shell--narrow">
      <PublicGuestChrome domainSlug={slug ?? "default"} />

      {/* Render V0 components */}
      <StyleOverrideProvider initialStyleId={undefined}>
        <V0ShellProvider
          value={{
            domainSlug: slug ?? "default",
            frame: (frame as any) ?? "cover",
            placementMode: "publicStory",
            placementActions: {
              openKip: () => {},
              closeKip: () => {},
              goCommons: () => {},
              goAdmin: () => {},
              goCover: () => {},
              goIndex: () => {},
            },
            themeSlug: themeSlug,
            styleId: "neutral",
            draftId,
            domainData,
            domainFrame: null,
            resolvedAudience: "guest",
            buildFrameUrl: (nextFrame) => `/d/${slug}?frame=${nextFrame}`,
            navigateToFrame: (nextFrame, options) => {
              const params = new URLSearchParams();
              params.set("frame", nextFrame);
              if (options?.draftId) params.set("draftId", options.draftId);
              if (options?.themeSlug) params.set("theme", options.themeSlug);
              navigate(`/d/${slug}?${params.toString()}`);
            },
            closeToBoard: () => navigate(`/d/${slug}`),
            reloadDomainFrame: async () => {},
            workspaceBoardId: null,
            boardDefinitionId: null,
            switchWorkspace: () => {},
            selectBoardDefinition: () => {},
            clearBoardDefinition: () => {},
          }}
        >
          <FrameContextProvider
            domainSlug={slug ?? "default"}
            frame={(frame as any) ?? "cover"}
            placementMode="publicStory"
            themeSlug={themeSlug}
            draftId={draftId}
          >
            {frame === "moment" ? (
              <MomentFrame
                styleId="neutral"
                themeSlug={themeSlug}
                domainSlug={slug}
                draftId={draftId}
              />
            ) : frame === "moments" ? (
              <KeptMomentsFrame
                styleId="neutral"
                themeSlug={themeSlug}
                domainSlug={slug}
              />
            ) : frame === "present" ? (
              <PresentFrame styleId="neutral" themeSlug={themeSlug} />
            ) : frame === "diagnostics" ? (
              <DiagnosticsFrame
                styleId="neutral"
                themeSlug={themeSlug}
                domainSlug={slug}
                returnPath={`/d/${slug}`}
              />
            ) : (
              <CoverFrame
                styleId="neutral"
                themeSlug={themeSlug}
                domainData={domainData ? {
                  name: domainData.name,
                  slug: domainData.slug,
                  description: domainData.description,
                  theme: domainData.theme,
                } : undefined}
              />
            )}
          </FrameContextProvider>
        </V0ShellProvider>
      </StyleOverrideProvider>

      {/* Minimal footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-sm border-t border-gray-200/50 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-xs">
          Powered by Keeper Platform
        </div>
      </div>
    </div>
  );
}

