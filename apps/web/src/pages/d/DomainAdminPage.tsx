/**
 * Domain Admin Page
 * =================
 * 
 * Admin interface for domain management.
 * Route: /d/:domainSlug/admin
 * 
 * Features:
 * - Domain settings
 * - API keys management
 * - Membership management
 * - Agent configuration
 * 
 * Renders inside V0 KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { 
  KeyIcon,
  UserGroupIcon,
  CogIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function DomainAdminPage() {
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
      <KeeperDashboardLayout title="Domain Admin" subtitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading domain...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout title="Domain Admin" subtitle="Error">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Domain Not Found</h2>
          <p className="text-gray-600 mb-4">
            The domain "{slug}" could not be found.
          </p>
        </div>
      </KeeperDashboardLayout>
    );
  }

  // Admin function cards matching V0 design
  const adminCards = [
    {
      title: 'API Keys',
      description: 'Manage domain API keys and access tokens',
      icon: <KeyIcon className="w-8 h-8" />,
      onClick: () => console.log('API Keys clicked')
    },
    {
      title: 'Membership',
      description: 'Manage domain members and permissions',
      icon: <UserGroupIcon className="w-8 h-8" />,
      onClick: () => console.log('Membership clicked')
    },
    {
      title: 'Settings',
      description: 'Configure domain settings and preferences',
      icon: <CogIcon className="w-8 h-8" />,
      onClick: () => console.log('Settings clicked')
    },
    {
      title: 'Agent Configuration',
      description: 'Configure and manage domain agents',
      icon: <CpuChipIcon className="w-8 h-8" />,
      onClick: () => console.log('Agent Configuration clicked')
    }
  ];

  return (
    <KeeperDashboardLayout 
      title="Domain Admin" 
      subtitle={`Manage ${domain.name}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminCards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="text-[#C96E59] group-hover:text-[#B85D4A] transition-colors">
                {card.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {card.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </KeeperDashboardLayout>
  );
}

