import React from 'react';
import DomainDetailCard from './DomainDetailCard';
import { useAuth } from '../../context/AuthContext';
import type { DomainScope } from './DomainManager';
import type { Domain as DomainType } from './DomainListPane';

interface Props {
  domain: DomainType;
  scope: DomainScope;
  onClose: () => void;
  refreshList: () => void;
}

const DomainDetailModal: React.FC<Props> = ({ domain, scope, onClose, refreshList }) => {
  const { user } = useAuth();
  const viewerId = user?.id || '';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 max-w-3xl w-full max-h-[90vh] overflow-y-auto border rounded-lg p-4 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-xs border rounded px-1">Close</button>
        <DomainDetailCard domain={domain} scope={scope} viewerId={viewerId} refresh={refreshList} />
      </div>
    </div>
  );
};

export default DomainDetailModal; 