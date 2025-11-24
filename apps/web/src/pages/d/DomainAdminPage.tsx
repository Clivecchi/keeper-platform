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

export default function DomainAdminPage() {
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
      console.error('[DomainAdminPage] Failed to load domain:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to load domain details'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogin = () => {
    navigate(`/login?returnTo=${encodeURIComponent(`/d/${slug}/admin`)}`);
  };

  const isDomainAdmin =
    permissions?.canEdit ||
    permissions?.role === 'owner' ||
    permissions?.role === 'admin';

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl bg-white shadow-lg p-8 text-center space-y-4 border border-rose-100">
          <h1 className="text-2xl font-semibold text-gray-900">
            Manage this domain
          </h1>
          <p className="text-gray-600">
            Sign in to view keys, integrations, membership, and other Domain
            Admin tools.
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
          <p className="text-gray-600">Loading domain admin tools…</p>
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
            Something went wrong loading the admin tools for this domain.
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

  if (!isDomainAdmin) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl bg-white shadow p-8 text-center space-y-4 border border-amber-100">
          <h1 className="text-2xl font-semibold text-gray-900">
            Access required
          </h1>
          <p className="text-gray-600">
            You need admin access to manage <strong>{domain.name}</strong>.
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
              Domain Admin
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              {domain.name}
            </h1>
          </div>
          <DomainViewNavigation
            domainSlug={domain.slug}
            domainId={domain.id}
            currentView="admin"
            canAccessWorkshop={true}
            showAdminLink={true}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <section className="grid gap-6 md:grid-cols-2">
          <AdminCard
            title="Keys & Integrations"
            description="Manage platform API keys, agent credentials, and integrations connected to this domain."
            actions={
              <a
                href="/studio/admin/api-keys"
                className="text-sm font-medium text-rose-600 hover:text-rose-500"
              >
                Open Platform Keys
              </a>
            }
          />
          <AdminCard
            title="Domain Settings"
            description="Control domain metadata, custom domains, publishing toggles, and manifesto positioning."
            actions={
              <button className="text-sm font-medium text-gray-500 cursor-not-allowed">
                Coming in Phase 2
              </button>
            }
          />
          <AdminCard
            title="Membership & People"
            description="Invite collaborators, control permissions, and align Keepers with this domain."
            actions={
              <button className="text-sm font-medium text-gray-500 cursor-not-allowed">
                Coming in Phase 2
              </button>
            }
          />
          <AdminCard
            title="Agent Configuration"
            description="Configure the daily agent experience, prompts, and integrations for this domain."
            actions={
              <button className="text-sm font-medium text-gray-500 cursor-not-allowed">
                Coming in Phase 3
              </button>
            }
          />
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Domain overview
          </h2>
          <p className="text-gray-600 mb-4">
            {domain.description ||
              'No description yet. Use Workshop to add more context to this domain.'}
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Slug</dt>
              <dd className="font-semibold text-gray-900">{domain.slug}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Admin role</dt>
              <dd className="font-semibold capitalize text-gray-900">
                {permissions?.role ?? 'unknown'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-rose-100 bg-white/70 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Where things live
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Story view is at /d/{domain.slug}</li>
            <li>• Agent workspace is at /d/{domain.slug}/agent</li>
            <li>• Workshop editing lives at /studio/domain/{domain.id}/board-studio</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

interface AdminCardProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

function AdminCard({ title, description, actions }: AdminCardProps) {
  return (
    <article className="rounded-2xl border border-rose-100 bg-white/70 p-6 shadow-sm flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div>{actions}</div>
    </article>
  );
}

