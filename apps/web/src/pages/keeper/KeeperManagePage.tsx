import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { keeperApi } from '../../lib/keeperApi';
import { Keeper, KeeperType, UpdateKeeperRequest } from '../../types/keeper';
import {
  BookOpenIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  TagIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

type TabType = 'registry' | 'keeper';

const KeeperManagePage: React.FC = () => {
  const { user } = useAuth();
  const { currentMode } = useViewMode();
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  
  // State for keepers and types
  const [keepers, setKeepers] = useState<Keeper[]>([]);
  const [keeperTypes, setKeeperTypes] = useState<KeeperType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selected keeper and form
  const [selectedKeeper, setSelectedKeeper] = useState<Keeper | null>(null);
  const [editedKeeper, setEditedKeeper] = useState<UpdateKeeperRequest>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for deletion
  const [deletingKeeper, setDeletingKeeper] = useState<Keeper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const [keepersResponse, typesResponse] = await Promise.all([
        keeperApi.getAllKeepers(user.id),
        keeperApi.getKeeperTypes()
      ]);

      if (keepersResponse.success && keepersResponse.data) {
        setKeepers(keepersResponse.data);
      } else {
        setError(keepersResponse.error || 'Failed to load keepers');
      }

      if (typesResponse.success && typesResponse.data) {
        setKeeperTypes(typesResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKeeper = (keeper: Keeper) => {
    setSelectedKeeper(keeper);
    setEditedKeeper({
      title: keeper.title,
      purpose: keeper.purpose,
      keeperTypeId: keeper.keeperTypeId || '',
      keeperType: keeper.keeperType || '',
      memoryPattern: keeper.memoryPattern || ''
    });
    setActiveTab('keeper');
  };

  const handleCreateNewKeeper = () => {
    setSelectedKeeper(null);
    setEditedKeeper({});
    setActiveTab('keeper');
  };

  const handleBackToRegistry = () => {
    setSelectedKeeper(null);
    setEditedKeeper({});
    setIsEditing(false);
    setActiveTab('registry');
  };

  const handleSaveKeeper = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      
      if (selectedKeeper) {
        // Update existing keeper
        const response = await keeperApi.updateKeeper(selectedKeeper.id, editedKeeper, user.id);
        if (response.success && response.data) {
          setKeepers(prev => prev.map(k => k.id === selectedKeeper.id ? response.data! : k));
          setSelectedKeeper(response.data);
          setIsEditing(false);
          setError(null);
        } else {
          setError(response.error || 'Failed to update keeper');
        }
      } else {
        // Create new keeper
        const createData = {
          ...editedKeeper,
          ownerId: user.id
        };
        const response = await keeperApi.createKeeper(createData as any);
        if (response.success && response.data) {
          setKeepers(prev => [...prev, response.data!]);
          setActiveTab('registry');
        } else {
          setError(response.error || 'Failed to create keeper');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save keeper');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKeeper = async (keeper: Keeper) => {
    setDeletingKeeper(keeper);
  };

  const confirmDelete = async () => {
    if (!deletingKeeper || !user?.id) return;
    
    setIsDeleting(true);
    try {
      const response = await keeperApi.deleteKeeper(deletingKeeper.id, user.id);
      if (response.success) {
        setKeepers(prev => prev.filter(k => k.id !== deletingKeeper.id));
        setDeletingKeeper(null);
        // If we're deleting the currently selected keeper, go back to registry
        if (selectedKeeper?.id === deletingKeeper.id) {
          handleBackToRegistry();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keeper');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeletingKeeper(null);
  };

  const getKeeperTypeColor = (type?: string) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    
    const colors = {
      'ai-keeper-sole': 'bg-blue-100 text-blue-800',
      'personal-journal': 'bg-green-100 text-green-800',
      'project-tracker': 'bg-purple-100 text-purple-800',
      'memory-palace': 'bg-yellow-100 text-yellow-800',
    };
    
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getMemoryPatternIcon = (pattern?: string) => {
    if (!pattern) return <BookOpenIcon className="w-4 h-4" />;
    
    const icons = {
      'sole': <SparklesIcon className="w-4 h-4" />,
      'journal': <DocumentDuplicateIcon className="w-4 h-4" />,
      'tracker': <BookOpenIcon className="w-4 h-4" />,
    };
    
    return icons[pattern as keyof typeof icons] || <BookOpenIcon className="w-4 h-4" />;
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
      {/* Registry Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Keeper Registry</h2>
          <p className="text-muted-foreground mt-1">Select a keeper to view and edit, or create a new one</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateNewKeeper}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create New Keeper
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading keepers...</span>
        </div>
      ) : (
        /* Keeper Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keepers.map((keeper) => (
            <motion.div
              key={keeper.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectKeeper(keeper)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{keeper.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {keeper.purpose}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getMemoryPatternIcon(keeper.memoryPattern)}
                </div>
              </div>

              {/* Keeper Type Badge */}
              {keeper.keeperType && (
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getKeeperTypeColor(keeper.keeperType)}`}>
                    {keeper.keeperType}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpenIcon className="w-4 h-4" />
                  <span>{keeper._count?.Journey || 0} journeys</span>
                </div>
                <div className="flex items-center gap-1">
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>{keeper._count?.Path || 0} paths</span>
                </div>
              </div>

              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleSelectKeeper(keeper)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
                >
                  <EyeIcon className="w-3 h-3" />
                  Configure
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteKeeper(keeper);
                  }}
                  disabled={isDeleting}
                  className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded transition-colors"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
          
          {keepers.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No keepers found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first keeper to get started with the platform.
              </p>
              <button
                onClick={handleCreateNewKeeper}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Create New Keeper
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderKeeperTab = () => (
    <div className="space-y-6">
      {/* Keeper Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedKeeper ? 'Keeper Configuration' : 'Create New Keeper'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {selectedKeeper 
              ? `Configure metadata, engagement templates, and memory tools for ${selectedKeeper.title}` 
              : 'Set up a new keeper with metadata and configuration settings'
            }
          </p>
        </div>
        <button
          onClick={handleBackToRegistry}
          className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          ← Back to Registry
        </button>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpenIcon className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Basic Information</h3>
            </div>
            {selectedKeeper && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title *
              </label>
              {isEditing || !selectedKeeper ? (
                <input
                  type="text"
                  value={editedKeeper.title || ''}
                  onChange={(e) => setEditedKeeper(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter keeper title"
                />
              ) : (
                <p className="text-foreground font-medium">{selectedKeeper.title}</p>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Purpose *
              </label>
              {isEditing || !selectedKeeper ? (
                <textarea
                  value={editedKeeper.purpose || ''}
                  onChange={(e) => setEditedKeeper(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Describe the keeper's purpose"
                />
              ) : (
                <p className="text-muted-foreground">{selectedKeeper.purpose}</p>
              )}
            </div>

            {/* Keeper Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Keeper Type
              </label>
              {isEditing || !selectedKeeper ? (
                <select
                  value={editedKeeper.keeperType || ''}
                  onChange={(e) => {
                    const selectedType = keeperTypes.find(t => t.name === e.target.value);
                    setEditedKeeper(prev => ({ 
                      ...prev, 
                      keeperType: e.target.value,
                      keeperTypeId: selectedType?.id || ''
                    }));
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a type</option>
                  {keeperTypes.map(type => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedKeeper.keeperType || 'Not assigned'}</span>
                </div>
              )}
            </div>

            {/* Memory Pattern */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Memory Pattern
              </label>
              {isEditing || !selectedKeeper ? (
                <select
                  value={editedKeeper.memoryPattern || ''}
                  onChange={(e) => setEditedKeeper(prev => ({ ...prev, memoryPattern: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a pattern</option>
                  <option value="sole">SOLE (Structured Ontological Learning Experience)</option>
                  <option value="journal">Journal (Chronological)</option>
                  <option value="tracker">Tracker (Project-based)</option>
                  <option value="palace">Memory Palace (Spatial)</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <CogIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedKeeper.memoryPattern || 'Not specified'}</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            {(isEditing || !selectedKeeper) && (
              <div className="pt-4">
                <button
                  onClick={handleSaveKeeper}
                  disabled={saving || !editedKeeper.title || !editedKeeper.purpose}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (selectedKeeper ? 'Update Keeper' : 'Create Keeper')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Tools */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <CogIcon className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Configuration & Tools</h3>
          </div>

          {selectedKeeper ? (
            <div className="space-y-6">
              {/* Metadata */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Metadata</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="text-foreground">{user?.name || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-foreground">
                      {new Date(selectedKeeper.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="text-foreground">
                      {new Date(selectedKeeper.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold text-primary">{selectedKeeper._count?.Journey || 0}</div>
                    <div className="text-xs text-muted-foreground">Journeys</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold text-primary">{selectedKeeper._count?.Path || 0}</div>
                    <div className="text-xs text-muted-foreground">Paths</div>
                  </div>
                </div>
              </div>

              {/* Available Tools */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Available Tools</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <DocumentDuplicateIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Metadata Management</span>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Engagement Templates</span>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {selectedKeeper.engagement_templates?.length || 0} templates
                    </span>
                  </div>

                  {selectedKeeper.memoryPattern && (
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Memory Pattern Tools</span>
                      </div>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {selectedKeeper.memoryPattern.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CogIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Configuration options will appear after creating the keeper.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Manage Keepers
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Create and configure keepers for the Keeper platform architecture.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        <div className="flex items-center gap-1 pb-3">
          {renderTabButton('registry', <BookOpenIcon className="w-4 h-4" />, 'Registry')}
          {renderTabButton('keeper', <CogIcon className="w-4 h-4" />, 'Keeper')}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'registry' && renderRegistryTab()}
        {activeTab === 'keeper' && renderKeeperTab()}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingKeeper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4 text-foreground">Delete Keeper</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{deletingKeeper.title}</strong>? 
              This action cannot be undone and will permanently remove the keeper and all its data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Keeper'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default KeeperManagePage;
