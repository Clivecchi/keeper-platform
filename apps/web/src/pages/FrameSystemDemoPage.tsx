/**
 * Frame System Demo Page
 * ======================
 * 
 * Demonstration page showing the new Frame system capabilities.
 * This page can be used for testing and showcasing frame components.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FrameRenderer
} from '../components/frames';
import { 
  ExtendedFrameInstance,
  FrameType,
  EngagementMode 
} from '../types/frame';

const FrameSystemDemoPage: React.FC = () => {
  const [selectedFrameType, setSelectedFrameType] = useState<FrameType>('preview');
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('dialogic');

  // Mock frame instance data
  const mockFrameInstance: ExtendedFrameInstance = {
    id: 'demo-frame-1',
    entityType: 'demo',
    entityId: 'demo-entity-1',
    configId: 'demo-config-1',
    currentContentId: 'demo-content-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    FrameConfig: {
      id: 'demo-config-1',
      name: 'Demo Frame Configuration',
      description: 'A demonstration frame for testing the Frame system',
      theme: { primaryColor: '#3B82F6', backgroundColor: '#F8FAFC' },
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: selectedFrameType,
      engagementMode: engagementMode,
    },
    FrameContent_FrameInstance_currentContentIdToFrameContent: {
      id: 'demo-content-1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
      alt: 'Modern office workspace',
      createdAt: new Date(),
      playlistOwnerId: 'demo-frame-1',
    },
    FrameContent_FrameContent_playlistOwnerIdToFrameInstance: [
      {
        id: 'demo-content-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
        alt: 'Modern office workspace',
        createdAt: new Date(),
        playlistOwnerId: 'demo-frame-1',
      },
      {
        id: 'demo-content-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&h=600&fit=crop',
        alt: 'Creative workspace',
        createdAt: new Date(),
        playlistOwnerId: 'demo-frame-1',
      }
    ]
  };

  const frameTypes: { value: FrameType; label: string; description: string }[] = [
    { value: 'media_card', label: 'Media Card', description: 'Rich media presentation with controls' },
    { value: 'preview', label: 'Preview', description: 'Compact content summary' },
    { value: 'dialog', label: 'Dialog', description: 'Agent interaction interface' },
    { value: 'config_panel', label: 'Config Panel', description: 'Settings and configuration' },
    { value: 'process_frame', label: 'Process Frame', description: 'Multi-step workflow' },
    { value: 'agent_preview', label: 'Agent Preview', description: 'Agent identity display' },
    { value: 'code_snippet', label: 'Code Snippet', description: 'Syntax-highlighted code' },
  ];

  const engagementModes: { value: EngagementMode; label: string }[] = [
    { value: 'dialogic', label: 'Dialogic' },
    { value: 'wizard', label: 'Wizard' },
    { value: 'focus', label: 'Focus' },
    { value: 'canvas', label: 'Canvas' },
  ];

  const handleFrameInteraction = (interaction: any) => {
    console.log('Frame interaction:', interaction);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Frame System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore the new Frame system that replaces the legacy MediaFrame architecture. 
            Select different frame types and engagement modes to see how they render.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Frame Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Frame Type
              </label>
              <div className="space-y-2">
                {frameTypes.map((type) => (
                  <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frameType"
                      value={type.value}
                      checked={selectedFrameType === type.value}
                      onChange={(e) => setSelectedFrameType(e.target.value as FrameType)}
                      className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Engagement Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Engagement Mode
              </label>
              <div className="space-y-2">
                {engagementModes.map((mode) => (
                  <label key={mode.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="engagementMode"
                      value={mode.value}
                      checked={engagementMode === mode.value}
                      onChange={(e) => setEngagementMode(e.target.value as EngagementMode)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="text-sm font-medium text-gray-900">{mode.label}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Frame Demo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {frameTypes.find(t => t.value === selectedFrameType)?.label} Frame
            </h2>
            <p className="text-sm text-gray-600">
              Engagement Mode: <span className="font-medium capitalize">{engagementMode}</span>
            </p>
          </div>

          <motion.div
            key={`${selectedFrameType}-${engagementMode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <FrameRenderer
              frameInstance={{
                ...mockFrameInstance,
                FrameConfig: {
                  ...mockFrameInstance.FrameConfig!,
                  frameType: selectedFrameType,
                  engagementMode: engagementMode,
                }
              }}
              onInteraction={handleFrameInteraction}
              animationPreset="fade"
            />
          </motion.div>
        </div>

        {/* Technical Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Technical Implementation
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Frame System Architecture:</strong> Built on three Prisma models - 
              FrameConfig (layout/theme), FrameContent (actual content), and FrameInstance (bindings).
            </p>
            <p>
              <strong>Dynamic Rendering:</strong> The FrameRenderer uses a registry pattern with 
              lazy-loaded components for optimal performance.
            </p>
            <p>
              <strong>State Management:</strong> FrameContext provides global state management 
              with useFrame hook for easy access.
            </p>
            <p>
              <strong>Interaction Tracking:</strong> All frame interactions are logged and can 
              be used for analytics and user behavior analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameSystemDemoPage;
