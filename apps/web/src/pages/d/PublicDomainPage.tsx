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
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { DomainBoardRenderer } from '../../components/domain/DomainBoardRenderer';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useWorldMode } from '../../context/WorldModeContext';

export default function PublicDomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { isPresentation } = useWorldMode(); // Ensure we're in Presentation mode
  const [domainId, setDomainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isDomainAdmin, setIsDomainAdmin] = useState(false);
  
  // Check if this is the /board route (always show board, even when authenticated)
  const isBoardRoute = location.pathname.includes('/board');

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
    setShowAccountMenu(false);
  };

  const handleDashboard = () => {
    console.log('[PublicDomainPage] Dashboard clicked, navigating to /root');
    console.log('[PublicDomainPage] Current auth state:', { isAuthenticated, user: user?.email, token: !!user });
    // Use window.location for full page navigation to ensure auth state is fresh
    window.location.href = '/root';
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
    slug,
    isBoardRoute
  });

  // When authenticated and NOT on /board route, redirect to Feed (domain dashboard)
  // The Feed page will be rendered by DomainFeedPage component
  // If on /board route, always show the board (for "View Domain Board" link)
  if (isAuthenticated && slug && !isBoardRoute) {
    return <Navigate to={`/d/${slug}/feed`} replace />;
  }

  // When on /board route (authenticated or not), or when not authenticated, render public board view
  // This shows the full viewport board without dashboard shell
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 presentation-mode">
      {/* Full viewport board render with overlay header */}
      <main className="min-h-screen relative">
        {/* Overlay header - inside board container */}
        <div className="absolute top-4 right-4 left-4 z-50 flex justify-between items-center gap-3 pointer-events-none">
          {/* Left side - Back to Dashboard (when authenticated) */}
          {isAuthenticated && slug && (
            <div className="pointer-events-auto">
              <button
                onClick={() => navigate(`/d/${slug}/feed`)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white/95 border border-gray-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
          
          {/* Right side - Auth controls */}
          <div className="flex gap-2 pointer-events-auto ml-auto">
            {isAuthenticated ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white/95 border border-gray-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    {user?.name || user?.email || 'Account'}
                    {user?.name && (
                      <span className="w-6 h-6 bg-[#C96E59] text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={handleDashboard}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white/95 border border-gray-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Presentation mode - read-only rendering */}
        <DomainBoardRenderer
          domainId={domainId}
          domainSlug={slug}
          isEditMode={false}
          onEngagementAction={handleEngagementAction}
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

