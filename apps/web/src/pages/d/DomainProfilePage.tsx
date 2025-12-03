/**
 * Domain Profile Page
 * ===================
 * 
 * User profile within domain context.
 * Route: /d/:domainSlug/profile
 * 
 * Features:
 * - V0-style profile card
 * - User name, membership info
 * - Placeholder for now
 * 
 * Renders inside V0 KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { UserIcon } from '@heroicons/react/24/outline';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
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
        title="Profile" 
        subtitle="Your profile in this domain"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout 
        title="Profile" 
        subtitle="Your profile in this domain"
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
      title="Profile" 
      subtitle="Your profile in this domain"
    >
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#C96E59]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-[#C96E59]" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-gray-900 mb-1">
                {user?.name || user?.email || 'User'}
              </h3>
              {user?.email && (
                <p className="text-gray-600 mb-4">{user.email}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Member of this domain since...</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                (Membership date will be shown here when available)
              </p>
            </div>
          </div>

          {/* Domain Info */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Domain</h4>
            <p className="text-gray-900 font-medium">{domain.name}</p>
            {domain.description && (
              <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
            )}
          </div>
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

