/**
 * Domain Dashboard Page (Admin View)
 * Full Domain Design Board with all frames including admin-only sections
 * 
 * Route: /keeper/domain-dashboard
 * 
 * Features:
 * - Shows all 5 frames (Hero, Activity, People, Operations, Keys)
 * - Authenticated admin view
 * - Working engagement template actions
 * - Replaces the old "Root Dashboard" for domain management
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DomainBoardRenderer } from '../../components/domain/DomainBoardRenderer';
import { EngagementButton } from '../../components/engagement/EngagementButton';
import { apiFetch } from '../../lib/api';

export default function DomainDashboardPage() {
  const [searchParams] = useSearchParams();
  const domainIdFromUrl = searchParams.get('domainId');
  
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(domainIdFromUrl);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);

  useEffect(() => {
    loadUserDomains();
  }, []);

  async function loadUserDomains() {
    setIsLoadingDomains(true);
    try {
      const response = await apiFetch('/api/domains/my');
      
      if (response.success && response.data) {
        const domainsList = response.data;
        setDomains(domainsList);
        
        // Auto-select first domain if none selected
        if (!selectedDomainId && domainsList.length > 0) {
          setSelectedDomainId(domainsList[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setIsLoadingDomains(false);
    }
  }

  const handleEngagementAction = (templateSlug: string, context: any) => {
    console.log('Engagement action (admin):', templateSlug, context);
  };

  const handleEngagementSuccess = () => {
    // Refresh could be handled by DomainBoardRenderer's internal state
    console.log('Engagement succeeded, board should refresh');
  };

  if (isLoadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              No Domains Found
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have any domains yet. Create one to get started.
            </p>
            <a
              href="/keeper/domains/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Domain
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with domain selector */}
      <header className="bg-white border-b border-gray-200 py-4 mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Domain Dashboard
            </h1>
            
            {domains.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Domain:
                </label>
                <select
                  value={selectedDomainId || ''}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {domains.map(domain => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-2">
            Manage your domain settings, content, and integrations.
          </p>
        </div>
      </header>

      {/* Domain Board (Admin View) */}
      <main>
        {selectedDomainId ? (
          <DomainBoardRenderer
            domainId={selectedDomainId}
            onEngagementAction={handleEngagementAction}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-600">
            Select a domain to manage
          </div>
        )}
      </main>

      {/* Info banner */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Admin View:</strong> You're seeing all frames including admin-only sections
            (Domain Operations, Keys & Integrations). Public visitors will only see public frames.
          </p>
        </div>
      </div>
    </div>
  );
}

