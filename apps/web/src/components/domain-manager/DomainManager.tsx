import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '../../lib/apiFetch';
import DomainDetailForm from './DomainDetailForm';
import DnsStatusBadge from './DnsStatusBadge';
import DnsInfoPanel from './DnsInfoPanel';
import { Domain, DomainScope } from './types';
export type { DomainScope } from './types';
import { CheckCircleIcon, MagnifyingGlassIcon, PlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface Props {
  scope: DomainScope;
  allowCreate?: boolean;
}

interface DomainWithDns extends Domain {
  dnsStatus?: {
    attached: boolean;
    configured: boolean;
    verified: boolean;
    records: any[];
    nameServers: string[];
  };
}

const DomainManager: React.FC<Props> = ({ scope, allowCreate = true }) => {
  const [domains, setDomains] = useState<DomainWithDns[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainWithDns | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDomains();
  }, [scope]);

  const loadDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use unified endpoint to avoid 404s across environments
      const response = await apiFetch(`/api/domains`);
      const domainsWithDns = Array.isArray(response) ? response : [];
      setDomains(domainsWithDns);
      
      // Load DNS status for domains with custom domains
      domainsWithDns.forEach(domain => {
        if (domain.customDomain && !domain.customDomainVerified) {
          loadDnsStatus(domain.id);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load domains');
      console.error('Error loading domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDnsStatus = async (domainId: string) => {
    if (dnsLoading.has(domainId)) return;
    
    setDnsLoading(prev => new Set(prev).add(domainId));
    try {
      const status = await apiFetch(`/api/domains/custom/${domainId}/custom-domain/status`);
      setDomains(prev => prev.map(domain => 
        domain.id === domainId 
          ? { ...domain, dnsStatus: status }
          : domain
      ));
    } catch (err) {
      console.error('Error loading DNS status for domain:', domainId, err);
    } finally {
      setDnsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(domainId);
        return newSet;
      });
    }
  };

  const handleCreateDomain = async (formData: { name: string; slug: string; description: string }) => {
    try {
      const response = await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setDomains([...domains, response.domain]);
      setShowCreate(false);
      setSelectedDomain(response.domain);
      setShowDetail(true);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create domain');
    }
  };

  const handleUpdateDomain = async (domainId: string, formData: { name: string; slug: string; description: string }) => {
    console.log('handleUpdateDomain called:', { domainId, formData });
    try {
      const response = await apiFetch(`/api/domains/${domainId}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      console.log('Domain update response:', response);
      setDomains(domains.map(d => d.id === domainId ? response.domain : d));
      setSelectedDomain(response.domain);
      setShowDetail(false);
    } catch (err: any) {
      console.error('Domain update error:', err);
      throw new Error(err.message || 'Failed to update domain');
    }
  };

  const filteredDomains = domains.filter(domain => 
    domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    domain.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (domain.description && domain.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domains..."
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>
        {allowCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Domain
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading domains...</div>
        ) : filteredDomains.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No domains match your search' : 'No domains found'}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDomains.map(domain => (
              <div
                key={domain.id}
                onClick={() => {
                  setSelectedDomain(domain);
                  setShowDetail(true);
                }}
                className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{domain.name}</h3>
                      {domain.customDomain && (
                        <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{domain.slug}</p>
                    {domain.customDomain && (
                      <p className="text-sm text-blue-600 mt-1">{domain.customDomain}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DnsStatusBadge
                      hasCustomDomain={!!domain.customDomain}
                      isVerified={!!domain.customDomainVerified}
                      isConfigured={!!domain.dnsStatus?.configured}
                      compact={true}
                    />
                    {domain.customDomainVerified && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircleIcon className="w-5 h-5 mr-1" />
                        Verified
                      </div>
                    )}
                  </div>
                </div>
                {domain.description && (
                  <p className="mt-2 text-sm text-gray-600">{domain.description}</p>
                )}
                
                {/* Show DNS information if available and not verified */}
                {domain.customDomain && !domain.customDomainVerified && domain.dnsStatus && (
                  <div className="mt-3">
                    <DnsInfoPanel
                      records={domain.dnsStatus.records || []}
                      nameServers={domain.dnsStatus.nameServers || []}
                      configured={!!domain.dnsStatus.configured}
                      verified={!!domain.customDomainVerified}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
              className="bg-white border rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
            >
              <DomainDetailForm
                domain={selectedDomain}
                onSave={(formData) => handleUpdateDomain(selectedDomain.id, formData)}
                onClose={() => {
                  setShowDetail(false);
                  setSelectedDomain(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}

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
              className="bg-white border rounded-lg shadow-xl max-w-2xl w-full mx-4"
            >
              <DomainDetailForm
                onSave={handleCreateDomain}
                onClose={() => setShowCreate(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DomainManager; 