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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Debug Tools</h1>
      <p className="text-sm text-muted-foreground">
        Press the button below to send a test payload to <code>/api/debug</code> and view the response.
      </p>
      <button
        type="button"
        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={handleSend}
        disabled={loading}
      >
        {loading ? 'Sending…' : 'Send debug ping'}
      </button>

      {response && (
        <pre className="p-4 bg-gray-100 rounded-md overflow-auto text-sm">
          {response}
        </pre>
      )}
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
};

export default DebugPage; 