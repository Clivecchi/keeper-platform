/**
 * Auth Debug Component
 * ====================
 * 
 * Simple component to help debug authentication state.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

export const AuthDebug: React.FC = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-100 rounded-lg p-4 border border-gray-300"
    >
      <div className="flex items-center space-x-2 mb-3">
        <InformationCircleIcon className="w-5 h-5 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Authentication Status</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Loading:</span>
          <div className="flex items-center space-x-1">
            {isLoading ? (
              <>
                <ClockIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600">Yes</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-green-600">No</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Authenticated:</span>
          <div className="flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Yes</span>
              </>
            ) : (
              <>
                <XCircleIcon className="w-4 h-4 text-red-500" />
                <span className="text-red-600">No</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Token:</span>
          <span className={token ? 'text-green-600' : 'text-red-600'}>
            {token ? 'Present' : 'Missing'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>User:</span>
          <span className={user ? 'text-green-600' : 'text-red-600'}>
            {user ? user.email || 'Present' : 'Missing'}
          </span>
        </div>
      </div>
      
      {!isAuthenticated && !isLoading && (
        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-xs text-yellow-800">
            You need to <a href="/login" className="underline">sign in</a> to access protected routes like /studio/agent-board.
          </p>
        </div>
      )}
    </motion.div>
  );
};
