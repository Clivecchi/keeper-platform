import React from 'react';

interface AgentRuntimeToolbarProps {
  boardId?: string;
  onRefresh?: () => void;
  onOpenStudio?: (boardId?: string) => void;
}

export const AgentRuntimeToolbar: React.FC<AgentRuntimeToolbarProps> = ({ boardId, onRefresh, onOpenStudio }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onRefresh}
        className="px-3 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
        title="Refresh board data"
      >
        Refresh
      </button>
      {boardId && (
        <button
          onClick={() => onOpenStudio?.(boardId)}
          className="px-3 py-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
          title="Open this board in Board Studio"
        >
          Edit in Board Studio
        </button>
      )}
    </div>
  );
};

export default AgentRuntimeToolbar;


