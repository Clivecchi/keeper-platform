/**
 * Keeper Type Board Page
 * ======================
 * 
 * Page wrapper for the KeeperTypeBoard component.
 * Provides routing and parameter handling for keeper type-specific boards.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeeperTypeBoard } from '../../boards/keeper-type-board';

const KeeperTypeBoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Get keeper type ID from search params, with fallback
  const keeperTypeId = searchParams.get('keeperTypeId') || 'demo-keeper-type';
  
  // Handle keeper type updates
  const handleKeeperTypeUpdate = (updatedKeeperTypeId: string, updates: any) => {
    console.log('Keeper Type updated:', updatedKeeperTypeId, updates);
    // TODO: Implement API call to save keeper type updates
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <KeeperTypeBoard
          keeperTypeId={keeperTypeId}
          onKeeperTypeUpdate={handleKeeperTypeUpdate}
          showControls={true}
          allowLayoutEditing={true}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        />
      </div>
    </div>
  );
};

export default KeeperTypeBoardPage;
