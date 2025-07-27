import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ROLE_OPTIONS } from '@keeper/shared';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { DomainScope } from './DomainManager';

interface Member {
  userId: string;
  name: string;
  role: string;
  expiresAt?: string;
}

interface Props {
  domainId: string;
  scope: DomainScope;
}

const MembersPanel: React.FC<Props> = ({ domainId, scope }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(null);
  const [role, setRole] = useState('user');

  const base = scope === 'user' ? '/api/domains' : '/api/admin/domains';

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${base}/${domainId}/members`);
      setMembers(data.members);
    } catch (e) {
      console.error('load members error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [domainId]);

  // search users
  useEffect(() => {
    if (!showAdd) return;
    const t = setTimeout(async () => {
      try {
        if (!search.trim()) return;
        const data = await apiFetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`);
        setResults(data.users);
      } catch (e) { console.error(e); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, showAdd]);

  const addMember = async () => {
    if (!selectedUser) return;
    try {
      await apiFetch(`${base}/${domainId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUser.id, role }),
      });
      setShowAdd(false);
      setSearch('');
      setSelectedUser(null);
      load();
    } catch (e) { console.error(e); }
  };

  const remove = async (uid: string) => {
    if (!confirm('Remove member?')) return;
    try {
      await apiFetch(`${base}/${domainId}/members/${uid}`, { method: 'DELETE' });
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="border rounded p-4 space-y-3 bg-card">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Members</h3>
        <button onClick={()=>setShowAdd(true)} className="flex items-center text-xs gap-1"><PlusIcon className="w-4 h-4"/>Add</button>
      </div>
      {loading ? 'Loading…' : (
        <table className="w-full text-xs border">
          <thead><tr className="bg-muted text-left"><th className="p-1">Name</th><th className="p-1">Role</th><th></th></tr></thead>
          <tbody>
            {members.map(m=> (
              <tr key={m.userId} className="border-t"><td className="p-1">{m.name}</td><td className="p-1 capitalize">{m.role}</td><td className="p-1 text-right"><button onClick={()=>remove(m.userId)} className="text-red-600"><XMarkIcon className="w-4 h-4"/></button></td></tr>
            ))}
          </tbody>
        </table>
      )}
      {showAdd && (
        <div className="border p-2 rounded space-y-2 bg-muted/10">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search user…" className="border p-1 w-full text-xs" />
          {results.length>0 && (
            <div className="max-h-24 overflow-y-auto border rounded bg-background">
              {results.map(r=> (
                <div key={r.id} onClick={()=>{setSelectedUser(r); setResults([]); setSearch(r.label);}} className="px-1 py-0.5 text-xs hover:bg-muted cursor-pointer">{r.label}</div>
              ))}
            </div>
          )}
          <select value={role} onChange={(e)=>setRole(e.target.value)} className="border p-1 text-xs w-full">
            {ROLE_OPTIONS.map((o: { value: string; label: string }) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex gap-2 text-xs"><button onClick={addMember} className="px-2 py-0.5 bg-primary text-white rounded">Add</button><button onClick={()=>setShowAdd(false)} className="px-2 py-0.5 border rounded">Cancel</button></div>
        </div>
      )}
    </div>
  );
};

export default MembersPanel; 