import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { PlusIcon, CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import MembersPanel from './MembersPanel';

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
}

const DomainManager: React.FC<DomainManagerProps> = ({ scope, onClose }) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Load domains depending on scope
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (scope === 'user') {
          const data = await apiFetch('/api/domains/my');
          setDomains(data);
          if (data.length) setSelected(data[0]);
        } else {
          const data = await apiFetch('/api/admin/domains?limit=10');
          setDomains(data.domains || []);
        }
      } catch (e) {
        console.error('Load domains failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scope]);

  // Debounced search for admin
  useEffect(() => {
    if (scope !== 'admin') return;
    const t = setTimeout(async () => {
      try {
        if (!search.trim()) return;
        const data = await apiFetch(`/api/admin/domains?search=${encodeURIComponent(search.trim())}`);
        setDomains(data.domains || []);
      } catch (e) {
        console.error('Search domains failed', e);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, scope]);

  const renderSelector = () => {
    if (scope === 'user') {
      return (
        <select
          value={selected?.id || ''}
          onChange={(e) => {
            const d = domains.find((x) => x.id === e.target.value);
            if (d) setSelected(d);
          }}
          className="border px-2 py-1 rounded bg-background text-foreground"
        >
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      );
    }
    // admin search bar + list
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <div className="max-h-48 overflow-y-auto border rounded">
          {domains.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className={`px-2 py-1 cursor-pointer hover:bg-muted ${selected?.id === d.id ? 'bg-primary/20' : ''}`}
            >
              {d.name} <span className="text-xs text-muted-foreground">({d.slug})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const [form, setForm] = useState({ name: '', slug: '', description: '', customDomain: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refreshSelected = async (id: string) => {
    try {
      const path = scope === 'user' ? `/api/domains/${id}` : `/api/admin/domains/${id}`;
      const data = await apiFetch(path);
      setSelected(data.domain || data);
    } catch (e) { console.error('refresh failed', e); }
  };

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name || '',
      slug: selected.slug || '',
      description: selected.description || '',
      customDomain: selected.customDomain || '',
    });
  }, [selected]);

  const saveMeta = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const path = scope === 'user' ? `/api/domains/${selected.id}` : `/api/admin/domains/${selected.id}`;
      const resp = await apiFetch(path, { method: 'PUT', body: JSON.stringify({ ...form, customDomain: undefined }) });
      setMessage('Saved');
      setSelected(resp.domain || resp);
    } catch (e: any) {
      setMessage(e?.body || 'Failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return <div>Loading domains…</div>;
  if (!selected) return <div>No domains found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {renderSelector()}
        {onClose && <button onClick={onClose} className="px-2 py-1 border rounded">Close</button>}
      </div>

      {/* General Panel */}
      <div className="border rounded p-4 space-y-3 bg-card">
        <h3 className="font-medium">General</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <input placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="border p-2 rounded" />
          <input placeholder="Slug" value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} className="border p-2 rounded" />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="border p-2 rounded col-span-2" />
        </div>
        <button disabled={saving} onClick={saveMeta} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50">{saving?'Saving…':'Save'}</button>
        {message && <p className="text-xs mt-1">{message}</p>}
      </div>

      {/* Custom Domain Panel */}
      <div className="border rounded p-4 space-y-3 bg-card">
        <h3 className="font-medium">Custom Domain</h3>
        <div className="space-y-2 text-sm">
          <input value={form.customDomain} onChange={(e)=>setForm({...form,customDomain:e.target.value})} placeholder="myapp.example.com" className="border p-2 rounded w-full" />
          <div className="flex gap-2">
            <button onClick={async()=>{
              if(!selected)return;setSaving(true);try{const path=`/api/domains/${selected.id}/custom-domain`;const resp=await apiFetch(path,{method:'POST',body:JSON.stringify({customDomain:form.customDomain})});setMessage('Saved');refreshSelected(selected.id);}catch(e:any){setMessage(e?.body||'Failed');}finally{setSaving(false);}}} className="px-2 py-1 bg-primary text-white rounded text-xs">Save</button>
            <button onClick={async()=>{if(!selected)return;setSaving(true);try{const resp=await apiFetch(`/api/domains/${selected.id}/custom-domain/verify`,{method:'POST'});setMessage(resp.success?'Verified':'Failed');refreshSelected(selected.id);}catch(e:any){setMessage(e?.body||'Failed');}finally{setSaving(false);}}} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Verify</button>
          </div>
          {selected.customDomainVerified && <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircleIcon className="w-4 h-4"/>Verified</p>}
        </div>
      </div>

      {/* MembersPanel */}
      <MembersPanel domainId={selected.id} scope={scope} />

      {/* Danger Zone for admins */}
      {scope === 'admin' && (
        <div className="border rounded p-4 space-y-3 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-medium text-red-700 dark:text-red-300">Danger Zone</h3>
          <p className="text-xs text-red-700 dark:text-red-300">Suspend disables access; Archive permanently removes the domain after a grace period.</p>
          <div className="flex gap-2">
            <button
              onClick={async()=>{if(!selected)return; if(!confirm('Toggle suspension?'))return; setSaving(true); try{await apiFetch(`/api/admin/domains/${selected.id}/suspend`,{method:'PATCH'}); refreshSelected(selected.id);}catch(e:any){setMessage(e?.body||'Failed');}finally{setSaving(false);}}}
              className="px-3 py-1 bg-orange-600 text-white rounded text-xs"
            >
              {selected.status==='suspended'?'Activate':'Suspend'}
            </button>
            <button
              onClick={async()=>{if(!selected)return; if(!confirm('Archive domain? This cannot be undone.'))return; setSaving(true); try{await apiFetch(`/api/admin/domains/${selected.id}`,{method:'DELETE'}); setMessage('Archived');}catch(e:any){setMessage(e?.body||'Failed');}finally{setSaving(false);}}}
              className="px-3 py-1 bg-red-700 text-white rounded text-xs"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainManager; 