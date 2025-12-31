import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TagIcon,
  UserGroupIcon,
  PlusIcon,
  SparklesIcon,
  CogIcon,
  UserIcon
} from '@heroicons/react/24/outline';

type TabType = 'registry' | 'create';

type AgentClassInfo = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  system: boolean;
  _count?: { agents: number };
};

const AgentClassesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [classes, setClasses] = useState<AgentClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<AgentClassInfo | null>(null);

  // Mock data based on existing agent classes
  const mockClasses: AgentClassInfo[] = [
    {
      id: 'standard',
      name: 'Standard',
      description: 'Single-purpose agents with specific capabilities and focused functionality',
      capabilities: ['Specialized tasks', 'Direct execution', 'Single context scope'],
      system: true,
      _count: { agents: 12 }
    },
    {
      id: 'coordinator',
      name: 'Coordinator',
      description: 'Orchestrate multiple agents for complex workflows and task coordination',
      capabilities: ['Agent bundling', 'Workflow management', 'Result aggregation', 'Sequential execution'],
      system: true,
      _count: { agents: 3 }
    },
    {
      id: 'lead',
      name: 'Lead',
      description: 'Standalone AI interfaces with full chat experiences and user interaction',
      capabilities: ['Conversational interface', 'Memory persistence', 'User session management', 'Personality'],
      system: true,
      _count: { agents: 2 }
    },
    {
      id: 'persona',
      name: 'Persona',
      description: 'Personality-based agents with specific traits and behavioral patterns',
      capabilities: ['Character consistency', 'Emotional intelligence', 'Role playing', 'Contextual responses'],
      system: true,
      _count: { agents: 0 }
    }
  ];

  useEffect(() => {
    setClasses(mockClasses);
    setSelectedClass(mockClasses[0]);
  }, []);

  const getClassIcon = (className: string) => {
    switch (className.toLowerCase()) {
      case 'standard': return <CogIcon className="w-5 h-5" />;
      case 'coordinator': return <UserGroupIcon className="w-5 h-5" />;
      case 'lead': return <SparklesIcon className="w-5 h-5" />;
      case 'persona': return <UserIcon className="w-5 h-5" />;
      default: return <TagIcon className="w-5 h-5" />;
    }
  };

  const getClassColor = (className: string) => {
    switch (className.toLowerCase()) {
      case 'standard': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'coordinator': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'lead': return 'text-green-600 bg-green-100 border-green-200';
      case 'persona': return 'text-pink-600 bg-pink-100 border-pink-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

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
          <h2 className="text-2xl font-semibold text-foreground">Agent Classes Registry</h2>
          <p className="text-muted-foreground mt-1">Manage different types of AI agent behaviors and capabilities</p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class List */}
        <div className="space-y-4">
          {classes.map((agentClass) => (
            <motion.div
              key={agentClass.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedClass?.id === agentClass.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedClass(agentClass)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-lg border ${getClassColor(agentClass.name)}`}>
                    {getClassIcon(agentClass.name)}
                  </span>
                  <h3 className="font-medium text-foreground">{agentClass.name}</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {agentClass._count?.agents || 0} agents
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{agentClass.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Class Details */}
        {selectedClass && (
          <motion.div
            key={selectedClass.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className={`p-2 rounded-lg border ${getClassColor(selectedClass.name)}`}>
                {getClassIcon(selectedClass.name)}
              </span>
              <h3 className="text-lg font-semibold text-foreground">{selectedClass.name} Class</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{selectedClass.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Core Capabilities</label>
                <div className="mt-2 space-y-1">
                  {selectedClass.capabilities.map((capability, index) => (
                    <div key={index} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      {capability}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active Agents</label>
                <p className="text-foreground mt-1">{selectedClass._count?.agents || 0} agents using this class</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  const renderCreateTab = () => (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Create Agent Class</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-amber-800 text-sm">
          <strong>Coming Soon:</strong> Custom agent class creation will be available in a future update.
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Agent Classes</h1>
        <p className="text-muted-foreground">Manage different types of AI agent behaviors and capabilities</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8">
        {renderTabButton('registry', <TagIcon className="w-4 h-4" />, 'Registry')}
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

export default AgentClassesPage; 