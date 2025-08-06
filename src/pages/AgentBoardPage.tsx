/**
 * Agent Board Demo Page
 * 
 * Demo page for testing the Agent Board system with mock data.
 * Shows how the Board and Frame rendering system works.
 */

import React from 'react';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import type { BoardWithFrames } from '../types/board';

// Mock data for testing the Agent Board
const mockAgentBoard: BoardWithFrames = {
  id: 'agent-board-demo',
  name: 'Agent Builder',
  type: 'agent',
  engagementMode: 'dialogic',
  ownerId: 'demo-user',
  entityType: 'agent',
  entityId: 'demo-agent',
  createdAt: new Date(),
  updatedAt: new Date(),
  frames: [
    {
      id: 'agent-identity-frame',
      entityType: 'agent',
      entityId: 'demo-agent',
      configId: 'agent-identity-config',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: {
        id: 'agent-identity-config',
        name: 'Agent Identity',
        type: 'agent_identity',
        description: 'Configure your agent\'s identity and appearance',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      currentContent: {
        id: 'agent-identity-content',
        type: 'data',
        data: {
          name: 'Kip',
          role: 'Assistant',
          description: 'A helpful AI assistant focused on productivity and organization.',
          avatar: undefined,
        },
        createdAt: new Date(),
      },
    },
    {
      id: 'tone-selector-frame',
      entityType: 'agent',
      entityId: 'demo-agent',
      configId: 'tone-selector-config',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: {
        id: 'tone-selector-config',
        name: 'Communication Tone',
        type: 'tone_selector',
        description: 'Define how your agent communicates',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      currentContent: {
        id: 'tone-selector-content',
        type: 'data',
        data: {
          primary: 'friendly',
          formality: 'professional',
          enthusiasm: 'medium',
          supportiveness: 'collaborative',
        },
        createdAt: new Date(),
      },
    },
    {
      id: 'agent-preview-frame',
      entityType: 'agent',
      entityId: 'demo-agent',
      configId: 'agent-preview-config',
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: {
        id: 'agent-preview-config',
        name: 'Agent Preview',
        type: 'agent_preview',
        description: 'Preview how your agent will appear',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      currentContent: {
        id: 'agent-preview-content',
        type: 'data',
        data: {
          name: 'Kip',
          role: 'Assistant',
          description: 'A helpful AI assistant focused on productivity and organization.',
          tone: {
            primary: 'friendly',
            formality: 'professional',
            enthusiasm: 'medium',
            supportiveness: 'collaborative',
          },
        },
        createdAt: new Date(),
      },
    },
  ],
};

const AgentBoardPage: React.FC = () => {
  const handleFrameUpdate = (frameId: string, data: any) => {
    console.log('Frame updated:', frameId, data);
    // In a real implementation, this would update the backend
  };

  const handleFrameAction = (frameId: string, action: string, data?: any) => {
    console.log('Frame action:', frameId, action, data);
    // In a real implementation, this would handle actions like save, preview, etc.
  };

  return (
    <div className="agent-board-page min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Agent Board Demo
          </h1>
          <p className="text-muted-foreground">
            This is a demonstration of the Keeper Board system with an Agent Board.
            The Board uses a dialogic engagement mode with three frames.
          </p>
        </div>

        <div className="board-container">
          <BoardRenderer
            board={mockAgentBoard}
            onFrameUpdate={handleFrameUpdate}
            onFrameAction={handleFrameAction}
          />
        </div>

        <div className="demo-info mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Demo Information</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Board Type: {mockAgentBoard.type}</li>
            <li>• Engagement Mode: {mockAgentBoard.engagementMode}</li>
            <li>• Frame Count: {mockAgentBoard.frames.length}</li>
            <li>• Frame Types: {mockAgentBoard.frames.map(f => f.config.type).join(', ')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AgentBoardPage;