/**
 * Conflict Dialog Component - Phase 3 Implementation
 * Handle merge conflicts when multiple users edit the same board
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// =============================================================================
// TYPES
// =============================================================================

interface ConflictDialogProps {
  isOpen: boolean;
  conflictData?: {
    serverVersion: any;
    clientEtag: string;
    serverEtag: string;
  };
  onResolve: (resolution: 'server' | 'overwrite') => void;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  conflictData,
  onResolve,
  onClose
}) => {
  if (!isOpen || !conflictData) return null;

  const serverVersion = conflictData.serverVersion;
  const serverTime = serverVersion?.updatedAt ? new Date(serverVersion.updatedAt) : new Date();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={onClose}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Conflict Detected
                  </h3>
                  <p className="text-sm text-gray-600">
                    This board has been modified by another session
                  </p>
                </div>
              </div>

              {/* Conflict details */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-2">What happened?</p>
                  <p className="mb-3">
                    The board "{serverVersion?.name || 'Unknown'}" was modified at{' '}
                    <strong>{serverTime.toLocaleString()}</strong> while you were editing.
                  </p>
                  <p>
                    Choose how to resolve this conflict:
                  </p>
                </div>
              </div>

              {/* Resolution options */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => onResolve('server')}
                  className="w-full flex items-center p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <ArrowPathIcon className="w-5 h-5 text-blue-600 mr-3 group-hover:text-blue-700" />
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-blue-900">
                      Reload (Recommended)
                    </div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-700">
                      Discard your changes and load the latest version from the server
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onResolve('overwrite')}
                  className="w-full flex items-center p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors group"
                >
                  <DocumentDuplicateIcon className="w-5 h-5 text-red-600 mr-3 group-hover:text-red-700" />
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-red-900">
                      Overwrite Server
                    </div>
                    <div className="text-sm text-gray-600 group-hover:text-red-700">
                      Force save your changes, replacing the server version
                    </div>
                  </div>
                </button>
              </div>

              {/* Warning */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> If you choose "Overwrite Server", any changes made by 
                  other users will be lost. The "Reload" option is usually safer.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConflictDialog;
