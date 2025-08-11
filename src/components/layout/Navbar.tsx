import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

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

  return (
    <header className="py-8">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <NavLink to={isAuthenticated ? '/root' : '/'} className="font-display text-3xl font-bold text-stone-800">
          Keeper
        </NavLink>
        <div className="flex items-center space-x-12">
                      {isAuthenticated ? (
              <>
                <NavItem to="/root">Root</NavItem>
                <NavItem to="/journeys">Journeys</NavItem>
                <NavItem to="/moments">Moments</NavItem>
                <NavItem to="/themes">Themes</NavItem>
              </>
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