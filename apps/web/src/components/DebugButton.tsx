import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getLastBoardDataError } from '../lib/debug';

interface DebugButtonProps {
  variant?: 'floating' | 'sidebar';
}

/**
 * Debug button for troubleshooting connection issues.
 * Can be used as a floating button or inline in the sidebar.
 */
export const DebugButton: React.FC<DebugButtonProps> = ({ variant = 'floating' }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [server, setServer] = useState<{ count: number; logs: any[] } | null>(null);
  const latest = useMemo(() => getLastBoardDataError(), []);
  const location = useLocation();
  const onDebugRoute = (location?.pathname || '').startsWith('/debug');

  const floatingStyles = {
    position: 'fixed' as const,
    bottom: '20px', 
    right: '20px',
    zIndex: 999999,
    background: import.meta.env.PROD ? 'red' : 'blue',
    color: 'white',
    padding: '15px',
    fontSize: '16px',
    border: '3px solid yellow',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
  };

  const sidebarStyles = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    background: 'transparent',
    color: 'var(--muted-foreground)',
    borderColor: 'var(--border)',
  };

  async function fetchLogs() {
    if (!latest?.reqId) return;
    setLoading(true);
    setServer(null);
    try {
      const res = await fetch(`/api/debug/req/${latest.reqId}`);
      if (!res.ok) throw new Error('not_ok');
      const data = await res.json();
      setServer({ count: data?.count ?? 0, logs: data?.logs ?? [] });
    } catch {
      setServer({ count: 0, logs: [] });
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    try { navigator.clipboard?.writeText(text); } catch {}
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={() => (onDebugRoute ? setOpen(true) : navigate('/debug'))}
          style={sidebarStyles}
          className="hover:bg-muted/50 hover:text-foreground"
        >
          🔧 Debug Console
        </button>
        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
            <div className="w-[560px] max-w-[90vw] rounded-2xl bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Debug Panel</h3>
                <button onClick={() => setOpen(false)} className="rounded-md border px-2 py-1 text-xs">Close</button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 font-medium">Latest BoardData Error</div>
                  {latest ? (
                    <div className="space-y-1">
                      <div><span className="font-mono">reqId</span>: {latest.reqId ?? '—'}{' '}
                        {latest.reqId && <button className="ml-2 underline" onClick={() => copy(latest.reqId!)}>Copy</button>}
                      </div>
                      <div><span className="font-mono">url</span>: {latest.url} <button className="ml-2 underline" onClick={() => copy(latest.url)}>Copy</button></div>
                      <div><span className="font-mono">status</span>: {latest.status ?? '—'}</div>
                      <div><span className="font-mono">boardId</span>: {latest.boardId ?? '—'}</div>
                      <div><span className="font-mono">at</span>: {latest.at}</div>
                      <div className="mt-2 flex gap-2">
                        {latest.boardId && (
                          <a className="underline" href={`/api/board-data/${latest.boardId}/raw`} target="_blank" rel="noreferrer">Open raw board-data</a>
                        )}
                        {latest.reqId && (
                          <button onClick={fetchLogs} className="rounded-md border px-2 py-1">
                            {loading ? 'Fetching…' : 'Fetch server logs by reqId'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>No recent BoardData error recorded in this session.</div>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-2 font-medium">Server logs (filtered)</div>
                  {!latest?.reqId ? (
                    <div>Provide a failing `reqId` by reproducing the error.</div>
                  ) : !server ? (
                    <div>Press “Fetch server logs by reqId”.</div>
                  ) : server.count === 0 ? (
                    <div>No server logs found for this reqId (endpoint missing or no logs recorded).</div>
                  ) : (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2">{JSON.stringify(server.logs, null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => (onDebugRoute ? setOpen(true) : navigate('/debug'))} style={floatingStyles}>🔧 DEBUG</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="w-[560px] max-w-[90vw] rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Debug Panel</h3>
              <button onClick={() => setOpen(false)} className="rounded-md border px-2 py-1 text-xs">Close</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border p-3">
                <div className="mb-2 font-medium">Latest BoardData Error</div>
                {latest ? (
                  <div className="space-y-1">
                    <div><span className="font-mono">reqId</span>: {latest.reqId ?? '—'}{' '}
                      {latest.reqId && <button className="ml-2 underline" onClick={() => copy(latest.reqId!)}>Copy</button>}
                    </div>
                    <div><span className="font-mono">url</span>: {latest.url} <button className="ml-2 underline" onClick={() => copy(latest.url)}>Copy</button></div>
                    <div><span className="font-mono">status</span>: {latest.status ?? '—'}</div>
                    <div><span className="font-mono">boardId</span>: {latest.boardId ?? '—'}</div>
                    <div><span className="font-mono">at</span>: {latest.at}</div>
                    <div className="mt-2 flex gap-2">
                      {latest.boardId && (
                        <a className="underline" href={`/api/board-data/${latest.boardId}/raw`} target="_blank" rel="noreferrer">Open raw board-data</a>
                      )}
                      {latest.reqId && (
                        <button onClick={fetchLogs} className="rounded-md border px-2 py-1">
                          {loading ? 'Fetching…' : 'Fetch server logs by reqId'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>No recent BoardData error recorded in this session.</div>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <div className="mb-2 font-medium">Server logs (filtered)</div>
                {!latest?.reqId ? (
                  <div>Provide a failing `reqId` by reproducing the error.</div>
                ) : !server ? (
                  <div>Press “Fetch server logs by reqId”.</div>
                ) : server.count === 0 ? (
                  <div>No server logs found for this reqId (endpoint missing or no logs recorded).</div>
                ) : (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2">{JSON.stringify(server.logs, null, 2)}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugButton;