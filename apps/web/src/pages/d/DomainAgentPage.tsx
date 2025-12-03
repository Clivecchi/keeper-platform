/**
 * Domain Agent Page
 * =================
 * 
 * Agent workspace for domain.
 * Route: /d/:domainSlug/agent
 * 
 * Features:
 * - Agent chat interface (placeholder for now)
 * - Agent configuration
 * - Agent activity logs
 * 
 * Renders inside V0 KeeperDashboardLayout, styled like V0 Kip chat page.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainAgentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [domain, setDomain] = useState<DomainData | null>(null);
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
      const response = await apiFetch(`/api/domains/by-slug/${slug}`);
      
      if (response.error || !response.id) {
        throw new Error('Domain not found');
      }

      setDomain({
        id: response.id,
        name: response.name || response.slug,
        slug: response.slug,
        description: response.description
      });
    } catch (err) {
      console.error('Error loading domain:', err);
      setError('Domain not found');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <KeeperDashboardLayout 
        title="Agent Workspace" 
        subtitle="Your collaborative agent environment"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading agent workspace...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout 
        title="Agent Workspace" 
        subtitle="Your collaborative agent environment"
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Domain Not Found</h2>
          <p className="text-gray-600 mb-4">
            The domain "{slug}" could not be found.
          </p>
        </div>
      </KeeperDashboardLayout>
    );
  }

  return (
    <KeeperDashboardLayout 
      title="Agent Workspace" 
      subtitle="Your collaborative agent environment"
    >
      {/* Placeholder Card - V0 chat card style */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Placeholder message */}
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-700 leading-relaxed">
              This is your agent workspace. Agent functionality will be implemented here.
            </p>
          </div>

          {/* Input area - matching V0 style */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <input
              type="text"
              placeholder="Share your thoughts, ask for guidance, or reflect..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C96E59] focus:border-transparent"
            />
            <button className="px-4 py-3 bg-[#C96E59] text-white rounded-lg hover:bg-[#B85D4A] transition-colors">
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2 text-sm text-gray-500 pt-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p>
              <strong>Tip:</strong> Ask about creating Moments, linking Journeys, or reflecting on your Keepers
            </p>
          </div>
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

