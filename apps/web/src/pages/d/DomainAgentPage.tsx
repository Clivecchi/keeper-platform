/**
 * Domain Agent Page
 * =================
 *
 * Renders the Kip Agent Board within the domain dashboard shell.
 * Route: /d/:domainSlug/agent
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { KipAgentBoard } from '../kip/KipAgentBoardPage';

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
      loadDomain(slug);
    }
  }, [slug]);

  async function loadDomain(domainSlug: string) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/domains/by-slug/${domainSlug}`);

      if (response.error || !response.id) {
        throw new Error('Domain not found');
      }

      setDomain({
        id: response.id,
        name: response.name || response.slug,
        slug: response.slug,
        description: response.description,
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
      <KeeperDashboardLayout title="Kip" subtitle="Loading agent board...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#C96E59]" />
            <p className="text-gray-600">Booting up Kip for this domain…</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout title="Kip" subtitle="Lead Agent workspace">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">Domain Not Found</h2>
          <p className="text-gray-600">The domain "{slug}" could not be found.</p>
        </div>
      </KeeperDashboardLayout>
    );
  }

  return (
    <KeeperDashboardLayout
      title="Kip"
      subtitle={`Lead Agent board for ${domain.name}`}
    >
      <KipAgentBoard
        contextLabel={`Lead Agent for ${domain.name}`}
        scopeLabel={domain.name}
      />
    </KeeperDashboardLayout>
  );
}

