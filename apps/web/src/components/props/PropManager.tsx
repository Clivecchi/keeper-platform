/**
 * Prop Manager
 * ============
 * 
 * Minimal component for managing frame props with draft mode feature flag support.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CogIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { isFeatureEnabled } from '../../lib/config';

interface PropManagerProps {
  frameId: string;
  frameType: string;
  currentProps: Record<string, unknown>;
  onPropsUpdate: (props: Record<string, unknown>) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

const PropManager: React.FC<PropManagerProps> = ({
  frameId,
  frameType,
  currentProps,
  onPropsUpdate,
  onClose,
  isOpen = false,
}) => {
  const [jsonContent, setJsonContent] = useState(JSON.stringify(currentProps, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Check feature flags
  const isDraftModeEnabled = isFeatureEnabled('KEEPER_DRAFT_MODE');
  const isPropsSystemEnabled = isFeatureEnabled('PROPS_SYSTEM');

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    setJsonError(null);
    
    try {
      JSON.parse(value);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleSave = () => {
    if (jsonError) return;
    
    try {
      const parsed = JSON.parse(jsonContent);
      onPropsUpdate(parsed);
      onClose?.();
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  if (!isPropsSystemEnabled || !isOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Frame Properties</h3>
              <p className="text-sm text-gray-500">
                {frameType} • {frameId}
                {isDraftModeEnabled && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    Draft Mode
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {jsonError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {jsonError}
            </div>
          )}
          
          <textarea
            value={jsonContent}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={16}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Enter JSON properties..."
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!!jsonError}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PropManager;