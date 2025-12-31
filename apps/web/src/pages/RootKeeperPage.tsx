import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const RootKeeperPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <motion.div
      className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Welcome, {user?.name || 'Keeper'}.
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          This is your quiet space. What will you keep today?
        </p>
      </header>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex-shrink-0"></div>
            <div>
              <h2 className="text-lg font-medium text-card-foreground">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Proclamation Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium">Proclamation</h2>
          <p className="mt-1 text-sm text-muted-foreground">A space for what is true today.</p>
          <div className="mt-4">
            <textarea
              rows={4}
              className="w-full rounded-md border border-input bg-background p-3 text-base shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="What is true today…"
            />
          </div>
        </section>

        {/* Configuration Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium">Configuration</h2>
          <ul className="mt-4 divide-y divide-border">
            <li className="py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">API Keys</span>
              <Link 
                to="/root/settings/api-keys"
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage
              </Link>
            </li>
            <li className="py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Theme Settings</span>
              <button className="text-sm font-medium text-primary hover:underline">Change</button>
            </li>
            <li className="py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Account Details</span>
              <button className="text-sm font-medium text-primary hover:underline">Manage</button>
            </li>
            <li className="py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Export Data</span>
              <button className="text-sm font-medium text-primary hover:underline">Export</button>
            </li>
          </ul>
        </section>

        {/* Logout Section */}
        <section>
          <button
            onClick={logout}
            className="w-full bg-secondary hover:bg-muted text-secondary-foreground text-sm px-4 py-2 rounded-md border border-border transition-colors"
          >
            Logout
          </button>
        </section>
      </div>
    </motion.div>
  );
};

export default RootKeeperPage; 