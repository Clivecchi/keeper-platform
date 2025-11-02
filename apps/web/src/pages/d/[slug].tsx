/**
 * Public Domain Landing Page
 * Renders the Domain Design Board for public visitors
 * 
 * Route: /d/[slug]
 * Example: /d/housefrogmore
 * 
 * Features:
 * - Loads domain by slug
 * - Shows public frames only (Hero, Activity, People)
 * - Hides admin frames (Operations, Keys)
 * - Works for unauthenticated visitors
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DomainBoardRenderer } from '../../components/domain/DomainBoardRenderer';
import { EngagementButton } from '../../components/engagement/EngagementButton';
import { apiFetch } from '../../lib/api';

export default function PublicDomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleEngagementSuccess = () => {
    // Refresh the page after successful engagement
    window.location.reload();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <a href="/" className="text-xl font-bold text-gray-900">
            Keeper
          </a>
          <div className="flex gap-4">
            <a
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Domain Board */}
      <main>
        <DomainBoardRenderer
          domainId={domainId}
          onEngagementAction={handleEngagementAction}
        />
      </main>

      {/* Simple footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>Powered by Keeper Platform</p>
        </div>
      </footer>
    </div>
  );
}

