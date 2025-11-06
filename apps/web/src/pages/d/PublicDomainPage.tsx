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

export default function PublicDomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    if (slug) {
      loadDomain();
    }
  }, [slug]);

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
    navigate('/root');
  };

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

  const handleEditClick = () => {
    // TODO: Implement board editing in Phase 2
    // For now, show a toast notification
    alert('Board editing is coming soon. For now, use Dashboard → Domain settings.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Full viewport board render with overlay header */}
      <main className="min-h-screen relative">
        {/* Overlay header - inside board container */}
        <div className="absolute top-4 right-4 left-4 z-50 flex justify-end items-center gap-3 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {/* Edit affordance - authenticated owners only */}
            {isAuthenticated && (
              <button
                onClick={handleEditClick}
                disabled
                title="Editing coming soon"
                className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-white/90 hover:bg-white/95 border border-gray-200 rounded-lg shadow-sm transition-colors cursor-not-allowed opacity-60"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </span>
              </button>
            )}
            
            {/* Auth controls */}
            {!isAuthenticated ? (
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
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white/95 border border-gray-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {user?.name?.[0] || user?.email?.[0] || '?'}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate">{user?.name || user?.email || 'Account'}</span>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAccountMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAccountMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                      <button
                        onClick={handleDashboard}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          // Stay on current board
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        View Domain
                      </button>
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <DomainBoardRenderer
          domainId={domainId}
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

