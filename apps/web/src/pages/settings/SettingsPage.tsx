"use client"

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || ''
    });
  }, [user?.name, user?.email]);

  const handleProfileSave = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const data = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: profileForm.name })
      });

      if (data.success) {
        updateUser(data.data);
        setProfileSuccess('Profile updated successfully!');
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account profile and personal keys.</p>
      </div>

      <section className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-muted rounded-full flex-shrink-0" />
          <div>
            <h2 className="text-lg font-medium text-card-foreground">{user?.name || 'Account'}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {profileError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{profileError}</p>
          </div>
        )}

        {profileSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
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

        <div>
          <button
            onClick={handleProfileSave}
            disabled={profileSaving || !profileForm.name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-medium text-card-foreground">Personal API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal API keys for AI providers and keep full control of usage.
        </p>
        <Link
          to="/settings/api-keys"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Manage your API keys →
        </Link>
      </section>
    </div>
  );
};

export default SettingsPage;
