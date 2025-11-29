/**
 * Domain Journeys Page
 * ====================
 * 
 * Journeys listing for domain.
 * Route: /d/:domainSlug/journeys
 * 
 * Features:
 * - V0-style listing of domain journeys
 * - Placeholder for now
 * 
 * Renders inside V0 KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { MapIcon } from '@heroicons/react/24/outline';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainJourneysPage() {
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
        title="My Journeys" 
        subtitle="Journeys for this domain"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading journeys...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout 
        title="My Journeys" 
        subtitle="Journeys for this domain"
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
      title="My Journeys" 
      subtitle="Journeys for this domain"
    >
      {/* Journeys Listing - Placeholder */}
      <div className="space-y-4">
        {/* Sample Journey Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C96E59]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapIcon className="w-6 h-6 text-[#C96E59]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Journey Placeholder
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Journeys for this domain will appear here.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>0 steps</span>
                <span>•</span>
                <span>Not started</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

