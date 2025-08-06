/**
 * Domain Board Page
 * 
 * Replaces the RootKeeperPage with a Board-based domain management interface.
 * Uses the Domain Board with domain configuration and management frames.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import type { BoardWithFrames } from '../types/board';

const DomainBoardPage: React.FC = () => {
  const { user } = useAuth();

  // Mock Domain Board data - in real implementation, this would come from API
  const mockDomainBoard: BoardWithFrames = {
    id: 'domain-board-main',
    name: 'Domain Dashboard',
    type: 'domain',
    engagementMode: 'dialogic',
    ownerId: user?.id || 'current-user',
    entityType: 'domain',
    entityId: 'user-domain',
    createdAt: new Date(),
    updatedAt: new Date(),
    frames: [
      {
        id: 'domain-card-frame',
        entityType: 'domain',
        entityId: 'user-domain',
        configId: 'domain-card-config',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          id: 'domain-card-config',
          name: 'Domain Overview',
          type: 'domain_card',
          description: 'Your domain information and statistics',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        currentContent: {
          id: 'domain-card-content',
          type: 'data',
          data: {
            name: user?.name ? `${user.name}'s Domain` : 'My Domain',
            description: 'Your personal space for organization and productivity.',
            memberCount: 1,
            status: 'active',
            createdAt: new Date('2024-01-01'),
          },
          createdAt: new Date(),
        },
      },
      {
        id: 'setup-steps-frame',
        entityType: 'domain',
        entityId: 'user-domain',
        configId: 'setup-steps-config',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          id: 'setup-steps-config',
          name: 'Setup Steps',
          type: 'setup_steps',
          description: 'Complete your domain setup',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        currentContent: {
          id: 'setup-steps-content',
          type: 'data',
          data: {
            steps: [
              { id: 'profile', title: 'Complete Profile', completed: true },
              { id: 'theme', title: 'Choose Theme', completed: true },
              { id: 'agents', title: 'Create First Agent', completed: false },
              { id: 'domain', title: 'Setup Custom Domain', completed: false },
            ],
          },
          createdAt: new Date(),
        },
      },
      {
        id: 'member-list-frame',
        entityType: 'domain',
        entityId: 'user-domain',
        configId: 'member-list-config',
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {
          id: 'member-list-config',
          name: 'Domain Members',
          type: 'member_list',
          description: 'Manage domain members and permissions',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        currentContent: {
          id: 'member-list-content',
          type: 'data',
          data: {
            members: [
              {
                id: user?.id || 'current-user',
                name: user?.name || 'You',
                email: user?.email,
                role: 'owner',
                joinedAt: new Date('2024-01-01'),
              },
            ],
          },
          createdAt: new Date(),
        },
      },
    ],
  };

  const handleFrameUpdate = (frameId: string, data: any) => {
    console.log('Domain frame updated:', frameId, data);
    // In a real implementation, this would update the backend
  };

  const handleFrameAction = (frameId: string, action: string, data?: any) => {
    console.log('Domain frame action:', frameId, action, data);
    
    // Handle domain-specific actions
    switch (action) {
      case 'settings':
        console.log('Opening domain settings...');
        break;
      case 'invite':
        console.log('Opening member invitation...');
        break;
      case 'manage':
        console.log('Opening domain management...');
        break;
      default:
        console.log('Unhandled action:', action);
    }
  };

  return (
    <div className="domain-board-page min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {user?.name || 'Keeper'}.
          </h1>
          <p className="text-muted-foreground">
            This is your quiet space. What will you keep today?
          </p>
        </div>

        <div className="board-container">
          <BoardRenderer
            board={mockDomainBoard}
            onFrameUpdate={handleFrameUpdate}
            onFrameAction={handleFrameAction}
          />
        </div>

        <div className="quick-actions mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="action-card bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary">🤖</span>
              </div>
              <div>
                <h3 className="font-medium text-card-foreground">Create Agent</h3>
                <p className="text-sm text-muted-foreground">Build your first AI assistant</p>
              </div>
            </div>
          </div>
          
          <div className="action-card bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary">🎨</span>
              </div>
              <div>
                <h3 className="font-medium text-card-foreground">Customize Theme</h3>
                <p className="text-sm text-muted-foreground">Personalize your experience</p>
              </div>
            </div>
          </div>
          
          <div className="action-card bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary">📊</span>
              </div>
              <div>
                <h3 className="font-medium text-card-foreground">View Analytics</h3>
                <p className="text-sm text-muted-foreground">See your activity insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainBoardPage;