import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { keeperApi } from '../../lib/keeperApi';
import { Keeper, KeeperType, UpdateKeeperRequest } from '../../types/keeper';
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  BookOpenIcon,
  CogIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const SelectedKeeperMetadataPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keeperId = searchParams.get('id');

  const [keeper, setKeeper] = useState<Keeper | null>(null);
  const [keeperTypes, setKeeperTypes] = useState<KeeperType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedKeeper, setEditedKeeper] = useState<UpdateKeeperRequest>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (keeperId && user?.id) {
      loadData();
    }
  }, [keeperId, user?.id]);

  const loadData = async () => {
    if (!keeperId || !user?.id) return;

    try {
      setLoading(true);
      const [keeperResponse, typesResponse] = await Promise.all([
        keeperApi.getKeeperById(keeperId, user.id),
        keeperApi.getKeeperTypes()
      ]);

      if (keeperResponse.success && keeperResponse.data) {
        setKeeper(keeperResponse.data);
        setEditedKeeper({
          title: keeperResponse.data.title,
          purpose: keeperResponse.data.purpose,
          keeperTypeId: keeperResponse.data.keeperTypeId || '',
          keeperType: keeperResponse.data.keeperType || '',
          memoryPattern: keeperResponse.data.memoryPattern || ''
        });
      } else {
        setError(keeperResponse.error || 'Failed to load keeper');
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

  const handleSave = async () => {
    if (!keeper || !user?.id) return;

    try {
      setSaving(true);
      const response = await keeperApi.updateKeeper(keeper.id, editedKeeper, user.id);
      
      if (response.success && response.data) {
        setKeeper(response.data);
        setIsEditing(false);
        setError(null);
      } else {
        setError(response.error || 'Failed to update keeper');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update keeper');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (keeper) {
      setEditedKeeper({
        title: keeper.title,
        purpose: keeper.purpose,
        keeperTypeId: keeper.keeperTypeId || '',
        keeperType: keeper.keeperType || '',
        memoryPattern: keeper.memoryPattern || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!keeper) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Keeper not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested keeper could not be found or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate('/keeper')}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to All Keepers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/keeper')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Keeper Metadata</h1>
            <p className="text-muted-foreground mt-1">
              Configure and manage keeper properties
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <BookOpenIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedKeeper.title || ''}
                  onChange={(e) => setEditedKeeper(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <p className="text-foreground text-lg font-medium">{keeper.title}</p>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Purpose
              </label>
              {isEditing ? (
                <textarea
                  value={editedKeeper.purpose || ''}
                  onChange={(e) => setEditedKeeper(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              ) : (
                <p className="text-muted-foreground">{keeper.purpose}</p>
              )}
            </div>

            {/* Keeper Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Keeper Type
              </label>
              {isEditing ? (
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
                  <span className="text-foreground">{keeper.keeperType || 'Not assigned'}</span>
                </div>
              )}
            </div>

            {/* Memory Pattern */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Memory Pattern
              </label>
              {isEditing ? (
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
                  <span className="text-foreground">{keeper.memoryPattern || 'Not specified'}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Metadata & Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <CogIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Metadata & Statistics</h2>
          </div>

          <div className="space-y-6">
            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Owner
              </label>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user?.name || user?.email}</span>
              </div>
            </div>

            {/* Created At */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Created
              </label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {new Date(keeper.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Last Updated */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Updated
              </label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {new Date(keeper.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Statistics */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{keeper._count?.Journey || 0}</div>
                  <div className="text-sm text-muted-foreground">Journeys</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{keeper._count?.Path || 0}</div>
                  <div className="text-sm text-muted-foreground">Paths</div>
                </div>
              </div>
            </div>

            {/* Show Memory Tools if memory pattern is set */}
            {keeper.memoryPattern && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Available Tools</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    Memory Pattern Tools
                  </span>
                  {keeper.engagement_templates && keeper.engagement_templates.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Engagement Templates
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/keeper/selected/engagement-templates?id=${keeper.id}`)}
            className="px-4 py-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            Engagement Templates →
          </button>
          {keeper.memoryPattern && (
            <button
              onClick={() => navigate(`/keeper/selected/memory-tools?id=${keeper.id}`)}
              className="px-4 py-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              Memory Pattern Tools →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedKeeperMetadataPage; 