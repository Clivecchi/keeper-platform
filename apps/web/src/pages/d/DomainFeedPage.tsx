/**
 * Domain Feed Page
 * ================
 * 
 * Domain workspace home - Feed view showing updates, moments, and activity.
 * Route: /d/:domainSlug (when authenticated)
 * 
 * Features:
 * - Domain Feed placeholder
 * - Shows activity, moments, keepers, journeys for this domain
 * - V0-style card layout
 * 
 * Renders inside V0 KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { 
  ClockIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  MapIcon
} from '@heroicons/react/24/outline';

// TODO: Replace stubbed preview data with live board/frame feed data
const useDomainFeedPreview = (domainId?: string | null) => {
  return {
    items: [],
    isStub: true,
    domainId: domainId || null,
  };
};

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [domain, setDomain] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedPreview = useDomainFeedPreview(domain?.id);

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
        title="Your Domain Feed" 
        subtitle="Updates, moments, and activity for this domain"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading domain feed...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout 
        title="Your Domain Feed" 
        subtitle="Updates, moments, and activity for this domain"
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
      title="Your Domain Feed" 
      subtitle="Updates, moments, and activity for this domain"
    >
      {/* Feed Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Empty State */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <ClockIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              As you create Moments, Keepers, and Journeys in this domain, they'll appear here.
            </p>
          </div>

          {/* Activity Preview Cards (Placeholder, ready for live data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <ComingSoonTile
              icon={<SparklesIcon className="w-5 h-5 text-[#C96E59]" />}
              title="Moments"
              message={feedPreview.isStub ? 'Coming soon' : 'No recent moments'}
            />
            <ComingSoonTile
              icon={<BuildingOfficeIcon className="w-5 h-5 text-[#C96E59]" />}
              title="Keepers"
              message={feedPreview.isStub ? 'Coming soon' : 'No keeper updates yet'}
            />
            <ComingSoonTile
              icon={<MapIcon className="w-5 h-5 text-[#C96E59]" />}
              title="Journeys"
              message={feedPreview.isStub ? 'Coming soon' : 'No journey updates yet'}
            />
          </div>
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

const ComingSoonTile: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({
  icon,
  title,
  message,
}) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

