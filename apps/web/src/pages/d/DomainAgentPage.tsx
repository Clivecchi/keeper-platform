import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { DomainViewNavigation } from './DomainViewNavigation';

interface DomainSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface UserPermissions {
  canEdit: boolean;
  role: string;
}

export default function DomainAgentPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [domain, setDomain] = useState<DomainSummary | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !isAuthenticated) {
      return;
    }
    loadDomain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated]);

  async function loadDomain() {
    setIsLoading(true);
    setError(null);

    try {
      const domainResponse = await apiFetch(`/api/domains/by-slug/${slug}`);
      if (!domainResponse?.id) {
        throw new Error('Domain not found');
      }

      setDomain(domainResponse);
      const boardData = await apiFetch(
        `/api/domains/${domainResponse.id}/board-data`
      );
      setPermissions(boardData.userPermissions || null);
    } catch (err) {
      console.error('[DomainAgentPage] Failed to load domain:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to load domain details'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogin = () => {
    navigate(`/login?returnTo=${encodeURIComponent(`/d/${slug}/agent`)}`);
  };

  const isDomainMember = Boolean(permissions);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl bg-white shadow-lg p-8 text-center space-y-4 border border-rose-100">
          <h1 className="text-2xl font-semibold text-gray-900">
            Join the workspace
          </h1>
          <p className="text-gray-600">
            Sign in to collaborate with the agent for this domain.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex justify-center rounded-full bg-rose-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-rose-500"
          >
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading agent workspace…</p>
        </div>
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error ?? 'Domain not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            Something went wrong loading the agent workspace for this domain.
          </p>
          <button
            onClick={() => navigate(`/d/${slug}`)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Back to domain story
          </button>
        </div>
      </div>
    );
  }

  if (!isDomainMember) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl bg-white shadow p-8 text-center space-y-4 border border-amber-100">
          <h1 className="text-2xl font-semibold text-gray-900">
            Workspace unavailable
          </h1>
          <p className="text-gray-600">
            You need to be invited to collaborate on{' '}
            <strong>{domain.name}</strong> before accessing the agent
            workspace.
          </p>
          <button
            onClick={() => navigate(`/d/${slug}`)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            View public domain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50">
      <header className="border-b border-rose-100 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-rose-500 font-semibold">
              Agent Workspace
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              {domain.name}
            </h1>
            <p className="text-sm text-gray-600">
              Placeholder workspace – future phases will mount the V0 agent
              experience here.
            </p>
          </div>
          <DomainViewNavigation
            domainSlug={domain.slug}
            domainId={domain.id}
            currentView="agent"
            canAccessWorkshop={permissions?.canEdit}
            showAdminLink={true}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <section className="rounded-2xl border border-rose-100 bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Agent dashboard placeholder
          </h2>
          <p className="text-gray-600">
            This is a temporary surface. In Phase 3 we’ll reuse the V0 logged-in
            dashboard to combine the Agent’s board, chat panel, and daily
            guidance tools.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-6 text-center text-sm text-gray-500">
            TODO (Phase 3): Mount Agent board + chat experience here.
          </div>
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Next steps
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Use Workshop to update frames for this domain.</li>
            <li>• Invite collaborators from the Domain Admin page.</li>
            <li>• Align agent behaviors in Phase 3.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

