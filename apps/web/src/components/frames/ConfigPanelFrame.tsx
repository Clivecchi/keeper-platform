/**
 * Config Panel Frame
 * ==================
 * 
 * Frame component for form-based or tabbed settings interfaces.
 * Supports multiple tabs and dynamic configuration forms.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CogIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ConfigPanelFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';
import { useBoard } from '../../context/BoardContext';

const ConfigPanelFrame: React.FC<ConfigPanelFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  tabs = [],
  activeTab,
  onTabChange,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [currentTab, setCurrentTab] = useState(activeTab || tabs[0]?.id || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { activeBoard } = useBoard();
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(true);
  const [allowEdits, setAllowEdits] = useState<boolean>(true);

  useEffect(() => {
    const behavior = (activeBoard?.config as any)?.behavior || {};
    const rt = behavior?.realtime?.enabled;
    const comp = behavior?.composition?.allowEdits;
    if (typeof rt === 'boolean') setRealtimeEnabled(rt);
    if (typeof comp === 'boolean') setAllowEdits(comp);
  }, [activeBoard?.id]);

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.disabled) return;

    setCurrentTab(tabId);
    onTabChange?.(tabId);
    
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'tab_change', tabId },
      timestamp: new Date(),
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Persist behavior flags
      const boardId = activeBoard?.id;
      if (boardId) {
        await fetch(`/api/board-data/${boardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ behavior: { realtime: { enabled: realtimeEnabled }, composition: { allowEdits } } })
        });
      }
      
      setHasUnsavedChanges(false);
      setSuccess('Configuration saved successfully');
      
      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'save', tabId: currentTab },
        timestamp: new Date(),
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setHasUnsavedChanges(false);
    setError(null);
    setSuccess(null);
    
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'reset', tabId: currentTab },
      timestamp: new Date(),
    });
  };

  // Default tabs if none provided
  const defaultTabs: FrameTab[] = [
    {
      id: 'general',
      label: 'General',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frame Name
            </label>
            <input
              type="text"
              defaultValue={frameInstance.FrameConfig?.name || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => setHasUnsavedChanges(true)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              defaultValue={frameInstance.FrameConfig?.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => setHasUnsavedChanges(true)}
            />
          </div>
        </div>
      )
    },
    {
      id: 'board',
      label: 'Board',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Realtime updates</div>
              <div className="text-xs text-gray-500">Toggle live SSE updates for this board</div>
            </div>
            <input type="checkbox" checked={realtimeEnabled} onChange={(e) => { setRealtimeEnabled(e.target.checked); setHasUnsavedChanges(true); }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Allow composition edits</div>
              <div className="text-xs text-gray-500">Enable adding/removing/reordering frames</div>
            </div>
            <input type="checkbox" checked={allowEdits} onChange={(e) => { setAllowEdits(e.target.checked); setHasUnsavedChanges(true); }} />
          </div>
        </div>
      )
    }
  ];

  const displayTabs = tabs.length > 0 ? tabs : defaultTabs;
  const activeTabContent = displayTabs.find(tab => tab.id === currentTab);

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <CogIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Config Panel</h3>
        </div>
        <p className="text-sm text-gray-600">
          Form-based configuration interface with tabbed navigation.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">
              {frameInstance.FrameConfig?.name || 'Configuration'}
            </h3>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-orange-600">Unsaved changes</span>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {displayTabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4">
            {displayTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                disabled={tab.disabled}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2"
            >
              <CheckIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTabContent && (
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTabContent.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={handleReset}
          disabled={!hasUnsavedChanges || isLoading}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CheckIcon className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanelFrame;
