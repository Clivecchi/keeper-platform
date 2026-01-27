/**
 * UserIdentityDropdown
 * ====================
 * 
 * Profile menu dropdown component showing user avatar, domains, and actions.
 * Reused from Navbar component for consistency across layouts.
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { logout } from '../../auth/logout';

interface DomainWithRole {
  id: string;
  name: string;
  slug: string;
  role: string;
  isPrimary?: boolean;
}

export const UserIdentityDropdown: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [domains, setDomains] = useState<DomainWithRole[]>([]);
  
  const primaryDomain = domains.find(d => d.isPrimary);
  const domainSlug = primaryDomain?.slug || 'default';

  useEffect(() => {
    if (user) {
      apiFetch('/api/domains/my')
        .then(response => {
          if (response && response.length > 0) {
            // Mark primary domain (owned by user and is first created)
            const withRoles = response.map((d: any) => ({
              id: d.id,
              name: d.name,
              slug: d.slug,
              role: d.ownerId === user.id ? 'Owner' : (d.permissions?.[0]?.role || 'Member'),
              // Trust backend flag if present, else infer
              isPrimary: typeof d.isPrimary === 'boolean' ? d.isPrimary : (d.ownerId === user.id && d.name.toLowerCase().includes(user.name?.toLowerCase() || ''))
            }));
            setDomains(withRoles);
          }
        })
        .catch(error => {
          console.error('Error loading domains:', error);
        });
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {user?.nickname?.[0] || user?.name?.[0] || 'U'}
          </span>
        </div>
        <span className="text-sm font-medium">.me</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
            {/* Primary Domain */}
            {primaryDomain && (
              <div className="px-4 py-2 hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-medium">Owner.{primaryDomain.slug}</span>
                  <span className="text-xs text-gray-500">(Primary)</span>
                </div>
              </div>
            )}
            {/* Other Domains */}
            {domains.filter(d => !d.isPrimary).map(domain => (
              <div key={domain.id} className="px-4 py-2 hover:bg-gray-50">
                <span className="text-sm">{domain.role}.{domain.slug}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 my-1"></div>
            {/* Quick Actions */}
            <NavLink 
              to={`/d/${domainSlug}/board?frame=commons`} 
              className="block px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              View Domain Board
            </NavLink>
            <NavLink 
              to="/settings" 
              className="block px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              Settings
            </NavLink>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              type="button"
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

