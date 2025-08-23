/**
 * Prop Block
 * ==========
 * 
 * Visual component that represents a single prop block with data and schema.
 * Used for runtime prop rendering within frames.
 */

import React from 'react';
import { PropBlock as PropBlockType } from '../../types/keeper';

interface PropBlockProps {
  propBlock: PropBlockType;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<PropBlockType>) => void;
  className?: string;
}

const PropBlock: React.FC<PropBlockProps> = ({
  propBlock,
  isEditing = false,
  onUpdate,
  className = '',
}) => {
  const { type, data } = propBlock;

  // Render based on prop block type
  const renderContent = () => {
    switch (type) {
      case 'topic_chip':
        return (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <span>{data.title}</span>
            {data.tags && Array.isArray(data.tags) && data.tags.length > 0 && (
              <span className="ml-2 text-xs opacity-75">
                +{data.tags.length}
              </span>
            )}
          </div>
        );

      case 'draft_summary':
        return (
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{data.title}</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                data.status === 'committed' ? 'bg-green-100 text-green-800' :
                data.status === 'proposed' ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {data.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Updated: {new Date(data.updatedAt).toLocaleDateString()}
            </p>
            {data.hasChanges && (
              <span className="text-xs text-orange-600">• Unsaved changes</span>
            )}
          </div>
        );

      case 'agent_status':
        return (
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              data.status === 'ready' ? 'bg-green-500' :
              data.status === 'busy' ? 'bg-orange-500' :
              data.status === 'offline' ? 'bg-gray-500' :
              'bg-red-500'
            }`} />
            <div>
              <p className="font-medium text-gray-900">{data.name}</p>
              <p className="text-sm text-gray-500">
                {data.model} ({data.provider})
              </p>
              {data.lastActive && (
                <p className="text-xs text-gray-400">
                  Last active: {new Date(data.lastActive).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );

      case 'dialog_state':
        return (
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                {data.agentName || 'Agent'} Conversation
              </h4>
              <span className={`w-2 h-2 rounded-full ${
                data.isActive ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            <p className="text-sm text-gray-600">
              {data.messages?.length || 0} messages
            </p>
          </div>
        );

      default:
        return (
          <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <p className="text-sm">Unknown prop type: {type}</p>
          </div>
        );
    }
  };

  return (
    <div 
      className={`prop-block ${className} ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        position: propBlock.position ? 'absolute' : undefined,
        left: propBlock.position?.x,
        top: propBlock.position?.y,
        width: propBlock.size?.width,
        height: propBlock.size?.height,
      }}
    >
      {renderContent()}
    </div>
  );
};

export default PropBlock;