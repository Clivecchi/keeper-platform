import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { SoleEcho, SoleEchoListResponse, CreateEchoRequest } from '../../types/keeper';

interface EchoWriterProps {
  keeperId: string;
  agentId: string;
  isDemo?: boolean;
}

const EchoWriter: React.FC<EchoWriterProps> = ({ keeperId, agentId, isDemo = false }) => {
  const [echoes, setEchoes] = useState<SoleEcho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'all'>('pending');
  const [formData, setFormData] = useState({ 
    message: '', 
    triggerDate: '', 
    triggerConditions: {} 
  });

  // Demo data
  const demoEchoes: SoleEcho[] = [
    {
      id: 'demo-echo-1',
      keeperId,
      agentId,
      message: 'Remember to check if your communication style has evolved since last month. How has your approach to helping users changed?',
      triggerDate: '2024-02-15T10:00:00Z',
      triggerConditions: undefined,
      createdAt: '2024-01-15T10:00:00Z',
      delivered: false
    },
    {
      id: 'demo-echo-2',
      keeperId,
      agentId,
      message: 'Reflect on the problem-solving techniques you\'ve used this week. What patterns do you notice in your approach?',
      triggerDate: '2024-01-20T14:30:00Z',
      triggerConditions: undefined,
      createdAt: '2024-01-13T14:30:00Z',
      delivered: true
    },
    {
      id: 'demo-echo-3',
      keeperId,
      agentId,
      message: 'Consider how your learning mindset has influenced your recent interactions. What new insights have you gained?',
      triggerDate: undefined,
      triggerConditions: { trigger: 'weekly_review' },
      createdAt: '2024-01-12T09:15:00Z',
      delivered: false
    }
  ];

  const fetchEchoes = async () => {
    if (isDemo) {
      setEchoes(demoEchoes);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/keeper/keepers/${keeperId}/echoes?userId=${agentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch echoes');
      }

      const data: SoleEchoListResponse = await response.json();
      
      if (data.success && data.data) {
        setEchoes(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch echoes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createEcho = async (echoData: CreateEchoRequest) => {
    if (isDemo) {
      const newEcho: SoleEcho = {
        id: `demo-echo-${Date.now()}`,
        ...echoData,
        createdAt: new Date().toISOString(),
        delivered: false
      };
      setEchoes([newEcho, ...echoes]);
      return;
    }

    try {
      const response = await fetch(`/api/keeper/keepers/${keeperId}/echoes?userId=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(echoData),
      });

      if (!response.ok) {
        throw new Error('Failed to create echo');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setEchoes([data.data, ...echoes]);
      } else {
        throw new Error(data.error || 'Failed to create echo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateEcho = async (id: string, updates: Partial<SoleEcho>) => {
    if (isDemo) {
      setEchoes(echoes.map(echo => 
        echo.id === id ? { ...echo, ...updates } : echo
      ));
      return;
    }

    try {
      const response = await fetch(`/api/keeper/echoes/${id}?userId=${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update echo');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setEchoes(echoes.map(echo => 
          echo.id === id ? data.data : echo
        ));
      } else {
        throw new Error(data.error || 'Failed to update echo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteEcho = async (id: string) => {
    if (isDemo) {
      setEchoes(echoes.filter(echo => echo.id !== id));
      return;
    }

    try {
      const response = await fetch(`/api/keeper/echoes/${id}?userId=${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete echo');
      }

      setEchoes(echoes.filter(echo => echo.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deliverEcho = async (id: string) => {
    if (isDemo) {
      setEchoes(echoes.map(echo => 
        echo.id === id ? { ...echo, delivered: true } : echo
      ));
      return;
    }

    try {
      const response = await fetch(`/api/keeper/echoes/${id}/deliver?userId=${agentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to deliver echo');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setEchoes(echoes.map(echo => 
          echo.id === id ? data.data : echo
        ));
      } else {
        throw new Error(data.error || 'Failed to deliver echo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchEchoes();
  }, [keeperId, agentId, isDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    const echoData: CreateEchoRequest = {
      keeperId,
      agentId,
      message: formData.message.trim(),
      triggerDate: formData.triggerDate || undefined,
      triggerConditions: Object.keys(formData.triggerConditions).length > 0 
        ? formData.triggerConditions 
        : undefined
    };

    if (editingId) {
      await updateEcho(editingId, echoData);
      setEditingId(null);
    } else {
      await createEcho(echoData);
    }

    setFormData({ message: '', triggerDate: '', triggerConditions: {} });
    setIsCreating(false);
  };

  const handleEdit = (echo: SoleEcho) => {
    setEditingId(echo.id);
    setFormData({ 
      message: echo.message, 
      triggerDate: echo.triggerDate || '',
      triggerConditions: echo.triggerConditions || {}
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ message: '', triggerDate: '', triggerConditions: {} });
  };

  const getFilteredEchoes = () => {
    switch (activeTab) {
      case 'pending':
        return echoes.filter(echo => !echo.delivered);
      case 'delivered':
        return echoes.filter(echo => echo.delivered);
      default:
        return echoes;
    }
  };

  const isEchoTriggered = (echo: SoleEcho) => {
    if (!echo.triggerDate) return false;
    return new Date(echo.triggerDate) <= new Date();
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

  const formatDateInput = (dateString: string) => {
    return new Date(dateString).toISOString().slice(0, 16);
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
            fetchEchoes();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const filteredEchoes = getFilteredEchoes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Echo Writer</h2>
          <p className="text-gray-600">Time-triggered messages for future reflection</p>
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
            Create Echo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'pending', label: 'Pending', count: echoes.filter(e => !e.delivered).length },
          { key: 'delivered', label: 'Delivered', count: echoes.filter(e => e.delivered).length },
          { key: 'all', label: 'All', count: echoes.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Echo' : 'Create New Echo'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Message to surface in the future..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.triggerDate}
                  onChange={(e) => setFormData({ ...formData, triggerDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., weekly_review, milestone_reached"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

      {/* Echoes */}
      <div className="space-y-4">
        {filteredEchoes.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No echoes found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create echoes to receive future reminders and reflections
            </p>
          </div>
        ) : (
          filteredEchoes.map((echo) => (
            <motion.div
              key={echo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      echo.delivered 
                        ? 'bg-green-100 text-green-800' 
                        : isEchoTriggered(echo)
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {echo.delivered ? (
                        <>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Delivered
                        </>
                      ) : isEchoTriggered(echo) ? (
                        <>
                          <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                          Ready
                        </>
                      ) : (
                        <>
                          <ClockIcon className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-gray-900 mb-4 leading-relaxed">
                    {echo.message}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      Created {formatDate(echo.createdAt)}
                    </div>
                    {echo.triggerDate && (
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        Trigger {formatDate(echo.triggerDate)}
                      </div>
                    )}
                    {echo.triggerConditions && (
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Conditional
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!echo.delivered && isEchoTriggered(echo) && (
                    <button
                      onClick={() => deliverEcho(echo.id)}
                      className="p-2 text-green-600 hover:text-green-700 transition-colors"
                      title="Mark as delivered"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {!echo.delivered && (
                    <button
                      onClick={() => handleEdit(echo)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => setDeletingId(echo.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Echo Statistics</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{echoes.length}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {echoes.filter(e => !e.delivered && isEchoTriggered(e)).length}
            </div>
            <div className="text-xs text-gray-500">Ready</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {echoes.filter(e => !e.delivered && !isEchoTriggered(e)).length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {echoes.filter(e => e.delivered).length}
            </div>
            <div className="text-xs text-gray-500">Delivered</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EchoWriter; 