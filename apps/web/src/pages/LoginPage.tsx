/**
 * Login Page - Minimal Board-First Layout
 *
 * Clean, centered login form with no shell UI.
 * Uses BoardPublicLayout (no top nav, no sidebar).
 */

import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { apiFetch } from '../lib/api';
import {
  invitationTokenFromReturnTo,
  inviteAuthCopy,
  withNextQuery,
  type InvitationAuthPreview,
} from '../lib/invitationReturn';

const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('next') || searchParams.get('returnTo') || undefined;
  const token = invitationTokenFromReturnTo(returnTo);
  const [preview, setPreview] = React.useState<InvitationAuthPreview | null>(null);
  const copy = inviteAuthCopy(preview, 'login', Boolean(token));

  React.useEffect(() => {
    if (!token) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    apiFetch(`/api/domains/invitations/preview?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (cancelled || !data || typeof data !== 'object') return;
        const payload = data as InvitationAuthPreview;
        if (!payload.domainName || !payload.inviterName) return;
        setPreview({
          domainName: payload.domainName,
          domainSlug: payload.domainSlug,
          role: payload.role,
          roleLabel: payload.roleLabel || payload.role,
          inviterName: payload.inviterName,
        });
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="text-slate-600">
            {copy.subtitle}
          </p>
        </div>

        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-200/70 px-8 py-7 backdrop-blur">
          <AuthForm returnTo={returnTo} showHeading={false} />

          <div className="mt-6 pt-5 border-t border-slate-200/70">
            <p className="text-center text-sm text-slate-600">
              Don't have a keeper yet?{' '}
              <Link
                to={withNextQuery('/register', returnTo)}
                className="font-medium text-slate-900 hover:text-slate-700 transition-colors"
              >
                Begin here
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
