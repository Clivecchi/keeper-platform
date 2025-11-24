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
import { useParams, useNavigate } from 'react-router-dom';
import { DomainBoardRenderer } from '../../components/domain/DomainBoardRenderer';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useWorldMode } from '../../context/WorldModeContext';
import { DomainViewNavigation } from './DomainViewNavigation';

export default function PublicDomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { isPresentation } = useWorldMode(); // Ensure we're in Presentation mode
  const [domainId, setDomainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDomainAdmin, setIsDomainAdmin] = useState(false);

  useEffect(() => {
    if (slug) {
      loadDomain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated, user]);

  async function loadDomain() {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load domain by slug
      const response = await apiFetch(`/api/domains/by-slug/${slug}`);
      
      if (response.error || !response.id) {
        throw new Error('Domain not found');
      }

      setDomainId(response.id);

      // If authenticated, fetch user permissions for this domain
      if (isAuthenticated && user) {
        try {
          const boardDataResponse = await apiFetch(`/api/domains/${response.id}/board-data`);
          if (boardDataResponse && boardDataResponse.userPermissions) {
            const { canEdit, role } = boardDataResponse.userPermissions;
            const isAdmin = canEdit || role === 'owner' || role === 'admin';
            setIsDomainAdmin(isAdmin);
            console.log('[PublicDomainPage] User permissions:', { 
              user: user.email, 
              role, 
              canEdit, 
              isDomainAdmin: isAdmin,
              totalFrames: boardDataResponse.board?.frames?.length || 0
            });
          }
        } catch (permErr) {
          console.warn('Could not fetch user permissions:', permErr);
          // Non-fatal: continue without admin status
        }
      } else {
        console.log('[PublicDomainPage] Not authenticated or no user:', { isAuthenticated, hasUser: !!user });
      }
    } catch (err) {
      console.error('Error loading domain:', err);
      setError('Domain not found');
    } finally {
      setIsLoading(false);
    }
  }

  const handleEngagementAction = (templateSlug: string, context: any) => {
    // For public landing, we need to handle engagement actions specially
    // This will trigger EngagementButton which handles the full flow
    console.log('Engagement action triggered:', templateSlug, context);
  };

  const handleEditInWorkshop = () => {
    if (domainId) {
      navigate(`/studio/domain/${domainId}/board-studio`);
    }
  };

  const handleLogin = () => {
    // Navigate to login with returnTo parameter
    const returnTo = encodeURIComponent(`/d/${slug}`);
    navigate(`/login?returnTo=${returnTo}`);
  };

  const handleLogout = () => {
    logout();
  };

  // Ensure we're in Presentation mode (this route should always be Presentation)
  useEffect(() => {
    if (!isPresentation) {
      console.warn('[PublicDomainPage] Route /d/:slug should always be Presentation mode');
    }
  }, [isPresentation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading domain...</p>
        </div>
      </div>
    );
  }

  if (error || !domainId) {
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
  console.log('[PublicDomainPage] Rendering with state:', {
    isAuthenticated,
    isDomainAdmin,
    isPresentation,
    hasUser: !!user,
    userEmail: user?.email,
    domainId,
    slug
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 presentation-mode">
      {/* Full viewport board render with overlay header */}
      <main className="min-h-screen relative">
        {/* Debug panel removed - clean UI */}
        
        {/* Overlay header - inside board container */}
        <div className="absolute top-4 right-4 left-4 z-50 flex justify-end pointer-events-none">
          <div className="flex flex-col items-end gap-3 pointer-events-auto">
            {isAuthenticated ? (
              <>
                <DomainViewNavigation
                  domainSlug={slug || ''}
                  domainId={domainId ?? undefined}
                  currentView="public"
                  canAccessWorkshop={Boolean(isDomainAdmin && domainId)}
                  showAdminLink={isDomainAdmin}
                />
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>
                    {user?.name || user?.email || 'Signed in'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleLogin}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white border border-gray-300 rounded-full shadow-sm transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-full shadow-sm transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Presentation mode - read-only rendering */}
        <DomainBoardRenderer
          domainId={domainId}
          domainSlug={slug}
          isEditMode={false}
          onEngagementAction={handleEngagementAction}
          // No onBoardUpdate - Presentation is read-only
        />
      </main>

      {/* Minimal footer - reduced opacity */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-sm border-t border-gray-200/50 py-2">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-xs">
          Powered by Keeper Platform
        </div>
      </div>
    </div>
  );
}

