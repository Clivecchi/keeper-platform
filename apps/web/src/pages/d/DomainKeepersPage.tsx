/**
 * Domain Keepers Page
 * ===================
 * 
 * Keepers listing for domain.
 * Route: /d/:domainSlug/keepers
 * 
 * Features:
 * - V0-style card grid of domain keepers
 * - Placeholder for now
 * 
 * Renders inside V0 KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainKeepersPage() {
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
        title="Keepers" 
        subtitle="Domain keepers"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading keepers...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout 
        title="Keepers" 
        subtitle="Domain keepers"
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
      title="Keepers" 
      subtitle="Domain keepers"
    >
      {/* Keepers Grid - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sample Keeper Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C96E59]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-6 h-6 text-[#C96E59]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Domain Keeper
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Coming soon – domain keepers will appear here.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>0 moments</span>
                <span>•</span>
                <span>0 journeys</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

