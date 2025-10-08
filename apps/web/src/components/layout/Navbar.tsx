import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { logout } from '../../auth/logout';

const NavItem: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `relative font-serif text-lg tracking-wider text-stone-600 hover:text-stone-900 transition-colors duration-300 ${
        isActive ? 'text-stone-900' : ''
      }`
    }
  >
    {({ isActive }) => (
      <>
        {children}
        {isActive && (
          <motion.div
            className="absolute -bottom-1 left-0 right-0 h-[1px] bg-stone-500"
            layoutId="underline"
            initial={false}
            animate={{ opacity: 1 }}
          />
        )}
      </>
    )}
  </NavLink>
);

interface DomainWithRole {
  id: string;
  name: string;
  slug: string;
  role: string;
  isPrimary?: boolean;
}

const UserIdentityDropdown: React.FC<{ user: any; domains: DomainWithRole[] }> = ({ user, domains }) => {
  const [isOpen, setIsOpen] = useState(false);
  const primaryDomain = domains.find(d => d.isPrimary);

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
          {/* Settings */}
          <NavLink to="/root" className="block px-4 py-2 text-sm hover:bg-gray-50">
            Root Dashboard
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [domains, setDomains] = useState<DomainWithRole[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
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
  }, [isAuthenticated, user]);

  return (
    <header className="py-8">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <NavLink to={isAuthenticated ? '/root' : '/'} className="font-display text-3xl font-bold text-stone-800">
          Keeper
        </NavLink>
        <div className="flex items-center space-x-12">
          {isAuthenticated ? (
            <UserIdentityDropdown user={user} domains={domains} />
          ) : (
            <>
              <NavItem to="/">Home</NavItem>
              <NavItem to="/register">Begin</NavItem>
              <NavItem to="/login">Login</NavItem>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}; 