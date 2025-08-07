/**
 * Domain Board Page
 * =================
 * 
 * Page wrapper for the DomainBoard component.
 * Provides routing and parameter handling for domain-specific boards.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DomainBoard } from '../../boards/domain-board';

const DomainBoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Get domain ID from search params, with fallback
  const domainId = searchParams.get('domainId') || 'demo-domain';
  
  // Handle domain updates
  const handleDomainUpdate = (updatedDomainId: string, updates: any) => {
    console.log('Domain updated:', updatedDomainId, updates);
    // TODO: Implement API call to save domain updates
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DomainBoard
          domainId={domainId}
          onDomainUpdate={handleDomainUpdate}
          showControls={true}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        />
      </div>
    </div>
  );
};

export default DomainBoardPage;
