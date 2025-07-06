import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import IdentityLogbook from '../../components/engagement/IdentityLogbook';

const IdentityLogbookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [keeper, setKeeper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo mode check
  const isDemo = id === 'demo';

  useEffect(() => {
    if (isDemo) {
      // Demo mode - skip keeper fetch
      setKeeper({
        id: 'demo',
        title: 'Demo Keeper',
        purpose: 'Demonstration of Identity Logbook functionality'
      });
      setLoading(false);
      return;
    }

    const fetchKeeper = async () => {
      try {
        const response = await fetch(`/api/keeper/keepers/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch keeper');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setKeeper(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch keeper');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchKeeper();
  }, [id, isDemo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={() => navigate('/keeper')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Return to Keepers
          </button>
        </div>
      </div>
    );
  }

  if (!keeper) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Keeper not found</p>
          <button 
            onClick={() => navigate('/keeper')}
            className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Return to Keepers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/keeper')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Keepers
          </button>
          {isDemo && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
              <InformationCircleIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">Demo Mode</span>
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {keeper.title} - Identity Logbook
        </h1>
        <p className="text-gray-600 mt-1">{keeper.purpose}</p>
      </motion.div>

      {/* Identity Logbook Component */}
      <IdentityLogbook
        keeperId={keeper.id}
        agentId={keeper.ownerId || 'demo-agent'}
        isDemo={isDemo}
      />
    </div>
  );
};

export default IdentityLogbookPage; 