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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import DomainManager from '../../components/domain-manager/DomainManager';
import { DomainGovernanceCard } from '../../components/domain-manager/DomainGovernanceCard';
import { KipApi } from '../../lib/kipApi';
import { DesignFrame } from '../../v0/frames/DesignFrame';
import { ThemeSwitcher } from '../../v0/frames/ThemeSwitcher';
import type { StyleId } from '../../v0/styles/styles';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const ADMIN_SURFACE = {
  card: 'hsl(var(--theme-surface-paper) / 0.88)',
  border: 'var(--theme-border-soft)',
  inkPrimary: 'var(--theme-ink-primary)',
  inkSecondary: 'var(--theme-ink-secondary)'
};

export default function DomainAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const styleId = (searchParams.get('style') || 'neutral') as StyleId;
  const themeSlug = searchParams.get('theme');
  const { user, updateUser, isAdmin, authResolved, isLoading: authLoading } = useAuth();
  const [domain, setDomain] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policyText, setPolicyText] = useState<string>('');
  const [policyVersion, setPolicyVersion] = useState<string>('policy-v1');
  const [policySource, setPolicySource] = useState<string>('default');
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState<boolean>(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadDomain();
    }
  }, [slug]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || ''
    });
  }, [user?.name, user?.email]);

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

  async function handleProfileSave() {
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const data = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: profileForm.name })
      });

      if (data.success) {
        updateUser(data.data);
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  const handleBackToCommons = () => {
    if (!slug) return;
    const params = new URLSearchParams();
    if (themeSlug) params.set('theme', themeSlug);
    if (styleId) params.set('style', styleId);
    params.set('frame', 'commons');
    navigate(`/d/${slug}/board?${params.toString()}`);
  };

  if (authLoading || !authResolved) {
    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title="Domain Admin"
        subtitle="Checking admin access..."
        themeSwitcherSlot={<ThemeSwitcher />}
        rightSlot={
          <button
            type="button"
            onClick={handleBackToCommons}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
          >
            Back to Commons
          </button>
        }
      >
        <div
          className="rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
            Checking your admin access...
          </p>
        </div>
      </DesignFrame>
    );
  }

  if (!isAdmin) {
    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title="Domain Admin"
        subtitle="Admin access required"
        themeSwitcherSlot={<ThemeSwitcher />}
        rightSlot={
          <button
            type="button"
            onClick={handleBackToCommons}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
          >
            Back to Commons
          </button>
        }
      >
        <div
          className="rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>
            Admin access required
          </h2>
          <p className="mt-2 text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
            Your account does not have admin access for this domain.
          </p>
        </div>
      </DesignFrame>
    );
  }

  if (isLoading) {
    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title="Domain Admin"
        subtitle="Loading domain..."
        themeSwitcherSlot={<ThemeSwitcher />}
        rightSlot={
          <button
            type="button"
            onClick={handleBackToCommons}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
          >
            Back to Commons
          </button>
        }
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>Loading domain...</p>
          </div>
        </div>
      </DesignFrame>
    );
  }

  if (error || !domain) {
    return (
      <DesignFrame
        styleId={styleId}
        themeSlug={themeSlug}
        title="Domain Admin"
        subtitle="Domain unavailable"
        themeSwitcherSlot={<ThemeSwitcher />}
        rightSlot={
          <button
            type="button"
            onClick={handleBackToCommons}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
          >
            Back to Commons
          </button>
        }
      >
        <div
          className="rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>
            Domain not found
          </h2>
          <p className="mt-2 text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
            The domain "{slug}" could not be found.
          </p>
        </div>
      </DesignFrame>
    );
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Domain Admin"
      subtitle={`Manage ${domain.name}`}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          onClick={handleBackToCommons}
          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
        >
          Back to Commons
        </button>
      }
    >
      <div className="space-y-8">
        <div
          className="rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <div className="mb-4 space-y-1">
            <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>
              Domain Manager
            </h3>
            <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
              Manage domain configuration, metadata, and custom domain settings.
            </p>
          </div>
          <div className="h-[640px] overflow-hidden rounded-xl border" style={{ borderColor: ADMIN_SURFACE.border }}>
            <DomainManager scope="admin" allowCreate={true} />
          </div>
        </div>

        <div
          className="rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>
                Profile
              </h3>
              <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
                Update your name for this admin session.
              </p>
            </div>
            <button
              type="button"
              onClick={handleProfileSave}
              disabled={profileSaving || !profileForm.name.trim()}
              className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
            >
              {profileSaving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: ADMIN_SURFACE.inkSecondary }}>
                Full name
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => setProfileForm(prev => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: 'hsl(var(--theme-surface-paper) / 0.9)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: ADMIN_SURFACE.inkSecondary }}>
                Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm opacity-70"
                style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: 'hsl(var(--theme-surface-paper) / 0.8)' }}
              />
            </div>
          </div>
          {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}
          {profileSuccess && <p className="mt-3 text-sm text-emerald-600">{profileSuccess}</p>}
        </div>

        <div
          className="space-y-4 rounded-2xl border px-6 py-6 shadow-sm"
          style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>
                Policy
              </h3>
              <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>
                Resolved policy JSON for this domain (used by Kip to decide drafting actions).
              </p>
              <p className="text-xs mt-1" style={{ color: ADMIN_SURFACE.inkSecondary }}>
                Source: {policySource} • Version: {policyVersion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => domain && loadPolicy(domain.id)}
                disabled={isLoadingPolicy || isSavingPolicy || !domain}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={isSavingPolicy || !domain}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
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
              className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
              style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: 'hsl(var(--theme-surface-paper) / 0.9)' }}
              disabled={isLoadingPolicy}
            />
            {isLoadingPolicy && <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>Loading policy…</p>}
          </div>
        </div>

        {domain?.id && (
          <DomainGovernanceCard domainId={domain.id} />
        )}
      </div>
    </DesignFrame>
  );
}

