/**
 * Domain Admin Page
 * =================
 *
 * Redirects to the v0 board frame layout with frame=admin.
 * Route: /d/:domainSlug/admin → /d/:domainSlug?frame=admin
 *
 * The actual Domain Admin UI is rendered by AdminFrame inside the v0 shell.
 */

import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';

export default function DomainAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('frame', 'admin');
  const to = slug ? `/d/${slug}?${params.toString()}` : '/';
  return <Navigate to={to} replace />;
}
