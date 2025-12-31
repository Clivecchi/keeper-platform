/**
 * People Board Page
 * =================
 * 
 * Page wrapper for the PeopleBoard component.
 * Provides routing and parameter handling for people management.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PeopleBoard } from '../../boards/people-board';

const PeopleBoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Get person ID from search params, with fallback
  const personId = searchParams.get('personId') || 'demo-people';
  
  // Handle people updates
  const handlePeopleUpdate = (updatedPersonId: string, updates: any) => {
    console.log('People updated:', updatedPersonId, updates);
    // TODO: Implement API call to save people updates
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PeopleBoard
          personId={personId}
          onPeopleUpdate={handlePeopleUpdate}
          showControls={true}
          allowLayoutEditing={true}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        />
      </div>
    </div>
  );
};

export default PeopleBoardPage;
