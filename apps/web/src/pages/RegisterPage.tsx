import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/api';
import {
  invitationTokenFromReturnTo,
  inviteAuthCopy,
  withNextQuery,
  type InvitationAuthPreview,
} from '../lib/invitationReturn';

const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('next') || searchParams.get('returnTo') || undefined;
  const token = invitationTokenFromReturnTo(returnTo);
  const [preview, setPreview] = React.useState<InvitationAuthPreview | null>(null);
  const copy = inviteAuthCopy(preview, 'register', Boolean(token));

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
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-md w-full space-y-8 bg-card p-10 rounded-xl shadow-lg border border-card-border"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold text-foreground">
            {copy.title}
          </h1>
          <p className="text-secondary text-sm">
            {copy.subtitle}
          </p>
        </div>
        <AuthForm isRegister returnTo={returnTo} showHeading={false} />
        <p className="mt-6 text-center text-md text-secondary">
          Already have a keeper?{' '}
          <Link to={withNextQuery('/login', returnTo)} className="font-serif font-medium text-primary hover:underline">
            Sign in.
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
