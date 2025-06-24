import * as React from 'react';
import { apiFetch } from '../lib/api';

const DebugPage: React.FC = () => {
  const [response, setResponse] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse('');
    try {
      const data = await apiFetch('/api/debug', {
        method: 'POST',
        body: JSON.stringify({ message: 'Debug ping from web', timestamp: Date.now() }),
      });
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      if (err instanceof Response) {
        const text = await err.text();
        setError(`HTTP ${err.status}: ${text}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    setError(null);
    setResponse('');
    try {
      const data = await apiFetch('/api/test', { method: 'GET' });
      setResponse(`Test endpoint response: ${JSON.stringify(data, null, 2)}`);
    } catch (err: unknown) {
      if (err instanceof Response) {
        const text = await err.text();
        setError(`Test endpoint failed - HTTP ${err.status}: ${text}`);
      } else if (err instanceof Error) {
        setError(`Test endpoint failed - ${err.message}`);
      } else {
        setError('Test endpoint failed - Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Environment information
  const envInfo = {
    'Environment': import.meta.env.MODE,
    'Is Production': import.meta.env.PROD,
    'Is Development': import.meta.env.DEV,
    'API Base URL': import.meta.env.VITE_API_BASE_URL || '(empty - using relative paths)',
    'Current URL': window.location.href,
    'Current Origin': window.location.origin,
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Debug Tools</h1>
      
      {/* Environment Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Environment Information</h2>
        <div className="grid gap-2 text-sm">
          {Object.entries(envInfo).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-medium">{key}:</span>
              <span className="text-gray-600 font-mono">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* API Tests */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">API Connection Tests</h2>
        
        <div className="flex gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleTestLogin}
            disabled={loading}
          >
            {loading ? 'Testing…' : 'Test /api/test endpoint'}
          </button>
          
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Test /api/debug endpoint'}
          </button>
        </div>
      </div>

      {/* Results */}
      {response && (
        <div>
          <h3 className="text-md font-medium mb-2">Response:</h3>
          <pre className="p-4 bg-green-50 border border-green-200 rounded-md overflow-auto text-sm">
            {response}
          </pre>
        </div>
      )}
      {error && (
        <div>
          <h3 className="text-md font-medium mb-2">Error:</h3>
          <p className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DebugPage; 