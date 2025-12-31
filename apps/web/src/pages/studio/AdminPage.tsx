/**
 * Studio Admin Page
 * =================
 * 
 * Admin-level interface for platform management and administrative functions
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AdminPage: React.FC = () => {
  return (
    <motion.div
      className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Studio Admin
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Platform administration and system management
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/studio/kip"
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
            >
               Back to Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Sections */}
      <div className="space-y-8">
        
        {/* API Management Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
             API Key Management
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Manage platform-level API keys that serve as fallbacks when users don't provide their own keys.
            These keys ensure consistent service availability across the platform.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/studio/kip/api-keys"
              className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg transition-colors group"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3"></span>
                <div>
                  <h3 className="font-semibold group-hover:underline">Platform API Keys</h3>
                  <p className="text-sm opacity-75">Manage fallback keys for AI providers</p>
                  <p className="text-xs text-blue-600 mt-1">/studio/kip/api-keys</p>
                </div>
              </div>
            </Link>
            
            <div className="p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-3"></span>
                <div>
                  <h3 className="font-semibold">API Usage Analytics</h3>
                  <p className="text-sm opacity-75">Monitor API usage and costs</p>
                  <p className="text-xs text-gray-500 mt-1">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
             Quick Access
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Direct links to commonly used administrative functions and monitoring tools.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to="/studio/kip/agents"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Manage Agents
            </Link>
            <Link
              to="/studio/kip/logs"
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
            >
              View Logs
            </Link>
            <Link
              to="/studio/kip/api-keys"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Platform API Keys
            </Link>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default AdminPage;
