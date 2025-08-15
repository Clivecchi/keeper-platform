/**
 * Draggable Tabs Component - Phase 3 Implementation
 * Drag-to-reorder tabs with pinned Cover and Settings
 */

import React, { useState, useRef } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import {
  Cog6ToothIcon,
  BookOpenIcon,
  EllipsisHorizontalIcon,
  GripVerticalIcon
} from '@heroicons/react/24/outline';

// =============================================================================
// TYPES
// =============================================================================

interface TabData {
  id: string;
  name: string;
  role?: string;
  pattern?: string;
  isPinned?: boolean;
}

interface DraggableTabsProps {
  tabs: TabData[];
  selectedTabId?: string;
  onTabSelect: (tabId: string) => void;
  onTabReorder: (newOrder: string[]) => void;
  onTabConfig?: (tabId: string) => void;
  disabled?: boolean;
}

// =============================================================================
// INDIVIDUAL TAB COMPONENT
// =============================================================================

const DraggableTab: React.FC<{
  tab: TabData;
  isSelected: boolean;
  onSelect: () => void;
  onConfig?: () => void;
  isDragging: boolean;
}> = ({ tab, isSelected, onSelect, onConfig, isDragging }) => {
  const dragControls = useDragControls();
  
  const getTabIcon = () => {
    if (tab.role === 'cover') return <BookOpenIcon className="w-4 h-4" />;
    if (tab.role === 'settings') return <Cog6ToothIcon className="w-4 h-4" />;
    return null;
  };

  const getTabIndicator = () => {
    if (tab.role === 'cover' || tab.role === 'settings') {
      return (
        <div className="w-2 h-2 bg-green-500 rounded-full" title="Default frame - cannot be deleted" />
      );
    }
    return null;
  };

  return (
    <Reorder.Item
      value={tab}
      dragListener={!tab.isPinned}
      dragControls={dragControls}
      className={`
        relative flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg cursor-pointer
        transition-all duration-200 select-none
        ${isSelected 
          ? 'bg-white text-gray-900 border-b-2 border-blue-500' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
        ${isDragging ? 'shadow-lg z-10' : ''}
        ${tab.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      `}
      whileDrag={{ scale: 1.05, rotate: 2 }}
      initial={false}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0" onClick={onSelect}>
        {getTabIcon()}
        <span className="truncate max-w-32">{tab.name}</span>
        {getTabIndicator()}
        {tab.pattern && !tab.role && (
          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {tab.pattern}
          </span>
        )}
      </div>
      
      {/* Drag handle (only for non-pinned tabs) */}
      {!tab.isPinned && (
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1"
          onPointerDown={(e) => dragControls.start(e)}
          title="Drag to reorder"
        >
          <GripVerticalIcon className="w-3 h-3" />
        </button>
      )}
      
      {/* Config button */}
      {onConfig && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfig();
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1"
          title="Configure frame"
        >
          <EllipsisHorizontalIcon className="w-4 h-4" />
        </button>
      )}
    </Reorder.Item>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DraggableTabs: React.FC<DraggableTabsProps> = ({
  tabs,
  selectedTabId,
  onTabSelect,
  onTabReorder,
  onTabConfig,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  // Separate pinned and draggable tabs
  const pinnedTabs = tabs.filter(tab => tab.isPinned || tab.role === 'cover' || tab.role === 'settings');
  const draggableTabs = tabs.filter(tab => !tab.isPinned && tab.role !== 'cover' && tab.role !== 'settings');
  
  const handleReorder = (newOrder: TabData[]) => {
    if (disabled) return;
    
    // Reconstruct full order: pinned tabs first, then reordered draggable tabs
    const fullOrder = [...pinnedTabs, ...newOrder].map(tab => tab.id);
    onTabReorder(fullOrder);
  };

  if (disabled || tabs.length === 0) {
    // Fallback to simple tabs when disabled or no tabs
    return (
      <div className="flex space-x-1 border-b border-gray-200 bg-gray-50 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg
              transition-colors duration-200
              ${selectedTabId === tab.id 
                ? 'bg-white text-gray-900 border-b-2 border-blue-500' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            {tab.role === 'cover' && <BookOpenIcon className="w-4 h-4" />}
            {tab.role === 'settings' && <Cog6ToothIcon className="w-4 h-4" />}
            <span className="truncate max-w-32">{tab.name}</span>
            {(tab.role === 'cover' || tab.role === 'settings') && (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex border-b border-gray-200 bg-gray-50 px-4 group">
      {/* Pinned tabs (non-draggable) */}
      {pinnedTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          className={`
            flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg
            transition-colors duration-200
            ${selectedTabId === tab.id 
              ? 'bg-white text-gray-900 border-b-2 border-blue-500' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          {tab.role === 'cover' && <BookOpenIcon className="w-4 h-4" />}
          {tab.role === 'settings' && <Cog6ToothIcon className="w-4 h-4" />}
          <span className="truncate max-w-32">{tab.name}</span>
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Default frame - cannot be deleted" />
          {onTabConfig && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabConfig(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1"
              title="Configure frame"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
          )}
        </button>
      ))}
      
      {/* Draggable tabs */}
      {draggableTabs.length > 0 && (
        <Reorder.Group
          axis="x"
          values={draggableTabs}
          onReorder={handleReorder}
          className="flex"
          style={{ display: 'flex' }}
        >
          {draggableTabs.map((tab) => (
            <DraggableTab
              key={tab.id}
              tab={tab}
              isSelected={selectedTabId === tab.id}
              onSelect={() => onTabSelect(tab.id)}
              onConfig={onTabConfig ? () => onTabConfig(tab.id) : undefined}
              isDragging={isDragging}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};

export default DraggableTabs;
