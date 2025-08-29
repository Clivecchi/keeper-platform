import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

type TabType = 'registry' | 'create';

type MemoryPattern = {
  id: string;
  name: string;
  description: string;
  type: 'SOLE' | 'CRMTimeline' | 'Custom';
  system: boolean;
  createdAt: string;
  _count?: { Keeper: number };
};

const MemoryPatternsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [patterns, setPatterns] = useState<MemoryPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<MemoryPattern | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for now - replace with API calls later
  const mockPatterns: MemoryPattern[] = [
    {
      id: 'sole',
      name: 'SOLE',
      description: 'Self-Organizing Learning Environment - AI agents can propose and evolve their own memory architecture',
      type: 'SOLE',
      system: true,
      createdAt: '2024-01-01T00:00:00Z',
      _count: { Keeper: 15 }
    },
    {
      id: 'crm-timeline',
      name: 'CRM Timeline',
      description: 'Customer relationship management focused memory pattern with timeline organization',
      type: 'CRMTimeline',
      system: true,
      createdAt: '2024-01-01T00:00:00Z',
      _count: { Keeper: 8 }
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setPatterns(mockPatterns);
      setSelectedPattern(mockPatterns[0]);
      setLoading(false);
    }, 500);
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

  const renderRegistryTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Memory Patterns Registry</h2>
          <p className="text-muted-foreground mt-1">Manage memory organization patterns for AI agents</p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Pattern
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pattern List */}
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <motion.div
              key={pattern.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedPattern?.id === pattern.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedPattern(pattern)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{pattern.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  pattern.system ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {pattern.system ? 'System' : 'Custom'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
              <div className="text-xs text-muted-foreground">
                {pattern._count?.Keeper || 0} keepers using this pattern
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pattern Details */}
        {selectedPattern && (
          <motion.div
            key={selectedPattern.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Pattern Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-foreground mt-1">{selectedPattern.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-foreground mt-1">{selectedPattern.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{selectedPattern.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Usage</label>
                <p className="text-foreground mt-1">{selectedPattern._count?.Keeper || 0} keepers</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  const renderCreateTab = () => (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Create Memory Pattern</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-amber-800 text-sm">
          <strong>Coming Soon:</strong> Custom memory pattern creation will be available in a future update.
        </p>
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Memory Patterns</h1>
        <p className="text-muted-foreground">Configure how AI agents organize and recall information</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8">
        {renderTabButton('registry', <SparklesIcon className="w-4 h-4" />, 'Registry')}
        {renderTabButton('create', <PlusIcon className="w-4 h-4" />, 'Create')}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'registry' && renderRegistryTab()}
        {activeTab === 'create' && renderCreateTab()}
      </motion.div>
    </motion.div>
  );
};

export default MemoryPatternsPage; 