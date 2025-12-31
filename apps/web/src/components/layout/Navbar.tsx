import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { logout } from '../../auth/logout';
import { UserIdentityDropdown } from './UserIdentityDropdown';

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


export const Navbar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [domains, setDomains] = useState<any[]>([]);
  const primaryDomain = domains.find((d: any) => d.isPrimary);
  const domainSlug = primaryDomain?.slug || 'default';

  useEffect(() => {
    if (isAuthenticated) {
      apiFetch('/api/domains/my')
        .then(response => {
          if (response && response.length > 0) {
            setDomains(response);
          }
        })
        .catch(error => {
          console.error('Error loading domains:', error);
        });
    }
  }, [isAuthenticated]);

  return (
    <header className="py-8">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <NavLink to={isAuthenticated ? '/root' : '/'} className="font-display text-3xl font-bold text-stone-800">
            Keeper
          </NavLink>
          {isAuthenticated && (
            <NavLink 
              to={`/d/${domainSlug}/board`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              View Domain Board
            </NavLink>
          )}
        </div>
        <div className="flex items-center space-x-12">
          {isAuthenticated ? (
            <UserIdentityDropdown />
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