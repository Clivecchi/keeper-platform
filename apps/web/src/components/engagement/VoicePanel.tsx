import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { SoleVoiceEntry, SoleVoiceEntryListResponse, CreateVoiceEntryRequest } from '../../types/keeper';

interface VoicePanelProps {
  keeperId: string;
  agentId: string;
  isDemo?: boolean;
}

const VoicePanel: React.FC<VoicePanelProps> = ({ keeperId, agentId, isDemo = false }) => {
  const [voiceEntries, setVoiceEntries] = useState<SoleVoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ label: '', belief: '' });

  // Demo data
  const demoVoiceEntries: SoleVoiceEntry[] = [
    {
      id: 'demo-voice-1',
      keeperId,
      agentId,
      label: 'Communication Philosophy',
      belief: 'I believe in clear, direct communication while remaining empathetic and respectful. I aim to understand before being understood.',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'demo-voice-2',
      keeperId,
      agentId,
      label: 'Problem-Solving Approach',
      belief: 'I approach problems methodically, breaking them down into manageable parts. I prefer to understand the root cause before proposing solutions.',
      createdAt: '2024-01-14T14:30:00Z',
      updatedAt: '2024-01-14T14:30:00Z'
    },
    {
      id: 'demo-voice-3',
      keeperId,
      agentId,
      label: 'Learning Mindset',
      belief: 'I embrace continuous learning and acknowledge when I don\'t know something. Every interaction is an opportunity to grow and improve.',
      createdAt: '2024-01-13T09:15:00Z',
      updatedAt: '2024-01-13T09:15:00Z'
    }
  ];

  const fetchVoiceEntries = async () => {
    if (isDemo) {
      setVoiceEntries(demoVoiceEntries);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/keeper/keepers/${keeperId}/voice-entries?userId=${agentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch voice entries');
      }

      const data: SoleVoiceEntryListResponse = await response.json();
      
      if (data.success && data.data) {
        setVoiceEntries(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch voice entries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createVoiceEntry = async (entryData: CreateVoiceEntryRequest) => {
    if (isDemo) {
      const newEntry: SoleVoiceEntry = {
        id: `demo-voice-${Date.now()}`,
        ...entryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setVoiceEntries([newEntry, ...voiceEntries]);
      return;
    }

    try {
      const response = await fetch(`/api/keeper/keepers/${keeperId}/voice-entries?userId=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        throw new Error('Failed to create voice entry');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setVoiceEntries([data.data, ...voiceEntries]);
      } else {
        throw new Error(data.error || 'Failed to create voice entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateVoiceEntry = async (id: string, updates: { label?: string; belief?: string }) => {
    if (isDemo) {
      setVoiceEntries(voiceEntries.map(entry => 
        entry.id === id 
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry
      ));
      return;
    }

    try {
      const response = await fetch(`/api/keeper/voice-entries/${id}?userId=${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update voice entry');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setVoiceEntries(voiceEntries.map(entry => 
          entry.id === id ? data.data : entry
        ));
      } else {
        throw new Error(data.error || 'Failed to update voice entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteVoiceEntry = async (id: string) => {
    if (isDemo) {
      setVoiceEntries(voiceEntries.filter(entry => entry.id !== id));
      return;
    }

    try {
      const response = await fetch(`/api/keeper/voice-entries/${id}?userId=${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete voice entry');
      }

      setVoiceEntries(voiceEntries.filter(entry => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchVoiceEntries();
  }, [keeperId, agentId, isDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim() || !formData.belief.trim()) {
      setError('Both label and belief are required');
      return;
    }

    if (editingId) {
      await updateVoiceEntry(editingId, formData);
      setEditingId(null);
    } else {
      await createVoiceEntry({
        keeperId,
        agentId,
        label: formData.label.trim(),
        belief: formData.belief.trim()
      });
    }

    setFormData({ label: '', belief: '' });
    setIsCreating(false);
  };

  const handleEdit = (entry: SoleVoiceEntry) => {
    setEditingId(entry.id);
    setFormData({ label: entry.label, belief: entry.belief });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ label: '', belief: '' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchVoiceEntries();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voice Panel</h2>
          <p className="text-gray-600">Define and revise your voice and beliefs</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-sm text-blue-700">
              Demo Mode
            </div>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Voice Entry
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Voice Entry' : 'Create New Voice Entry'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Communication Philosophy, Problem-Solving Approach"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belief
              </label>
              <textarea
                value={formData.belief}
                onChange={(e) => setFormData({ ...formData, belief: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your belief, approach, or philosophy..."
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Voice Entries */}
      <div className="space-y-4">
        {voiceEntries.length === 0 ? (
          <div className="text-center py-12">
            <SpeakerWaveIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No voice entries yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Start by defining your beliefs and approaches
            </p>
          </div>
        ) : (
          voiceEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {entry.label}
                  </h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {entry.belief}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created {formatDate(entry.createdAt)}</span>
                    {entry.updatedAt !== entry.createdAt && (
                      <span>Updated {formatDate(entry.updatedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  {deletingId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          deleteVoiceEntry(entry.id);
                          setDeletingId(null);
                        }}
                        className="p-2 text-red-600 hover:text-red-700 transition-colors"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Voice Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{voiceEntries.length}</div>
            <div className="text-xs text-gray-500">Total Entries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {voiceEntries.filter(entry => entry.updatedAt !== entry.createdAt).length}
            </div>
            <div className="text-xs text-gray-500">Updated</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoicePanel; 