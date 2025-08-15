/**
 * Template Chooser Modal - Phase 4 Implementation
 * Modal for selecting board templates during creation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { getAllTemplates, type TemplateId, type TemplateManifest } from '../../boards/templates';

// =============================================================================
// TYPES
// =============================================================================

interface TemplateChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: TemplateId | null) => void;
  onSkip: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TemplateChooser: React.FC<TemplateChooserProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onSkip
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const templates = getAllTemplates();

  const handleSelectTemplate = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
  };

  const handleConfirm = () => {
    onSelectTemplate(selectedTemplate);
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
            className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Choose a Board Template
                  </h3>
                  <p className="text-sm text-gray-600">
                    Start with a pre-configured set of frames, or create a blank board
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Blank template option */}
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedTemplate === null
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl">📋</div>
                  {selectedTemplate === null && (
                    <CheckIcon className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Blank Board</h4>
                <p className="text-sm text-gray-600">
                  Start with just Cover and Settings frames
                </p>
              </button>

              {/* Template options */}
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">{template.icon}</div>
                    {selectedTemplate === template.id && (
                      <CheckIcon className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="text-xs text-gray-500">
                    {template.frames.length + 2} frames total
                  </div>
                </button>
              ))}
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <h4 className="font-medium text-gray-900 mb-3">Template Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium">Cover</span>
                    <span className="text-gray-500">• focus</span>
                    <span className="text-xs text-gray-400">(default)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium">Settings</span>
                    <span className="text-gray-500">• form</span>
                    <span className="text-xs text-gray-400">(default)</span>
                  </div>
                  {templates.find(t => t.id === selectedTemplate)?.frames.map((frame, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="font-medium">{frame.name}</span>
                      <span className="text-gray-500">• {frame.pattern}</span>
                      <span className="text-xs text-gray-400">(template)</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip for now
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {selectedTemplate ? `Use ${templates.find(t => t.id === selectedTemplate)?.name}` : 'Create Blank Board'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TemplateChooser;
