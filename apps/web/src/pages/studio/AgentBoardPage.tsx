/**
 * Agent Board Page
 * ================
 * 
 * Page wrapper for the AgentBoard component.
 * Provides routing and parameter handling for agent-specific boards.
 */

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AgentBoard } from '../../boards/AgentBoard';

const AgentBoardPage: React.FC = () => {
  const { agentId } = useParams<{ agentId?: string }>();
  const [searchParams] = useSearchParams();
  
  // Get agent ID from params or search params, with fallback
  const resolvedAgentId = agentId || searchParams.get('agentId') || 'demo-agent';
  
  // Handle agent updates
  const handleAgentUpdate = (updatedAgentId: string, updates: any) => {
    console.log('Agent updated:', updatedAgentId, updates);
    // TODO: Implement API call to save agent updates
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AgentBoard
          agentId={resolvedAgentId}
          onAgentUpdate={handleAgentUpdate}
          showControls={true}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        />
      </div>
    </div>
  );
};

export default AgentBoardPage;
