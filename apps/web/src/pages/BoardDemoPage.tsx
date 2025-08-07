/**
 * Board Demo Page
 * ===============
 * 
 * Public demo page for testing the Board system without authentication.
 * Shows AgentBoard functionality in a standalone context.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CpuChipIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { AgentBoard } from '../boards/AgentBoard';
import { BoardProvider } from '../context/BoardContext';
import { FrameProvider } from '../context/FrameContext';
import { AuthDebug } from '../components/AuthDebug';

const BoardDemoPage: React.FC = () => {
  useEffect(() => {
    // Set page title
    document.title = 'Board System Demo - Keeper Platform';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CpuChipIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Board System Demo</h1>
                <p className="text-gray-600">Testing the new Board and Frame architecture</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/login"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Full Access</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-blue-50 rounded-lg p-6 mb-8"
        >
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Board System Architecture Demo
              </h3>
              <div className="text-blue-800 space-y-2">
                <p>
                  This demo showcases the new Board system that replaces the legacy MediaFrame architecture.
                  The system consists of:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>BoardContext:</strong> Manages board state and frame interactions</li>
                  <li><strong>BoardRenderer:</strong> Dynamic layout engine with 6 layout types</li>
                  <li><strong>FrameRenderer:</strong> Renders individual frame components</li>
                  <li><strong>AgentBoard:</strong> Specialized board for agent configuration</li>
                </ul>
                <p className="mt-3">
                  <strong>Current Demo:</strong> AgentBoard with dialogic engagement mode, 
                  featuring agent preview, configuration, and interaction frames.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Board Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6">
            {/* Provide required contexts for the demo */}
            <FrameProvider>
              <BoardProvider>
                <AgentBoard
                  agentId="demo-agent-board-test"
                  showControls={true}
                  onAgentUpdate={(agentId, updates) => {
                    console.log('Demo: Agent updated:', agentId, updates);
                  }}
                />
              </BoardProvider>
            </FrameProvider>
          </div>
        </motion.div>

        {/* Auth Debug */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-8"
        >
          <AuthDebug />
        </motion.div>

        {/* Technical Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Frame Types</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>agent_preview</span>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex justify-between">
                <span>dialog</span>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex justify-between">
                <span>config_panel</span>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex justify-between">
                <span>media_card</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>preview</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>process_frame</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>code_snippet</span>
                <span className="text-gray-400">Available</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout Options</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>column</span>
                <span className="text-green-600">✓ Current</span>
              </div>
              <div className="flex justify-between">
                <span>grid</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>row</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>wizard</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>focus</span>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex justify-between">
                <span>canvas</span>
                <span className="text-gray-400">Available</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            This demo runs independently of authentication. 
            <a href="/login" className="text-blue-600 hover:text-blue-700 ml-1">
              Sign in
            </a> for full platform access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BoardDemoPage;
