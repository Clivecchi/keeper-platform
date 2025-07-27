import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  TrashIcon,
  XMarkIcon,
  GlobeAltIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { DomainDetailFormProps, DomainFormData } from './types';

const DomainDetailForm: React.FC<DomainDetailFormProps> = ({
  domain,
  scope,
  onSave,
  onDelete,
  onClose,
  isCreate = false
}) => {
  const { user } = useAuth();
  const [form, setForm] = useState<DomainFormData>({
    name: '',
    slug: '',
    description: '',
    customDomain: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customDomainSaving, setCustomDomainSaving] = useState(false);
  const [customDomainVerifying, setCustomDomainVerifying] = useState(false);

  const isOwner = domain?.ownerId === user?.id;
  const canEdit = scope === 'admin' || isOwner;

  useEffect(() => {
    if (domain && !isCreate) {
      setForm({
        name: domain.name || '',
        slug: domain.slug || '',
        description: domain.description || '',
        customDomain: domain.customDomain || ''
      });
    }
  }, [domain, isCreate]);

  const handleInputChange = (field: keyof DomainFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Domain name is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await onSave(form);
      setMessage({ type: 'success', text: isCreate ? 'Domain created successfully!' : 'Domain updated successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save domain' });
    } finally {
      setSaving(false);
    }
  };

  const handleCustomDomainSave = async () => {
    if (!domain?.id || !isOwner) return;

    setCustomDomainSaving(true);
    try {
      await apiFetch(`/api/domains/${domain.id}/custom-domain`, {
        method: 'POST',
        body: JSON.stringify({ customDomain: form.customDomain })
      });
      setMessage({ type: 'success', text: 'Custom domain updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update custom domain' });
    } finally {
      setCustomDomainSaving(false);
    }
  };

  const handleCustomDomainVerify = async () => {
    if (!domain?.id || !isOwner) return;

    setCustomDomainVerifying(true);
    try {
      const response = await apiFetch(`/api/domains/${domain.id}/custom-domain/verify`, {
        method: 'POST'
      });
      setMessage({ 
        type: response.success ? 'success' : 'error', 
        text: response.success ? 'Custom domain verified successfully!' : 'Custom domain verification failed'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to verify custom domain' });
    } finally {
      setCustomDomainVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
      return;
    }

    try {
      await onDelete();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete domain' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isCreate ? 'Create New Domain' : 'Domain Details'}
          </h3>
          {domain && (
            <p className="text-sm text-muted-foreground mt-1">
              {domain.slug}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mx-6 mt-4 p-3 rounded-md border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-4 h-4" />
            ) : (
              <ExclamationTriangleIcon className="w-4 h-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        </motion.div>
      )}

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <GlobeAltIcon className="w-4 h-4" />
            Basic Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Domain Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter domain name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Domain Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                placeholder="domain-slug"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={!canEdit}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Describe your domain..."
            />
          </div>
        </div>

        {/* Custom Domain */}
        {domain && isOwner && (
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4" />
              Custom Domain
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Domain
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.customDomain}
                  onChange={(e) => handleInputChange('customDomain', e.target.value)}
                  className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="myapp.example.com"
                />
                <button
                  onClick={handleCustomDomainSave}
                  disabled={customDomainSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {customDomainSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCustomDomainVerify}
                  disabled={customDomainVerifying || !form.customDomain}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {customDomainVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              {domain.customDomainVerified && (
                <div className="flex items-center gap-2 mt-2 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-sm">Domain verified</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Domain Information (Read-only) */}
        {domain && (
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Domain Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Owner
                </label>
                <p className="text-sm text-foreground">
                  {domain.ownerName || domain.ownerId}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Status
                </label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  domain.status === 'active' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                }`}>
                  {domain.status}
                </span>
              </div>
              
              {domain.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Created
                  </label>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(domain.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {domain.isPrimary && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Type
                  </label>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    Primary Domain
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {scope === 'admin' && domain && (
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Administrative Actions
            </h4>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                These actions are only available to platform administrators.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm('Toggle domain suspension?')) return;
                    try {
                      await apiFetch(`/api/admin/domains/${domain.id}/suspend`, { method: 'PATCH' });
                      setMessage({ type: 'success', text: 'Domain status updated' });
                    } catch (err: any) {
                      setMessage({ type: 'error', text: err.message || 'Failed to update status' });
                    }
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                >
                  {domain.status === 'suspended' ? 'Activate' : 'Suspend'}
                </button>
                
                <button
                  onClick={async () => {
                    if (!confirm('Archive this domain? This cannot be undone.')) return;
                    try {
                      await apiFetch(`/api/admin/domains/${domain.id}`, { method: 'DELETE' });
                      setMessage({ type: 'success', text: 'Domain archived' });
                    } catch (err: any) {
                      setMessage({ type: 'error', text: err.message || 'Failed to archive domain' });
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-6 border-t bg-muted/20">
        <div className="flex items-center gap-2">
          {onDelete && canEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Domain
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (isCreate ? 'Create Domain' : 'Save Changes')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DomainDetailForm; 