import React, { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';
import type { DomainScope } from './DomainManager';

export interface Domain {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: string;
}

interface Props {
  scope: DomainScope;
  onSelect: (d: Domain) => void;
  selectedId?: string;
  allowCreate: boolean;
}

const DomainListPane: React.FC<Props> = ({ scope, onSelect, selectedId, allowCreate }) => {
  const [search, setSearch] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const base = scope === 'user' ? '/api/domains' : '/api/admin/domains';

  const fetchList = async (q?: string) => {
    setLoading(true);
    try {
      const url = scope === 'user' ? `${base}/my` : `${base}?search=${encodeURIComponent(q || '')}`;
      const data = await apiFetch(url);
      const list = scope === 'user' ? data : data.domains || [];
      setDomains(list);
      if (list.length && !selectedId) onSelect(list[0]);
    } catch (e) {
      console.error('load domains error', e);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => { fetchList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */}, [scope]);

  // debounce search (admin scope only)
  useEffect(() => {
    if (scope === 'user') return;
    const t = setTimeout(() => fetchList(search.trim()), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const create = async () => {
    try {
      const resp = await apiFetch('/api/domains', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ name: '', slug: '', description: '' });
      fetchList();
      onSelect(resp.domain);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="w-full sm:w-56 flex-shrink-0 space-y-2">
      <div className="flex gap-2 items-center">
        {scope === 'admin' && <MagnifyingGlassIcon className="w-4 h-4" />}
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search domains…" className="border p-1 rounded w-full text-xs" />
        {allowCreate && <button onClick={()=>setShowCreate(true)} className="text-xs border p-1 rounded"><PlusIcon className="w-4 h-4"/></button>}
      </div>
      <div className="border rounded max-h-64 overflow-y-auto text-xs">
        {loading ? <div className="p-2">Loading…</div> : domains.map(d=> (
          <div key={d.id} onClick={()=>onSelect(d)} className={`px-2 py-1 cursor-pointer hover:bg-muted ${selectedId===d.id?'bg-primary/20':''}`}>{d.name} <span className="text-muted-foreground">({d.slug})</span></div>
        ))}
      </div>

      {showCreate && (
        <div className="border p-2 rounded bg-muted/20 text-xs space-y-1 mt-2">
          <input placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="border p-1 w-full" />
          <input placeholder="Slug (optional)" value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} className="border p-1 w-full" />
          <textarea rows={2} placeholder="Description (optional)" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="border p-1 w-full"/>
          <div className="flex gap-2"><button onClick={create} disabled={!form.name.trim()} className="px-2 py-0.5 bg-primary text-white rounded">Create</button><button onClick={()=>setShowCreate(false)} className="px-2 py-0.5 border rounded">Cancel</button></div>
        </div>
      )}
    </div>
  );
};

export default DomainListPane; 