/**
 * Draggable Tabs Component - Phase 3 Implementation
 * Drag-to-reorder tabs with pinned Cover and Settings
 */

import React, { useState, useRef } from 'react';
import { motion, Reorder, useDragControls, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon,
  BookOpenIcon,
  EllipsisHorizontalIcon,
  Bars3Icon,
  ChevronDownIcon,
  CheckIcon
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
  allowedModes?: string[];
}

interface DraggableTabsProps {
  tabs: TabData[];
  selectedTabId?: string;
  onTabSelect: (tabId: string) => void;
  onTabReorder: (newOrder: string[]) => void;
  onTabConfig?: (tabId: string) => void;
  onModeChange?: (tabId: string, mode: string) => void;
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
  onModeChange?: (mode: string) => void;
  isDragging: boolean;
}> = ({ tab, isSelected, onSelect, onConfig, onModeChange, isDragging }) => {
  const dragControls = useDragControls();
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // All tabs look EXACTLY the same - no special icons or indicators

  // EXACT Frame 3 design: "FrameName.mode" with blue period when selected, bottom-aligned mode
  const renderTabName = () => {
    const currentMode = tab.pattern || 'default';
    return (
      <span className="flex items-end">
        <span className="font-medium">{tab.name}</span>
        <span className={`${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>.</span>
        <span className="text-xs text-gray-500 font-normal ml-0.5">{currentMode}</span>
      </span>
    );
  };

  const availableModes = tab.allowedModes || ['default', 'canvas', 'dialogic', 'wizard', 'focus'];

  const handleModeSelect = (mode: string) => {
    if (onModeChange && mode !== tab.pattern) {
      onModeChange(mode);
    }
    setShowModeSelector(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard navigation for reordering (Alt + Arrow keys)
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      // This would need to be implemented at the parent level
      console.log('Keyboard reorder:', e.key);
    }
  };

  return (
    <Reorder.Item
      value={tab}
      dragListener={!tab.isPinned}
      dragControls={dragControls}
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onKeyDown={handleKeyDown}
      className={`
        group relative flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg cursor-pointer
        transition-all duration-200 select-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${isSelected 
          ? 'bg-white text-gray-900 border-b-2 border-blue-500 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
        ${isDragging ? 'shadow-lg z-10' : ''}
        ${tab.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      `}
      whileDrag={{ scale: 1.05, rotate: 2 }}
      initial={false}
    >
      <div className="flex items-center flex-1 min-w-0 px-1" onClick={onSelect}>
        <div className="truncate">{renderTabName()}</div>
      </div>
      
      {/* Mode Selector - Only visible on active tab */}
      {isSelected && onModeChange && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModeSelector(!showModeSelector);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            title="Change mode"
            aria-label="Change engagement mode"
            aria-expanded={showModeSelector}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showModeSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32"
              >
                {availableModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeSelect(mode)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between ${
                      mode === tab.pattern ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="capitalize">{mode}</span>
                    {mode === tab.pattern && <CheckIcon className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Config button - Only visible on active tab */}
      {onConfig && isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfig();
          }}
          className="text-gray-400 hover:text-gray-600 p-1 rounded"
          title="Configure frame"
          aria-label="Configure frame settings"
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </button>
      )}
      
      {/* Drag handle (only for non-pinned tabs) */}
      {!tab.isPinned && (
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 rounded"
          onPointerDown={(e) => dragControls.start(e)}
          title="Drag to reorder"
          aria-label="Drag to reorder tab"
        >
          <Bars3Icon className="w-3 h-3" />
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
  onModeChange,
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

  const handleModeChange = (tabId: string, mode: string) => {
    if (onModeChange) {
      onModeChange(tabId, mode);
    }
  };

  if (disabled || tabs.length === 0) {
    // Fallback to simple tabs when disabled or no tabs
    return (
      <div role="tablist" className="flex space-x-1 border-b border-gray-200 bg-gray-50 px-4">
        {tabs.map((tab) => {
          // EXACT same design as Frame 3 for fallback too
          const isTabSelected = selectedTabId === tab.id;
          const renderTabName = () => {
            const currentMode = tab.pattern || 'default';
            return (
              <span className="flex items-end">
                <span className="font-medium">{tab.name}</span>
                <span className={`${isTabSelected ? 'text-blue-500' : 'text-gray-400'}`}>.</span>
                <span className="text-xs text-gray-500 font-normal ml-0.5">{currentMode}</span>
              </span>
            );
          };

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selectedTabId === tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-t-lg
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${selectedTabId === tab.id 
                  ? 'bg-white text-gray-900 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="truncate">{renderTabName()}</div>
              {onTabConfig && selectedTabId === tab.id && (
                <Cog6ToothIcon className="w-4 h-4 text-gray-400 hover:text-gray-600 ml-2" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" className="flex border-b border-gray-200 bg-gray-50 px-4 group">
      {/* Pinned tabs (non-draggable) - using EXACT same design as Frame 3 */}
      {pinnedTabs.map((tab) => {
        const isTabSelected = selectedTabId === tab.id;
        const renderTabName = () => {
          const currentMode = tab.pattern || 'default';
          return (
            <span className="flex items-end">
              <span className="font-medium">{tab.name}</span>
              <span className={`${isTabSelected ? 'text-blue-500' : 'text-gray-400'}`}>.</span>
              <span className="text-xs text-gray-500 font-normal ml-0.5">{currentMode}</span>
            </span>
          );
        };

        return (
          <div key={tab.id} className="relative group">
            <button
              role="tab"
              aria-selected={selectedTabId === tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-t-lg
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${selectedTabId === tab.id 
                  ? 'bg-white text-gray-900 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="truncate">{renderTabName()}</div>
            </button>
            
            {/* Mode selector and config for pinned tabs when selected */}
            {selectedTabId === tab.id && (
              <div className="absolute top-0 right-0 flex items-center space-x-1 h-full pr-2">
                {onModeChange && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle mode change for pinned tabs
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Change mode"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                )}
                {onTabConfig && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabConfig(tab.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Configure frame"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      
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
              onModeChange={onModeChange ? (mode) => handleModeChange(tab.id, mode) : undefined}
              isDragging={isDragging}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};

export default DraggableTabs;
