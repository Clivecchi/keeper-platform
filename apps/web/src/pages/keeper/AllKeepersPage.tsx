import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { ViewMode } from '../../types/viewMode';
import { keeperApi } from '../../lib/keeperApi';
import { Keeper, KeeperType } from '../../types/keeper';
import {
  PlusIcon,
  BookOpenIcon,
  SparklesIcon,
  DocumentTextIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const AllKeepersPage: React.FC = () => {
  const { user } = useAuth();
  const { currentMode } = useViewMode();
  const navigate = useNavigate();
  
  const [keepers, setKeepers] = useState<Keeper[]>([]);
  const [keeperTypes, setKeeperTypes] = useState<KeeperType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedKeeper, setSelectedKeeper] = useState<Keeper | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
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

  const handleDeleteKeeper = async (keeper: Keeper) => {
    if (!user?.id) return;

    try {
      const response = await keeperApi.deleteKeeper(keeper.id, user.id);
      if (response.success) {
        setKeepers(prev => prev.filter(k => k.id !== keeper.id));
        setShowDeleteModal(false);
        setSelectedKeeper(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keeper');
    }
  };

  const filteredKeepers = keepers.filter(keeper => {
    const title = (keeper.title ?? '').toString().toLowerCase();
    const purpose = (keeper.purpose ?? '').toString().toLowerCase();
    const query = (searchTerm ?? '').toString().toLowerCase();
    const matchesSearch = title.includes(query) || purpose.includes(query);
    const matchesType = !selectedType || keeper.keeperType === selectedType;
    return matchesSearch && matchesType;
  });

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
      'journal': <DocumentTextIcon className="w-4 h-4" />,
      'tracker': <BookOpenIcon className="w-4 h-4" />,
    };
    
    return icons[pattern as keyof typeof icons] || <BookOpenIcon className="w-4 h-4" />;
  };

  const navigateToKeeper = (keeper: Keeper) => {
    if (currentMode === ViewMode.Architect) {
      navigate(`/keeper/selected/metadata?id=${keeper.id}`);
    } else {
      navigate(`/keeper/${keeper.id}/dashboard`);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Keepers</h1>
          <p className="text-muted-foreground mt-2">
            {currentMode === ViewMode.Architect 
              ? 'Design and manage your Keeper configurations' 
              : 'Manage your personal Keepers'
            }
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Link
            to="/keeper/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Keeper
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keepers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="appearance-none px-4 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          >
            <option value="">All Types</option>
            {keeperTypes.map(type => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
          <FunnelIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Keepers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredKeepers.map((keeper) => (
            <motion.div
              key={keeper.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
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
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getKeeperTypeColor(keeper.keeperType)}`}>
                    {keeper.keeperType}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpenIcon className="w-4 h-4" />
                  <span>{keeper._count?.Journey || 0} journeys</span>
                </div>
                <div className="flex items-center gap-1">
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>{keeper._count?.Path || 0} paths</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateToKeeper(keeper)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  {currentMode === ViewMode.Architect ? 'Configure' : 'View'}
                </button>
                {currentMode === ViewMode.Architect && (
                  <button
                    onClick={() => {
                      setSelectedKeeper(keeper);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredKeepers.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No keepers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedType 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first keeper to get started'
            }
          </p>
          <Link
            to="/keeper/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Keeper
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedKeeper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Delete Keeper</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-muted rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete "{selectedKeeper.title}"? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteKeeper(selectedKeeper)}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllKeepersPage;
