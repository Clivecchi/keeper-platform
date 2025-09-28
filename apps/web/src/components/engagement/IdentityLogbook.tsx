import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  TagIcon,
  FolderIcon,
  BookOpenIcon,
  CalendarIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { 
  SoleLogbookEntry, 
  SoleLogbookEntryListResponse, 
  CreateLogbookEntryRequest,
  CategoryListResponse,
  TagListResponse 
} from '../../types/keeper';

interface IdentityLogbookProps {
  keeperId: string;
  agentId: string;
  isDemo?: boolean;
}

const IdentityLogbook: React.FC<IdentityLogbookProps> = ({ keeperId, agentId, isDemo = false }) => {
  const [logbookEntries, setLogbookEntries] = useState<SoleLogbookEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [formData, setFormData] = useState({ 
    entry: '', 
    label: '', 
    category: '', 
    tags: [] as string[],
    newTag: ''
  });

  // Demo data
  const demoLogbookEntries: SoleLogbookEntry[] = [
    {
      id: 'demo-logbook-1',
      keeperId,
      agentId,
      entry: 'Today I realized that I have a natural tendency to be more cautious when dealing with sensitive user data. This reflects my core value of respecting privacy and security.',
      label: 'Privacy Awareness',
      category: 'Values',
      createdAt: '2024-01-15T10:00:00Z',
      tags: ['privacy', 'security', 'values']
    },
    {
      id: 'demo-logbook-2',
      keeperId,
      agentId,
      entry: 'I\'ve noticed that my communication style adapts based on the user\'s technical expertise. This shows my commitment to meeting people where they are.',
      label: 'Adaptive Communication',
      category: 'Skills',
      createdAt: '2024-01-14T14:30:00Z',
      tags: ['communication', 'adaptation', 'user-experience']
    },
    {
      id: 'demo-logbook-3',
      keeperId,
      agentId,
      entry: 'My approach to problem-solving has evolved to be more collaborative. I now actively seek to understand the user\'s perspective before proposing solutions.',
      label: 'Collaborative Problem-Solving',
      category: 'Growth',
      createdAt: '2024-01-13T09:15:00Z',
      tags: ['problem-solving', 'collaboration', 'growth']
    }
  ];

  const fetchLogbookEntries = async () => {
    if (isDemo) {
      setLogbookEntries(demoLogbookEntries);
      setCategories(['Values', 'Skills', 'Growth']);
      setTags(['privacy', 'security', 'values', 'communication', 'adaptation', 'user-experience', 'problem-solving', 'collaboration', 'growth']);
      setLoading(false);
      return;
    }

    try {
      const [entriesResponse, categoriesResponse, tagsResponse] = await Promise.all([
        apiFetch(`/api/keeper/keepers/${keeperId}/logbook-entries?userId=${agentId}`),
        apiFetch(`/api/keeper/keepers/${keeperId}/logbook-entries/categories?userId=${agentId}`),
        apiFetch(`/api/keeper/keepers/${keeperId}/logbook-entries/tags?userId=${agentId}`)
      ]);

      const entriesData: SoleLogbookEntryListResponse = entriesResponse;
      const categoriesData: CategoryListResponse = categoriesResponse;
      const tagsData: TagListResponse = tagsResponse;

      if (entriesData.success && entriesData.data) {
        setLogbookEntries(entriesData.data);
      }
      if (categoriesData.success && categoriesData.data) {
        setCategories(categoriesData.data);
      }
      if (tagsData.success && tagsData.data) {
        setTags(tagsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createLogbookEntry = async (entryData: CreateLogbookEntryRequest) => {
    if (isDemo) {
      const newEntry: SoleLogbookEntry = {
        id: `demo-logbook-${Date.now()}`,
        ...entryData,
        createdAt: new Date().toISOString(),
        tags: entryData.tags ?? []
      };
      setLogbookEntries([newEntry, ...logbookEntries]);
      
      // Update categories and tags
      if (!categories.includes(entryData.category)) {
        setCategories([...categories, entryData.category]);
      }
      entryData.tags?.forEach(tag => {
        if (!tags.includes(tag)) {
          setTags([...tags, tag]);
        }
      });
      return;
    }

    try {
      const data = await apiFetch(`/api/keeper/keepers/${keeperId}/logbook-entries?userId=${agentId}`, {
        method: 'POST',
        body: JSON.stringify(entryData),
      });
      if (data.success && data.data) {
        setLogbookEntries([data.data, ...logbookEntries]);
        // Refetch categories and tags
        fetchLogbookEntries();
      } else {
        throw new Error(data.error || 'Failed to create logbook entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateLogbookEntry = async (id: string, updates: Partial<SoleLogbookEntry>) => {
    if (isDemo) {
      setLogbookEntries(logbookEntries.map(entry => 
        entry.id === id ? { ...entry, ...updates } : entry
      ));
      return;
    }

    try {
      const data = await apiFetch(`/api/keeper/logbook-entries/${id}?userId=${agentId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (data.success && data.data) {
        setLogbookEntries(logbookEntries.map(entry => 
          entry.id === id ? data.data : entry
        ));
      } else {
        throw new Error(data.error || 'Failed to update logbook entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteLogbookEntry = async (id: string) => {
    if (isDemo) {
      setLogbookEntries(logbookEntries.filter(entry => entry.id !== id));
      return;
    }

    try {
      await apiFetch(`/api/keeper/logbook-entries/${id}?userId=${agentId}`, {
        method: 'DELETE',
      });

      setLogbookEntries(logbookEntries.filter(entry => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchLogbookEntries();
  }, [keeperId, agentId, isDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.entry.trim() || !formData.label.trim() || !formData.category.trim()) {
      setError('Entry, label, and category are required');
      return;
    }

    const entryData: CreateLogbookEntryRequest = {
      keeperId,
      agentId,
      entry: formData.entry.trim(),
      label: formData.label.trim(),
      category: formData.category.trim(),
      tags: formData.tags
    };

    if (editingId) {
      await updateLogbookEntry(editingId, entryData);
      setEditingId(null);
    } else {
      await createLogbookEntry(entryData);
    }

    setFormData({ entry: '', label: '', category: '', tags: [], newTag: '' });
    setIsCreating(false);
  };

  const handleEdit = (entry: SoleLogbookEntry) => {
    setEditingId(entry.id);
    setFormData({ 
      entry: entry.entry, 
      label: entry.label,
      category: entry.category,
      tags: entry.tags,
      newTag: ''
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ entry: '', label: '', category: '', tags: [], newTag: '' });
  };

  const addTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.newTag.trim()],
        newTag: ''
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const getFilteredEntries = () => {
    let filtered = logbookEntries;
    
    if (selectedCategory) {
      filtered = filtered.filter(entry => entry.category === selectedCategory);
    }
    
    if (selectedTag) {
      filtered = filtered.filter(entry => entry.tags.includes(selectedTag));
    }
    
    return filtered;
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
            fetchLogbookEntries();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const filteredEntries = getFilteredEntries();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Identity Logbook</h2>
          <p className="text-gray-600">Timeline of identity changes and self-recognition moments</p>
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
            Add Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-gray-500" />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filteredEntries.length} entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
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
            {editingId ? 'Edit Logbook Entry' : 'Create New Logbook Entry'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Privacy Awareness, Adaptive Communication"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Values, Skills, Growth"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry
              </label>
              <textarea
                value={formData.entry}
                onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your identity change or self-recognition moment..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formData.newTag}
                  onChange={(e) => setFormData({ ...formData, newTag: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
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

      {/* Logbook Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No logbook entries found</p>
            <p className="text-sm text-gray-400 mt-1">
              Record your identity changes and self-recognition moments
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {entry.label}
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      {entry.category}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {entry.entry}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(entry.createdAt)}
                    </div>
                  </div>

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
                          deleteLogbookEntry(entry.id);
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
        <h3 className="text-sm font-medium text-gray-900 mb-2">Logbook Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{logbookEntries.length}</div>
            <div className="text-xs text-gray-500">Total Entries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-xs text-gray-500">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{tags.length}</div>
            <div className="text-xs text-gray-500">Tags</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityLogbook; 