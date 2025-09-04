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
      {/* Runtime must not expose Studio editing controls for AHB */}
    </div>
  );
};

export default AgentRuntimeToolbar;


