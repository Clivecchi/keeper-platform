import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  onClose?: () => void;
  onSave: (formData: { name: string; slug: string; description: string }) => Promise<void>;
}

const DomainDetailForm: React.FC<Props> = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(form);
      // Success - form will be closed by parent
    } catch (err: any) {
      setError(err.message || 'Failed to create domain');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create New Domain</h3>
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
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-red-700">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Domain Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="domain-slug"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            placeholder="Describe your domain..."
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={saving || !form.name.trim()}
        >
          {saving ? 'Creating...' : 'Create Domain'}
        </button>
      </div>
    </form>
  );
};

export default DomainDetailForm; 