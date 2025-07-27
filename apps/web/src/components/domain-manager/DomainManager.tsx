import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  XMarkIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import DomainDetailForm from './DomainDetailForm';
import type { DomainScope } from './types';

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
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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
      
      // Auto-select first domain if none selected
      if (list.length > 0 && !selectedDomain && !initialDomainId) {
        setSelectedDomain(list[0]);
      } else if (initialDomainId) {
        const initial = list.find(d => d.id === initialDomainId);
        if (initial) setSelectedDomain(initial);
      }
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

  const handleCreateDomain = async (formData: any) => {
    try {
      const response = await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (response.domain) {
        setDomains(prev => [response.domain, ...prev]);
        setSelectedDomain(response.domain);
        setShowDetail(true);
        setShowCreate(false);
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
      
      // Update selected domain if it's the one being edited
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(prev => prev ? { ...prev, ...formData } : null);
      }
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
      
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
        setShowDetail(false);
      }
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
      <div className="flex items-center justify-between p-4 border-b bg-card">
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
      <div className="p-4 border-b bg-muted/20">
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
          className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
        >
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Domain List */}
        <div className="w-80 border-r bg-muted/10">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Loading domains...
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <GlobeAltIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {search ? 'No domains found matching your search.' : 'No domains available.'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              {filteredDomains.map((domain) => (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedDomain?.id === domain.id ? 'bg-primary/10 border-primary/20' : ''
                  }`}
                  onClick={() => handleDomainSelect(domain)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {domain.name}
                        </h3>
                        {domain.isPrimary && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {domain.slug}
                      </p>
                      {domain.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {domain.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        domain.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                      }`}>
                        {domain.status}
                      </span>
                      {scope === 'admin' && domain.ownerName && (
                        <span className="text-xs text-muted-foreground">
                          {domain.ownerName}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Domain Detail */}
        <div className="flex-1">
          {selectedDomain && showDetail ? (
            <DomainDetailForm
              domain={selectedDomain}
              scope={scope}
              onSave={(formData) => handleUpdateDomain(selectedDomain.id, formData)}
              onDelete={() => handleDeleteDomain(selectedDomain.id)}
              onClose={() => setShowDetail(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <CogIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a domain to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Domain Modal */}
      <AnimatePresence>
        {showCreate && (
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
              className="bg-background border rounded-lg shadow-lg max-w-md w-full mx-4"
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