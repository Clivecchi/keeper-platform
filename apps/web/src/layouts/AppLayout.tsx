import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { motion } from 'framer-motion';
import { Navbar } from '../components/layout/Navbar';

// Global Debug Button Component
const GlobalDebugButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      console.log('🔍 Fetching debug data from:', apiUrl);
      
      const response = await fetch(`${apiUrl}/debug`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // --- Extra call: /api/domains/my ---------------------------------
      try {
        const token = localStorage.getItem('keeper_token');
        if (token) {
          const domainsRes = await fetch(`${apiUrl}/api/domains/my`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          const bodyText = await domainsRes.text();
          data.extra_my_domains = {
            status: domainsRes.status,
            body: bodyText,
          };
        } else {
          data.extra_my_domains = {
            status: 'no-token',
            body: 'No keeper_token in localStorage',
          };
        }
      } catch (myErr) {
        data.extra_my_domains = {
          status: 'error',
          body: String(myErr),
        };
      }

      setDebugData(data);
      setIsOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('🚨 Debug fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setDebugData(null);
    setError(null);
  };

  return (
    <>
      {/* Debug Button - Fixed Position */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={fetchDebugData}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-colors duration-200 disabled:opacity-50"
          title="Global Debug - All System Information"
        >
          {loading ? '⏳' : '🔍'} DEBUG
        </button>
      </div>

      {/* Debug Modal */}
      {(isOpen || error) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🔍 Global Debug - Complete System Information</h2>
              <button
                onClick={closeModal}
                className="text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {error ? (
                <div className="text-red-600 bg-red-50 p-4 rounded">
                  <h3 className="font-bold mb-2">❌ Error fetching debug data:</h3>
                  <p className="font-mono">{error}</p>
                  <div className="mt-4 p-3 bg-gray-100 rounded">
                    <p className="font-bold">Troubleshooting:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Check if Railway API is running</li>
                      <li>Verify VITE_API_URL is set correctly</li>
                      <li>Check browser console for CORS errors</li>
                      <li>Current API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</li>
                    </ul>
                  </div>
                </div>
              ) : debugData ? (
                <div className="space-y-4">
                  {/* Issues Section */}
                  {debugData.issues && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <h3 className="font-bold text-yellow-800 mb-2">⚠️ Potential Issues</h3>
                      <pre className="text-sm text-yellow-700 whitespace-pre-wrap">
                        {JSON.stringify(debugData.issues, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Environment Section */}
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <h3 className="font-bold text-green-800 mb-2">🌍 Environment</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-1">Railway Info:</h4>
                        <pre className="text-sm text-green-700 whitespace-pre-wrap">
                          {JSON.stringify(debugData.environment?.railway_specific, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Node Environment:</h4>
                        <pre className="text-sm text-green-700 whitespace-pre-wrap">
                          NODE_ENV: {debugData.environment?.node_env}
                          PORT: {debugData.environment?.port}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Request Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <h3 className="font-bold text-blue-800 mb-2">📨 Current Request</h3>
                    <pre className="text-sm text-blue-700 whitespace-pre-wrap">
                      {JSON.stringify(debugData.request, null, 2)}
                    </pre>
                  </div>

                  {/* CORS Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded p-4">
                    <h3 className="font-bold text-purple-800 mb-2">🌐 CORS & Networking</h3>
                    <pre className="text-sm text-purple-700 whitespace-pre-wrap">
                      {JSON.stringify(debugData.cors, null, 2)}
                    </pre>
                  </div>

                  {/* Server Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <h3 className="font-bold text-gray-800 mb-2">🖥️ Server Information</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(debugData.server, null, 2)}
                    </pre>
                  </div>

                  {/* /api/domains/my Response */}
                  {debugData.extra_my_domains && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <h3 className="font-bold text-red-800 mb-2">/api/domains/my response</h3>
                      <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(debugData.extra_my_domains, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Raw Data */}
                  <details className="bg-gray-50 border border-gray-200 rounded p-4">
                    <summary className="font-bold text-gray-800 cursor-pointer mb-2">
                      📋 Complete Raw Debug Data (Click to expand)
                    </summary>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No debug data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <Navbar />
        <motion.main
          className="flex-1 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Outlet />
            </div>
          </div>
        </motion.main>
      </div>
      {/* Global Debug Button - Always Available */}
      <GlobalDebugButton />
    </div>
  );
}; 