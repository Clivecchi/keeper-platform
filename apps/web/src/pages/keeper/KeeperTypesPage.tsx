import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { keeperApi } from '../../lib/keeperApi';
import { KeeperType, EngagementTemplate } from '../../types/keeper';
import SoleArchitectureTab from '../../components/keeper/SoleArchitectureTab';
import {
  SparklesIcon,
  TagIcon,
  DocumentTextIcon,
  CpuChipIcon,
  PlusIcon,
  InformationCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabProps[] = [
  { id: 'metadata', label: 'Metadata', icon: <InformationCircleIcon className="w-4 h-4" /> },
  { id: 'templates', label: 'Engagement Templates', icon: <DocumentTextIcon className="w-4 h-4" /> },
  { id: 'memory', label: 'Memory Pattern', icon: <CpuChipIcon className="w-4 h-4" /> }
];

const KeeperTypesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keeperTypes, setKeeperTypes] = useState<KeeperType[]>([]);
  const [selectedKeeperType, setSelectedKeeperType] = useState<KeeperType | null>(null);
  const [activeTab, setActiveTab] = useState('metadata');
  const [engagementTemplates, setEngagementTemplates] = useState<EngagementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKeeperTypes();
  }, []);

  useEffect(() => {
    if (selectedKeeperType && activeTab === 'templates') {
      loadEngagementTemplates();
    }
  }, [selectedKeeperType, activeTab]);

  const loadKeeperTypes = async () => {
    try {
      setLoading(true);
      const response = await keeperApi.getKeeperTypes();
      
      if (response.success && response.data) {
        setKeeperTypes(response.data);
        if (response.data.length > 0 && !selectedKeeperType) {
          setSelectedKeeperType(response.data[0]);
        }
      } else {
        setError(response.error || 'Failed to load keeper types');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keeper types');
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementTemplates = async () => {
    if (!selectedKeeperType) return;

    try {
      setTemplatesLoading(true);
      const response = await keeperApi.getEngagementTemplatesByKeeperType(selectedKeeperType.id);
      
      if (response.success && response.data) {
        setEngagementTemplates(response.data);
      }
    } catch (err) {
      console.error('Error loading engagement templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const getMemoryPatternIcon = (pattern?: string) => {
    switch (pattern) {
      case 'SOLE':
        return <SparklesIcon className="w-4 h-4" />;
      case 'CRMTimeline':
        return <TagIcon className="w-4 h-4" />;
      default:
        return <CpuChipIcon className="w-4 h-4" />;
    }
  };

  const getMemoryPatternColor = (pattern?: string) => {
    switch (pattern) {
      case 'SOLE':
        return 'bg-blue-100 text-blue-800';
      case 'CRMTimeline':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTestTemplate = (template: EngagementTemplate) => {
    // Map template slugs to routes - using 'demo' as the keeper ID for demo mode
    const templateRoutes: Record<string, string> = {
      'reflection_journal': '/keeper/demo/reflection-journal',
      'memorycard_generator': '/keeper/demo/memory-cards',
      'voice_panel': '/keeper/demo/voice-panel',
      'echo_writer': '/keeper/demo/echo-writer',
      'identity_logbook': '/keeper/demo/identity-logbook'
    };

    const route = templateRoutes[template.slug];
    
    if (route) {
      // Navigate to the template page in demo mode
      navigate(route);
    } else {
      // For other templates not yet implemented, show coming soon message
      alert(`Template "${template.label}" testing is coming soon!`);
    }
  };

  const renderMetadataTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">ID</label>
            <p className="text-foreground font-mono text-sm bg-muted/50 px-3 py-2 rounded mt-1">
              {selectedKeeperType?.id}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-foreground mt-1">{selectedKeeperType?.name}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Memory Pattern</label>
            <div className="mt-1">
              {selectedKeeperType?.memoryPattern ? (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getMemoryPatternColor(selectedKeeperType.memoryPattern)}`}>
                  {getMemoryPatternIcon(selectedKeeperType.memoryPattern)}
                  {selectedKeeperType.memoryPattern}
                </span>
              ) : (
                <span className="text-muted-foreground">No pattern specified</span>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">System Type</label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                selectedKeeperType?.system ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedKeeperType?.system ? 'System Reserved' : 'User Created'}
              </span>
            </div>
          </div>
          
          {selectedKeeperType?.createdAt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-foreground mt-1">
                {new Date(selectedKeeperType.createdAt).toLocaleString()}
              </p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Active Keepers</label>
            <p className="text-foreground mt-1">
              {selectedKeeperType?._count?.Keeper || 0} keepers using this type
            </p>
          </div>
        </div>
      </div>

      {/* Actions - Hidden for System Types */}
      {selectedKeeperType?.system ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <InformationCircleIcon className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800">System Reserved Type</h3>
          </div>
          <p className="text-amber-700">
            This is a system-reserved Keeper Type. Editing is disabled.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <PlusIcon className="w-4 h-4 mr-2" />
              Edit Type
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderEngagementTemplatesTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Engagement Templates</h3>
          <button className="inline-flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <PlusIcon className="w-4 h-4 mr-2" />
            Link Template
          </button>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
          </div>
        ) : engagementTemplates.length > 0 ? (
          <div className="space-y-3">
            {engagementTemplates.map((template) => (
              <div key={template.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{template.label}</h4>
                    <p className="text-sm text-muted-foreground">{template.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.type === 'memory' ? 'bg-blue-100 text-blue-800' :
                      template.type === 'identity' ? 'bg-green-100 text-green-800' :
                      template.type === 'timeline' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {template.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.system ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.system ? 'System' : 'Custom'}
                    </span>
                    <button
                      onClick={() => handleTestTemplate(template)}
                      className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                      title={`Test ${template.label} template`}
                    >
                      <PlayIcon className="w-3 h-3 mr-1" />
                      Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No engagement templates linked to this keeper type yet.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderMemoryPatternTab = () => {
    if (selectedKeeperType?.memoryPattern === 'SOLE') {
      // Create a mock keeper for the SOLE architecture tab
      const mockKeeper = {
        id: 'mock-keeper',
        title: 'Mock Keeper for SOLE Preview',
        purpose: 'Demonstration',
        memoryPattern: 'SOLE',
        sole: {
          type: "narrative-intro",
          content: "You are an agent in a Self-Organizing Learning Environment. Memory is not your storage — it is your mental model taking shape. Reflect often. Forget wisely. Remember what brings clarity. You are allowed to change how you remember, as long as you can explain why.",
          timestamp: new Date().toISOString(),
          author: "system",
          editable: false
        },
        ownerId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        KeeperType: selectedKeeperType
      };

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">SOLE Memory Pattern</h3>
            <p className="text-muted-foreground mb-6">
              This KeeperType uses the SOLE (Self-Organizing Learning Environment) memory pattern.
              Below is the default memory architecture that gets seeded when keepers of this type are created.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Read-Only Preview:</strong> This shows the default SOLE architecture. 
                Individual keepers can modify their memory structure through agent proposals.
              </p>
            </div>
            
            <SoleArchitectureTab
              keeper={mockKeeper as any}
              userId={user?.id || ''}
              onUpdate={() => {}} // No-op for read-only view
            />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Memory Pattern</h3>
          
          {selectedKeeperType?.memoryPattern ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getMemoryPatternIcon(selectedKeeperType.memoryPattern)}
                <h4 className="text-lg font-medium text-foreground">
                  {selectedKeeperType.memoryPattern}
                </h4>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground">
                  {selectedKeeperType.memoryPattern === 'CRMTimeline' && 
                    'Structured customer records with engagement tracking and timeline management.'
                  }
                  {selectedKeeperType.memoryPattern !== 'SOLE' && selectedKeeperType.memoryPattern !== 'CRMTimeline' &&
                    'Custom memory pattern implementation.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CpuChipIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No specific memory pattern defined for this keeper type.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Keeper Types</h1>
        <p className="text-muted-foreground">
          Manage keeper type definitions and memory patterns
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Keeper Types List */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Keeper Types</h2>
            
            <div className="space-y-2">
              {keeperTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedKeeperType(type)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedKeeperType?.id === type.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getMemoryPatternIcon(type.memoryPattern)}
                    <span className="font-medium truncate">{type.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {type.memoryPattern && (
                      <span className="text-xs bg-muted/80 px-2 py-1 rounded">
                        {type.memoryPattern}
                      </span>
                    )}
                    {type.system && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        System
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedKeeperType ? (
            <>
              {/* Tabs */}
              <div className="border-b border-border mb-6">
                <nav className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === 'metadata' && renderMetadataTab()}
                {activeTab === 'templates' && renderEngagementTemplatesTab()}
                {activeTab === 'memory' && renderMemoryPatternTab()}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <SparklesIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select a Keeper Type
              </h3>
              <p className="text-muted-foreground">
                Choose a keeper type from the sidebar to view its details and configuration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeeperTypesPage; 