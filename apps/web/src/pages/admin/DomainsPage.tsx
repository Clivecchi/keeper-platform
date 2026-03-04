import React from 'react';
import DomainManager from '../../components/domain-manager/DomainManager';

const DomainsPage: React.FC = () => {
  const [apiBase, setApiBase] = React.useState('');
  React.useEffect(() => {
    try {
      // reflect the base we resolved to
      const envBase = (import.meta as any)?.env?.VITE_API_URL;
      const injected = (globalThis as any).__API_URL;
      const base = (envBase && String(envBase).startsWith('http')) ? envBase : (injected || location.origin);
      setApiBase(base);
    } catch {}
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Domain Management</h1>
        <p className="text-muted-foreground">
          Manage all domains across the platform. View, edit, and administer domain settings.
        </p>
        <div className="text-xs text-muted-foreground mt-2">API base: {apiBase}</div>
      </div>
      
      <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
        <DomainManager scope="admin" allowCreate={true} />
      </div>
    </div>
  );
};

export default DomainsPage; 