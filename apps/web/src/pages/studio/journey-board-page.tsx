/**
 * Journey Board Page
 * ==================
 * 
 * Page wrapper for the JourneyBoard component.
 * Provides routing and parameter handling for journey-specific boards.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { JourneyBoard } from '../../boards/journey-board';

const JourneyBoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Get journey ID from search params, with fallback
  const journeyId = searchParams.get('journeyId') || 'demo-journey';
  
  // Handle journey updates
  const handleJourneyUpdate = (updatedJourneyId: string, updates: any) => {
    console.log('Journey updated:', updatedJourneyId, updates);
    // TODO: Implement API call to save journey updates
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <JourneyBoard
          journeyId={journeyId}
          onJourneyUpdate={handleJourneyUpdate}
          showControls={true}
          allowLayoutEditing={true}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        />
      </div>
    </div>
  );
};

export default JourneyBoardPage;
