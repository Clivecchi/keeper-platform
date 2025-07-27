import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DomainListPane, { Domain as DomainType } from './DomainListPane';
import DomainDetailCard from './DomainDetailCard';

export type DomainScope = 'user' | 'admin';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  status: string;
}

interface DomainManagerProps {
  scope: DomainScope;
  onClose?: () => void; // For modal use in admin
  initialDomainId?: string;
  allowCreate?: boolean;
}

const DomainManager: React.FC<DomainManagerProps> = ({ scope, onClose, initialDomainId, allowCreate = false }) => {
  const { user } = useAuth();
  const viewerId = user?.id || '';
  const [selected, setSelected] = useState<DomainType | null>(null);

  // placeholder refresh function passed to detail card (forces list pane reload via callback key)
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k=>k+1);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <DomainListPane key={refreshKey} scope={scope} allowCreate={allowCreate} selectedId={selected?.id} onSelect={(d)=>setSelected(d)} />

      {selected && (
        <DomainDetailCard domain={selected} scope={scope} viewerId={viewerId} refresh={triggerRefresh} />
      )}

      {onClose && (
        <button onClick={onClose} className="absolute top-2 right-2 text-xs border rounded px-1">Close</button>
      )}
    </div>
  );
};

export default DomainManager; 