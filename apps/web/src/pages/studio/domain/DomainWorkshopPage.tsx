/**
 * DomainWorkshopPage
 * ==================
 * 
 * Workshop page for domain management and board editing.
 * Route: /studio/domain/:domainId
 * 
 * This is the Workshop world entry point for domains.
 * It provides navigation to:
 * - Board Studio: /studio/domain/:domainId/board-studio
 * - Settings: /studio/domain/:domainId/settings (future)
 * - Members: /studio/domain/:domainId/members (future)
 * 
 * For MVP, this redirects to Board Studio.
 * Future: This will be a dashboard with tabs for different workshop functions.
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorldMode } from '../../../context/WorldModeContext';

export default function DomainWorkshopPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const { isWorkshop } = useWorldMode();

  // Ensure we're in Workshop mode
  useEffect(() => {
    if (!isWorkshop) {
      console.warn('[DomainWorkshopPage] Route /studio/domain/:domainId should always be Workshop mode');
    }
  }, [isWorkshop]);

  // For MVP, redirect to Board Studio
  // Future: This will be a dashboard with tabs
  useEffect(() => {
    if (domainId) {
      navigate(`/studio/domain/${domainId}/board-studio`, { replace: true });
    }
  }, [domainId, navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading Workshop...</p>
      </div>
    </div>
  );
}

