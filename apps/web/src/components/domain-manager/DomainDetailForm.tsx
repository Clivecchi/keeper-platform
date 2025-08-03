import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import DnsInfoPanel from './DnsInfoPanel';
import type { Domain, DomainDetailFormProps } from './types';

interface Member {
  userId: string;
  name: string;
  role: string;
  permissions: string[];
  expiresAt?: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
  { value: 'friend', label: 'Friend' },
  { value: 'connection', label: 'Connection' }
];

const DomainDetailForm: React.FC<DomainDetailFormProps> = ({ domain, onClose, onSave }) => {
  // Basic form state
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: ''
  });

  // Custom domain state
  const [customDomain, setCustomDomain] = useState('');
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [addingToVercel, setAddingToVercel] = useState(false);
  const [vercelConfigured, setVercelConfigured] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<any>(null);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>>([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [newMemberRole, setNewMemberRole] = useState('user');

  // UI state
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load domain data
  useEffect(() => {
    if (domain) {
      setForm({
        name: domain.name,
        slug: domain.slug,
        description: domain.description || ''
      });
      if (domain.customDomain) {
        setCustomDomain(domain.customDomain);
      }
      loadMembers();
      loadDnsStatus();
    }
  }, [domain]);

  // Load DNS status
  const loadDnsStatus = async () => {
    if (!domain || !domain.customDomain) return;
    try {
      const status = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain/status`);
      setDnsStatus(status);
      setVercelConfigured(status.attached);
      setDnsRecords(status.records || []);
      setNameServers(status.nameServers || []);
    } catch (err) {
      console.error('Error loading DNS status:', err);
    }
  };

  // Load domain members
  const loadMembers = async () => {
    if (!domain) return;
    try {
      const response = await apiFetch(`/api/domains/${domain.id}/members`);
      setMembers(response.members);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(form);
      setSuccess('Domain saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save domain');
    } finally {
      setSaving(false);
    }
  };

  // Handle custom domain addition
  const handleAddCustomDomain = async () => {
    if (!domain || !customDomain) return;
    setError(null);
    setSaving(true);

    try {
      const response = await apiFetch(`/api/domains/${domain.id}`, {
        method: 'PUT',
        body: JSON.stringify({ customDomain })
      });
      setSuccess('Custom domain added successfully');
      setTimeout(() => loadDnsStatus(), 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to add custom domain');
    } finally {
      setSaving(false);
    }
  };

  // Handle adding domain to Vercel
  const handleAddToVercel = async () => {
    if (!domain || !domain.customDomain) return;
    setAddingToVercel(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain`, {
        method: 'POST',
        body: JSON.stringify({ customDomain: domain.customDomain })
      });
      
      if (response.success) {
        setSuccess('Domain added to Vercel successfully');
        await loadDnsStatus();
      } else {
        setError(response.error || 'Failed to add domain to Vercel');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add domain to Vercel');
    } finally {
      setAddingToVercel(false);
    }
  };

  // Handle domain verification
  const handleVerifyDomain = async () => {
    if (!domain || !domain.customDomain) return;
    setVerifying(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain/verify`, {
        method: 'POST'
      });
      
      if (response.success) {
        setSuccess('Domain verified successfully');
        await loadDnsStatus();
      } else {
        setError(response.error || 'Failed to verify domain');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify domain');
    } finally {
      setVerifying(false);
    }
  };

  // Handle user search
  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiFetch(`/api/domains/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response);
    } catch (err: any) {
      console.error('Failed to search users:', err);
    }
  };

  // Handle member addition
  const handleAddMember = async () => {
    if (!domain || !selectedUser) return;
    setError(null);

    try {
      await apiFetch(`/api/domains/${domain.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUser.id,
          role: newMemberRole
        })
      });
      setSelectedUser(null);
      setUserSearch('');
      setSearchResults([]);
      setNewMemberRole('user');
      await loadMembers();
      setSuccess('Member added successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  // Handle member role update
  const handleUpdateMemberRole = async (userId: string, role: string) => {
    if (!domain) return;
    setError(null);

    try {
      await apiFetch(`/api/domains/${domain.id}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      await loadMembers();
      setSuccess('Member role updated');
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  // Handle member removal
  const handleRemoveMember = async (userId: string) => {
    if (!domain) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    setError(null);

    try {
      await apiFetch(`/api/domains/${domain.id}/members/${userId}`, {
        method: 'DELETE'
      });
      await loadMembers();
      setSuccess('Member removed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="bg-white p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {domain ? 'Edit Domain' : 'Create New Domain'}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-red-700">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2 text-green-700">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Domain Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Domain Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Domain Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter domain name"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Domain Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="domain-slug"
                disabled={saving}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Describe your domain..."
                disabled={saving}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : domain ? 'Save Changes' : 'Create Domain'}
            </button>
          </div>
        </div>

        {/* Custom Domain Setup */}
        {domain && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Custom Domain Setup</h4>
            
            {!domain.customDomain ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Add a custom domain to your Keeper platform.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDomain(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="your-domain.com"
                    disabled={saving}
                  />
                  <button
                    onClick={handleAddCustomDomain}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={saving || !customDomain}
                  >
                    Add Domain
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{domain.customDomain}</span>
                  {domain.customDomainVerified && (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  )}
                </div>

                {/* Domain Setup Process */}
                <div className="space-y-3">
                  {/* Step 1: Add to Vercel */}
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center gap-3">
                      {vercelConfigured ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <h5 className="font-medium">Add to Vercel</h5>
                        <p className="text-sm text-gray-600">
                          {vercelConfigured ? 'Domain added to Vercel' : 'Add domain to Vercel project'}
                        </p>
                      </div>
                    </div>
                    {!vercelConfigured && (
                      <button
                        onClick={handleAddToVercel}
                        disabled={addingToVercel}
                        className="px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                      >
                        {addingToVercel ? 'Adding...' : 'Add to Vercel'}
                      </button>
                    )}
                  </div>

                  {/* Step 2: Configure DNS */}
                  {vercelConfigured && (
                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        {dnsStatus?.configured ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-yellow-600" />
                        )}
                        <div>
                          <h5 className="font-medium">Configure DNS</h5>
                          <p className="text-sm text-gray-600">
                            {dnsStatus?.configured ? 'DNS configured' : 'Configure DNS records at your registrar'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Verify Domain */}
                  {vercelConfigured && (
                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        {domain.customDomainVerified ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h5 className="font-medium">Verify Domain</h5>
                          <p className="text-sm text-gray-600">
                            {domain.customDomainVerified ? 'Domain verified' : 'Verify domain and get SSL certificate'}
                          </p>
                        </div>
                      </div>
                      {vercelConfigured && !domain.customDomainVerified && (
                        <button
                          onClick={handleVerifyDomain}
                          disabled={verifying}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {verifying ? 'Verifying...' : 'Verify Domain'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* DNS Information */}
                {(dnsRecords.length > 0 || nameServers.length > 0) && (
                  <div className="mt-4">
                    <DnsInfoPanel
                      records={dnsRecords}
                      nameServers={nameServers}
                      configured={dnsStatus?.configured || false}
                      verified={domain.customDomainVerified}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {domain && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Domain Members</h4>
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium mb-2">Add Member</h5>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUserSearch(e.target.value)}
                      placeholder="Search users by name or email"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch('');
                              setSearchResults([]);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                            <div className="text-xs text-gray-400">
                              Joined {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedUser && (
                    <div className="flex gap-2 items-center p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="font-medium">{selectedUser.name}</div>
                        <div className="text-sm text-gray-500">{selectedUser.email}</div>
                      </div>
                      <select
                        value={newMemberRole}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewMemberRole(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        {ROLES.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddMember}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Current Members</h5>
                <div className="space-y-2">
                  {members.map(member => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-white rounded border"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.userId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateMemberRole(member.userId, e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        >
                          {ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-2 text-gray-500 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainDetailForm; 