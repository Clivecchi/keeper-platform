/**
 * DomainBoardStudioPage
 * =====================
 * 
 * Board Studio page for a specific domain.
 * Route: /studio/domain/:domainId/board-studio
 * 
 * This wraps BoardStudioPage with domain context.
 * It ensures we're in Workshop mode and passes domainId to Board Studio.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldMode } from '../../../context/WorldModeContext';
import BoardStudioPage from '../board-studio-page';

export default function DomainBoardStudioPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const { isWorkshop } = useWorldMode();

  // Ensure we're in Workshop mode
  useEffect(() => {
    if (!isWorkshop) {
      console.warn('[DomainBoardStudioPage] Route /studio/domain/:domainId/board-studio should always be Workshop mode');
    }
  }, [isWorkshop]);

  // Pass domainId to BoardStudioPage via search params
  // BoardStudioPage will use this to filter/load domain-specific boards
  return <BoardStudioPage domainId={domainId} />;
}

