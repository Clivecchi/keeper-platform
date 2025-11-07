/**
 * Image Upload Diagnostic Component
 * 
 * This component helps diagnose why image uploads are failing.
 * It checks:
 * - API connectivity
 * - Authentication status
 * - Environment configuration
 * - Blob storage configuration
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export const ImageUploadDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Check API connectivity
    try {
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        diagnostics.push({
          name: 'API Connectivity',
          status: 'success',
          message: 'API server is reachable',
        });
      } else {
        diagnostics.push({
          name: 'API Connectivity',
          status: 'error',
          message: `API returned status ${healthResponse.status}`,
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'API Connectivity',
        status: 'error',
        message: error instanceof Error ? error.message : 'Cannot reach API',
      });
    }

    // Test 2: Check authentication
    try {
      const whoamiResponse = await apiFetch('/api/whoami');
      if (whoamiResponse && whoamiResponse.userId) {
        diagnostics.push({
          name: 'Authentication',
          status: 'success',
          message: `Authenticated as user ${whoamiResponse.userId}`,
          details: whoamiResponse,
        });
      } else {
        diagnostics.push({
          name: 'Authentication',
          status: 'error',
          message: 'Not authenticated',
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Authentication',
        status: 'error',
        message: error instanceof Error ? error.message : 'Auth check failed',
      });
    }

    // Test 3: Check environment configuration
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) {
      diagnostics.push({
        name: 'Environment Config',
        status: 'success',
        message: `API URL configured: ${apiUrl}`,
      });
    } else {
      diagnostics.push({
        name: 'Environment Config',
        status: 'warning',
        message: 'VITE_API_URL not configured, using default',
      });
    }

    // Test 4: Try to request upload signature
    try {
      const signResponse = await apiFetch('/api/uploads/sign', {
        method: 'POST',
        body: JSON.stringify({
          filename: 'test.jpg',
          contentType: 'image/jpeg',
          size: 1024,
        }),
      });

      if (signResponse.success) {
        diagnostics.push({
          name: 'Upload Sign Request',
          status: 'success',
          message: 'Successfully obtained upload signature',
          details: signResponse.data,
        });
      } else {
        diagnostics.push({
          name: 'Upload Sign Request',
          status: 'error',
          message: signResponse.error || 'Failed to get upload signature',
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Upload Sign Request',
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload sign failed',
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'pending':
        return '⏳';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'pending':
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Upload Diagnostics</h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Re-run Tests'}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="border-b border-gray-200 pb-3 last:border-0">
            <div className="flex items-start gap-2">
              <span className="text-xl">{getStatusIcon(result.status)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{result.name}</h4>
                  <span className={`text-sm ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Show details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && isRunning && (
        <div className="text-center py-4 text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
          <p>Running diagnostics...</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <h4 className="font-medium text-blue-900 mb-2">Common Issues:</h4>
        <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
          <li>
            <strong>BLOB_READ_WRITE_TOKEN not set:</strong> Set this environment variable on the API server
          </li>
          <li>
            <strong>Not authenticated:</strong> Make sure you're logged in before uploading
          </li>
          <li>
            <strong>CORS errors:</strong> Check CORS_ALLOWLIST includes your frontend URL
          </li>
          <li>
            <strong>Network errors:</strong> Verify the API server is running and accessible
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUploadDiagnostic;


