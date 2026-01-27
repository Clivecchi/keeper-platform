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
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { KipApi } from '../../lib/kipApi';
import DomainManager from '../../components/domain-manager/DomainManager';

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
  const [policyText, setPolicyText] = useState<string>('');
  const [policyVersion, setPolicyVersion] = useState<string>('policy-v1');
  const [policySource, setPolicySource] = useState<string>('default');
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState<boolean>(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  useEffect(() => {
    if (slug) {
      loadDomain();
    }
  }, [slug]);

  useEffect(() => {
    if (domain?.id) {
      loadPolicy(domain.id);
    }
  }, [domain?.id]);

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

  async function loadPolicy(domainId: string) {
    setIsLoadingPolicy(true);
    setPolicyError(null);
    try {
      const policy = await KipApi.getDomainPolicy(domainId);
      setPolicyVersion(policy.version || 'policy-v1');
      setPolicySource(policy.source || 'domain');
      setPolicyText(JSON.stringify((policy as any).policy ?? {}, null, 2));
    } catch (err) {
      console.error('Error loading domain policy:', err);
      setPolicyError(err instanceof Error ? err.message : 'Unable to load policy');
      setPolicyText(JSON.stringify({}, null, 2));
    } finally {
      setIsLoadingPolicy(false);
    }
  }

  async function handleSavePolicy() {
    if (!domain?.id) return;
    setIsSavingPolicy(true);
    setPolicyError(null);
    try {
      const parsedPolicy = policyText.trim() ? JSON.parse(policyText) : {};
      const saved = await KipApi.updateDomainPolicy(domain.id, parsedPolicy, policyVersion);
      setPolicyVersion(saved.version || 'policy-v1');
      setPolicySource(saved.source || 'domain');
      setPolicyText(JSON.stringify((saved as any).policy ?? parsedPolicy, null, 2));
    } catch (err) {
      console.error('Error saving domain policy:', err);
      setPolicyError(err instanceof Error ? err.message : 'Unable to save policy');
    } finally {
      setIsSavingPolicy(false);
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

  return (
    <KeeperDashboardLayout 
      title="Domain Admin" 
      subtitle={`Manage ${domain.name}`}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Domains</h3>
          <p className="text-sm text-gray-600">
            Manage domain configuration, metadata, and custom domain settings.
          </p>
        </div>
        <div className="h-[640px] overflow-hidden rounded-lg border border-gray-200">
          <DomainManager scope="admin" allowCreate={true} />
        </div>
      </div>

      <div className="mt-10 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Policy</h3>
            <p className="text-sm text-gray-600">
              Resolved policy JSON for this domain (used by Kip to decide drafting actions).
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Source: {policySource} • Version: {policyVersion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => domain && loadPolicy(domain.id)}
              disabled={isLoadingPolicy || isSavingPolicy || !domain}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSavePolicy}
              disabled={isSavingPolicy || !domain}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C96E59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B85D4A] disabled:opacity-50"
            >
              {isSavingPolicy ? 'Saving…' : 'Save Policy'}
            </button>
          </div>
        </div>
        {policyError && <p className="text-sm text-red-600">{policyError}</p>}
        <div className="space-y-2">
          <textarea
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
            rows={16}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm focus:border-[#C96E59] focus:ring-2 focus:ring-[#C96E59]/30 disabled:opacity-75"
            disabled={isLoadingPolicy}
          />
          {isLoadingPolicy && <p className="text-sm text-gray-500">Loading policy…</p>}
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

