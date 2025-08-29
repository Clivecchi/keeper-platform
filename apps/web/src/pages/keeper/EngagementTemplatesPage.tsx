import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  Cog6ToothIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

type TabType = 'content-types' | 'engagement-process';

type ContentType = {
  id: string;
  name: string;
  description: string;
  category: 'Text' | 'Media' | 'Interactive' | 'Custom';
  fields: string[];
  system: boolean;
  _count?: { templates: number };
};

type EngagementProcess = {
  id: string;
  name: string;
  description: string;
  steps: string[];
  category: 'Sequential' | 'Parallel' | 'Conditional';
  system: boolean;
  _count?: { templates: number };
};

const EngagementTemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('content-types');
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [engagementProcesses, setEngagementProcesses] = useState<EngagementProcess[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<EngagementProcess | null>(null);

  // Mock data for Content Types
  const mockContentTypes: ContentType[] = [
    {
      id: 'text-prompt',
      name: 'Text Prompt',
      description: 'Simple text-based prompts and questions for keeper interaction',
      category: 'Text',
      fields: ['prompt', 'context', 'expected_response_type'],
      system: true,
      _count: { templates: 12 }
    },
    {
      id: 'reflection-card',
      name: 'Reflection Card',
      description: 'Structured reflection prompts with guided questions',
      category: 'Interactive',
      fields: ['title', 'questions', 'reflection_type', 'tags'],
      system: true,
      _count: { templates: 8 }
    },
    {
      id: 'memory-trigger',
      name: 'Memory Trigger',
      description: 'Content designed to trigger specific memory recall',
      category: 'Interactive',
      fields: ['trigger_text', 'memory_type', 'context_clues'],
      system: true,
      _count: { templates: 5 }
    }
  ];

  // Mock data for Engagement Processes
  const mockEngagementProcesses: EngagementProcess[] = [
    {
      id: 'sole-dialogue',
      name: 'SOLE Dialogue',
      description: 'Self-Organizing Learning Environment conversation flow',
      steps: ['Initial Prompt', 'Memory Activation', 'Pattern Recognition', 'Synthesis'],
      category: 'Sequential',
      system: true,
      _count: { templates: 15 }
    },
    {
      id: 'reflection-journal',
      name: 'Reflection Journal',
      description: 'Guided reflection process with iterative deepening',
      steps: ['Surface Reflection', 'Deep Dive', 'Pattern Analysis', 'Future Integration'],
      category: 'Sequential',
      system: true,
      _count: { templates: 10 }
    },
    {
      id: 'memory-weaving',
      name: 'Memory Weaving',
      description: 'Process for connecting disparate memories into coherent narratives',
      steps: ['Memory Collection', 'Pattern Identification', 'Narrative Construction', 'Integration'],
      category: 'Conditional',
      system: true,
      _count: { templates: 6 }
    }
  ];

  useEffect(() => {
    setContentTypes(mockContentTypes);
    setEngagementProcesses(mockEngagementProcesses);
    setSelectedContentType(mockContentTypes[0]);
    setSelectedProcess(mockEngagementProcesses[0]);
  }, []);

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Text': return 'bg-blue-100 text-blue-800';
      case 'Media': return 'bg-purple-100 text-purple-800';
      case 'Interactive': return 'bg-green-100 text-green-800';
      case 'Sequential': return 'bg-indigo-100 text-indigo-800';
      case 'Parallel': return 'bg-yellow-100 text-yellow-800';
      case 'Conditional': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContentTypesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Content Types</h2>
          <p className="text-muted-foreground mt-1">Define structured content formats for keeper engagement</p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" />
          Create Content Type
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Types List */}
        <div className="space-y-4">
          {contentTypes.map((contentType) => (
            <motion.div
              key={contentType.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedContentType?.id === contentType.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedContentType(contentType)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{contentType.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(contentType.category)}`}>
                  {contentType.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{contentType.description}</p>
              <div className="text-xs text-muted-foreground">
                {contentType._count?.templates || 0} templates using this type
              </div>
            </motion.div>
          ))}
        </div>

        {/* Content Type Details */}
        {selectedContentType && (
          <motion.div
            key={selectedContentType.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Content Type Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-foreground mt-1">{selectedContentType.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-foreground mt-1">{selectedContentType.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{selectedContentType.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fields</label>
                <div className="mt-2 space-y-1">
                  {selectedContentType.fields.map((field, index) => (
                    <div key={index} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      {field}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  const renderEngagementProcessTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Engagement Processes</h2>
          <p className="text-muted-foreground mt-1">Define workflow patterns for keeper interactions</p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4" />
          Create Process
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processes List */}
        <div className="space-y-4">
          {engagementProcesses.map((process) => (
            <motion.div
              key={process.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedProcess?.id === process.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedProcess(process)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{process.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(process.category)}`}>
                  {process.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{process.description}</p>
              <div className="text-xs text-muted-foreground">
                {process._count?.templates || 0} templates using this process
              </div>
            </motion.div>
          ))}
        </div>

        {/* Process Details */}
        {selectedProcess && (
          <motion.div
            key={selectedProcess.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Process Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-foreground mt-1">{selectedProcess.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-foreground mt-1">{selectedProcess.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{selectedProcess.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Process Steps</label>
                <div className="mt-2 space-y-2">
                  {selectedProcess.steps.map((step, index) => (
                    <div key={index} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Engagement Templates</h1>
        <p className="text-muted-foreground">
          Build structured keeper interactions using Content Types and Engagement Processes
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
        <p className="text-amber-800 text-sm">
          <strong>Coming Soon:</strong> Engagement Templates will combine Content Types and Engagement Processes 
          to create structured keeper interaction patterns. Template creation and management tools are in development.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8">
        {renderTabButton('content-types', <DocumentTextIcon className="w-4 h-4" />, 'Content Types')}
        {renderTabButton('engagement-process', <Cog6ToothIcon className="w-4 h-4" />, 'Engagement Process')}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'content-types' && renderContentTypesTab()}
        {activeTab === 'engagement-process' && renderEngagementProcessTab()}
      </motion.div>
    </motion.div>
  );
};

export default EngagementTemplatesPage; 