import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  XMarkIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CogIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import DomainDetailForm from './DomainDetailForm';
import type { DomainScope, DomainFormData } from './types';

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  ownerId: string;
  ownerName?: string;
  status: string;
  createdAt?: string;
  isPrimary?: boolean;
}

export interface DomainManagerProps {
  scope: DomainScope;
  onClose?: () => void;
  initialDomainId?: string;
  allowCreate?: boolean;
}

const DomainManager: React.FC<DomainManagerProps> = ({ 
  scope, 
  onClose, 
  initialDomainId, 
  allowCreate = false 
}) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = scope === 'user' ? '/api/domains' : '/api/admin/domains';

  const fetchDomains = async (searchQuery?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = scope === 'user' 
        ? `${baseUrl}/my` 
        : `${baseUrl}?search=${encodeURIComponent(searchQuery || '')}`;
      
      const data = await apiFetch(url);
      const list = scope === 'user' ? data : data.domains || [];
      setDomains(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load domains');
      console.error('Domain fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDomains();
  }, [scope]);

  // Debounced search for admin scope
  useEffect(() => {
    if (scope === 'user') return;
    
    const timer = setTimeout(() => {
      fetchDomains(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search, scope]);

  const handleDomainSelect = (domain: Domain) => {
    setSelectedDomain(domain);
    setShowDetail(true);
  };

  const handleCreateDomain = async (formData: DomainFormData) => {
    try {
      const response = await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (response.domain) {
        setDomains(prev => [response.domain, ...prev]);
        setShowCreate(false);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create domain');
    }
  };

  const handleUpdateDomain = async (domainId: string, formData: any) => {
    try {
      await apiFetch(`${baseUrl}/${domainId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      // Refresh the list
      await fetchDomains(search);
      setShowDetail(false);
      setSelectedDomain(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update domain');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
      return;
    }

    try {
      await apiFetch(`${baseUrl}/${domainId}`, { method: 'DELETE' });
      setDomains(prev => prev.filter(d => d.id !== domainId));
      setShowDetail(false);
      setSelectedDomain(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete domain');
    }
  };

  const filteredDomains = scope === 'user' 
    ? domains.filter(d => 
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.slug.toLowerCase().includes(search.toLowerCase())
      )
    : domains;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-3">
          <GlobeAltIcon className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {scope === 'user' ? 'My Domains' : 'Domain Management'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {scope === 'user' 
                ? 'Manage your personal domains' 
                : 'Manage all platform domains'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="p-6 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={scope === 'user' ? 'Search your domains...' : 'Search all domains...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {allowCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Domain
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
        >
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Domain List - Full Width */}
      <div className="flex-1">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading domains...
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <GlobeAltIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {search ? 'No domains found' : 'No domains available'}
            </h3>
            <p className="text-sm">
              {search 
                ? 'Try adjusting your search terms.' 
                : scope === 'user' 
                  ? 'Create your first domain to get started.'
                  : 'No domains have been created yet.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            <div className="grid gap-4 p-6">
              {filteredDomains.map((domain) => (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border rounded-lg p-6 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleDomainSelect(domain)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {domain.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {domain.isPrimary && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                              Primary
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            domain.status === 'active' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                          }`}>
                            {domain.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Domain Slug</p>
                          <p className="text-sm font-mono text-foreground">{domain.slug}</p>
                        </div>
                        
                        {scope === 'admin' && domain.ownerName && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Owner</p>
                            <p className="text-sm text-foreground">{domain.ownerName}</p>
                          </div>
                        )}
                        
                        {domain.createdAt && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                            <p className="text-sm text-foreground">
                              {new Date(domain.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {domain.description && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                          <p className="text-sm text-foreground line-clamp-2">{domain.description}</p>
                        </div>
                      )}
                      
                      {domain.customDomain && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Custom Domain</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono text-foreground">{domain.customDomain}</p>
                            {domain.customDomainVerified && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-muted rounded-md transition-colors">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-muted rounded-md transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Domain Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedDomain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
            >
              <DomainDetailForm
                domain={selectedDomain}
                scope={scope}
                onSave={(formData) => handleUpdateDomain(selectedDomain.id, formData)}
                onDelete={() => handleDeleteDomain(selectedDomain.id)}
                onClose={() => {
                  setShowDetail(false);
                  setSelectedDomain(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Domain Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border rounded-lg shadow-xl max-w-2xl w-full mx-4"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Create New Domain</h3>
                <DomainDetailForm
                  domain={null}
                  scope={scope}
                  onSave={handleCreateDomain}
                  onClose={() => setShowCreate(false)}
                  isCreate={true}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DomainManager; 