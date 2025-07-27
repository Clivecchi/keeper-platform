import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { 
  UserIcon,
  CogIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (id: string) => void;
}

const Tab: React.FC<TabProps> = ({ id, label, icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-primary text-primary-foreground shadow-sm' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`}
  >
    <span className="w-4 h-4">{icon}</span>
    <span>{label}</span>
  </button>
);

const RootDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, updateUser } = useAuth();
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Domain form state
  const [domainForm, setDomainForm] = useState({
    name: '',
    slug: '',
    description: '',
    customDomain: ''
  });
  // List of all domains for this user
  const [domains, setDomains] = useState<any[]>([]);
  // Add-domain form helpers
  const [showAddDomainForm, setShowAddDomainForm] = useState(false);
  const [newDomainForm, setNewDomainForm] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);
  const [currentDomain, setCurrentDomain] = useState<any>(null);

  // Load domain data when user becomes available or changes
  useEffect(() => {
    if (user?.id) {
      loadDomainData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadDomainData = async () => {
    if (!user?.id) return;
    
    try {
      // Load user's domains
      const response = await apiFetch('/api/domains/my');
      if (Array.isArray(response)) {
        setDomains(response);
      }
      if (Array.isArray(response) && response.length > 0) {
        // Prefer the API-provided isPrimary flag, then fallback to ownership
        const primaryDomain = response.find((d: any) => d.isPrimary) ||
                              response.find((d: any) => d.ownerId === user.id) ||
                              response[0];

        if (primaryDomain) {
          setCurrentDomain(primaryDomain);
          setDomainForm({
            name: primaryDomain.name || '',
            slug: primaryDomain.slug || '',
            description: primaryDomain.description || '',
            customDomain: primaryDomain.customDomain || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading domain data:', error);
    } finally {
      setDomainLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
    { id: 'domain', label: 'Domain Settings', icon: <CogIcon /> },
    { id: 'api-keys', label: 'Personal API Keys', icon: <KeyIcon /> },
  ];

  const handleProfileSave = async () => {
    if (!user?.id) return;
    
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const data = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name
        })
      });

      if (data.success) {
        // Update auth context with new user data
        updateUser(data.data);
        setProfileSuccess('Profile updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDomainSave = async () => {
    if (!user?.id || !currentDomain) return;
    
    setDomainSaving(true);
    setDomainError(null);
    setDomainSuccess(null);

    try {
      const response = await apiFetch(`/api/domains/${currentDomain.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          // name/slug/description only
          customDomain: null
        })
      });

      if (response.domain) {
        setDomainSuccess('Domain configuration saved successfully!');
        setCurrentDomain(response.domain);
        setDomains(prev => prev.map(d => d.id === response.domain.id ? response.domain : d));
        
        // Clear success message after 3 seconds
        setTimeout(() => setDomainSuccess(null), 3000);
      } else {
        setDomainError(response.error || 'Failed to save domain configuration');
      }
    } catch (error) {
      console.error('Domain save error:', error);
      setDomainError('Failed to save domain configuration. Please try again.');
    } finally {
      setDomainSaving(false);
    }
  };

  const handleCustomDomainSave = async () => {
    if (!currentDomain) return;
    setDomainSaving(true);
    setDomainError(null);
    try {
      const resp = await apiFetch(`/api/domains/${currentDomain.id}/custom-domain`, {
        method: 'POST',
        body: JSON.stringify({ customDomain: domainForm.customDomain })
      });
      if (resp.success) {
        setCurrentDomain(resp.domain);
        setDomainSuccess('Custom domain saved. Configure DNS then click Verify.');
      } else {
        setDomainError(resp.error || 'Failed');
      }
    } catch (e) {
      setDomainError('Failed');
    } finally {
      setDomainSaving(false);
    }
  };

  const handleCustomDomainVerify = async () => {
    if (!currentDomain) return;
    setDomainSaving(true);
    setDomainError(null);
    try {
      const resp = await apiFetch(`/api/domains/${currentDomain.id}/custom-domain/verify`, { method: 'POST' });
      if (resp.success) {
        setCurrentDomain(resp.domain);
        setDomainSuccess('Domain verified and SSL issued!');
      } else {
        setDomainError(resp.error || 'Verification failed');
      }
    } catch (e) {
      setDomainError('Verification failed');
    } finally {
      setDomainSaving(false);
    }
  };

  const handleCustomDomainDelete = async () => {
    if (!currentDomain) return;
    const confirm = window.confirm('Remove custom domain?');
    if (!confirm) return;
    setDomainSaving(true);
    setDomainError(null);
    try {
      const resp = await apiFetch(`/api/domains/${currentDomain.id}/custom-domain`, { method: 'DELETE' });
      if (resp.success) {
        setCurrentDomain(resp.domain);
        setDomainForm(prev => ({ ...prev, customDomain: '' }));
        setDomainSuccess('Custom domain removed');
      } else {
        setDomainError(resp.error || 'Failed');
      }
    } catch (e) {
      setDomainError('Failed');
    } finally {
      setDomainSaving(false);
    }
  };

  // Create a brand-new domain
  const handleAddDomain = async () => {
    if (!user?.id) return;
    if (!newDomainForm.name.trim()) return;
    setAddingDomain(true);
    setDomainError(null);

    try {
      const resp = await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify({
          name: newDomainForm.name,
          slug: newDomainForm.slug || undefined,
          description: newDomainForm.description || undefined,
        }),
      });

      if (resp.domain) {
        setDomains(prev => [...prev, resp.domain]);
        setCurrentDomain(resp.domain);
        setDomainForm({
          name: resp.domain.name || '',
          slug: resp.domain.slug || '',
          description: resp.domain.description || '',
          customDomain: resp.domain.customDomain || '',
        });
        setNewDomainForm({ name: '', slug: '', description: '' });
        setShowAddDomainForm(false);
        setDomainSuccess('New domain created!');
      } else {
        setDomainError(resp.error || 'Failed to create domain');
      }
    } catch (e) {
      console.error('Add domain error:', e);
      setDomainError('Failed to create domain. Please try again.');
    } finally {
      setAddingDomain(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex-shrink-0"></div>
                <div>
                  <h3 className="text-lg font-medium text-card-foreground">{user?.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Member since {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{profileError}</p>
                </div>
              )}
              
              {profileSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{profileSuccess}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    disabled
                  />
                </div>
              </div>
              <div className="mt-6">
                <button 
                  onClick={handleProfileSave}
                  disabled={profileSaving || !profileForm.name.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'domain':
        return (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-card-foreground mb-4">Domain Configuration</h3>

              {/* Domain selector & add button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-foreground">Select Domain:</label>
                  <select
                    value={currentDomain?.id || ''}
                    onChange={(e) => {
                      const selected = domains.find((d) => d.id === e.target.value);
                      if (selected) {
                        setCurrentDomain(selected);
                        setDomainForm({
                          name: selected.name || '',
                          slug: selected.slug || '',
                          description: selected.description || '',
                          customDomain: selected.customDomain || '',
                        });
                      }
                    }}
                    className="px-2 py-1 border border-input rounded-md bg-background text-foreground"
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowAddDomainForm((prev) => !prev)}
                  className="flex items-center px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> Add Domain
                </button>
              </div>

              {showAddDomainForm && (
                <div className="mb-6 border border-border p-4 rounded-md bg-muted/20 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={newDomainForm.name}
                      onChange={(e) => setNewDomainForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="My New Domain"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug (optional)</label>
                    <input
                      type="text"
                      value={newDomainForm.slug}
                      onChange={(e) => setNewDomainForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="my-new-domain"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                    <textarea
                      rows={2}
                      value={newDomainForm.description}
                      onChange={(e) => setNewDomainForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="Brief description"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddDomain}
                      disabled={addingDomain || !newDomainForm.name.trim()}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                    >
                      {addingDomain ? 'Creating...' : 'Create Domain'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddDomainForm(false);
                        setNewDomainForm({ name: '', slug: '', description: '' });
                      }}
                      className="px-3 py-1 bg-muted text-foreground rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {domainLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading domain configuration...</div>
                </div>
              ) : currentDomain ? (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-600">ℹ️</span>
                      <span className="font-medium text-blue-800">Current Domain</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      <strong>Name:</strong> {currentDomain.name}<br/>
                      <strong>Slug:</strong> {currentDomain.slug}<br/>
                      <strong>Status:</strong> {currentDomain.status}
                    </p>
                  </div>
                  
                  {domainError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{domainError}</p>
                    </div>
                  )}
                  
                  {domainSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{domainSuccess}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                      <input
                        type="text"
                        value={domainForm.name}
                        onChange={(e) => setDomainForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="e.g., My Keeper Instance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
                      <input
                        type="text"
                        value={domainForm.slug}
                        onChange={(e) => setDomainForm(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="e.g., my-keeper-instance"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL-friendly identifier for your domain
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                      <textarea
                        rows={2}
                        value={domainForm.description}
                        onChange={(e) => setDomainForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="A brief description of your Keeper instance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Custom Domain</label>
                      <input
                        type="text"
                        value={domainForm.customDomain}
                        onChange={(e) => setDomainForm(prev => ({ ...prev, customDomain: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        placeholder="myapp.yourdomain.com"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleCustomDomainSave} className="px-3 py-1 bg-primary text-white rounded">Save</button>
                        <button onClick={handleCustomDomainVerify} className="px-3 py-1 bg-green-600 text-white rounded">Verify</button>
                        <button onClick={handleCustomDomainDelete} className="px-3 py-1 bg-destructive text-white rounded">Delete</button>
                      </div>
                      {currentDomain?.customDomainVerified ? (
                        <p className="text-xs text-green-700 mt-1">Verified ✓</p>
                      ) : (
                        <p className="text-xs text-yellow-700 mt-1">Not verified</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6">
                    <button 
                      onClick={handleDomainSave}
                      disabled={domainSaving || !domainForm.name.trim() || !domainForm.slug.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {domainSaving ? 'Saving...' : 'Save Domain Configuration'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No domain found. Please contact support.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'api-keys':
        return (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-card-foreground">Your Personal API Keys</h3>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Add Your API Key
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Bring your own personal API keys to access AI models. When you don't provide your own keys, the platform will use shared fallback keys managed by administrators.
              </p>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600">ℹ️</span>
                  <span className="font-medium text-green-800">Personal vs Platform Keys</span>
                </div>
                <p className="text-sm text-green-700">
                  <strong>Your Personal Keys:</strong> Managed here, give you direct control over costs and usage<br/>
                  <strong>Platform Keys:</strong> Managed by administrators in System Administration → Platform API Keys
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div>
                    <p className="text-sm font-medium text-foreground">Your OpenAI API Key</p>
                    <p className="text-xs text-muted-foreground">Personal key for AI agent interactions</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Your key active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Your Anthropic API Key</p>
                    <p className="text-xs text-muted-foreground">Personal key for Claude model access</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Using platform fallback</span>
                </div>
              </div>
              <div className="mt-4">
                <button className="text-sm text-primary hover:underline">
                  Manage Your API Keys →
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Root Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your Keeper platform configuration and settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </motion.div>
  );
};

export default RootDashboardPage;
