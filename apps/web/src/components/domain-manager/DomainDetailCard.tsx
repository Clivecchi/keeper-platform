import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import MembersPanel from './MembersPanel';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { DomainScope } from './DomainManager';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  ownerId: string;
  status: string;
}

interface Props {
  domain: Domain;
  scope: DomainScope;
  viewerId: string;
  refresh: () => void;
}

const DomainDetailCard: React.FC<Props> = ({ domain, scope, viewerId, refresh }) => {
  const [form, setForm] = useState({ name: '', slug: '', description: '', customDomain: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const base = scope === 'user' ? '/api/domains' : '/api/admin/domains';

  useEffect(() => {
    setForm({
      name: domain.name || '',
      slug: domain.slug || '',
      description: domain.description || '',
      customDomain: domain.customDomain || '',
    });
  }, [domain]);

  const saveMeta = async () => {
    setSaving(true);
    try {
      await apiFetch(`${base}/${domain.id}`, { method: 'PUT', body: JSON.stringify({ ...form, customDomain: undefined }) });
      setMsg('Saved');
      refresh();
    } catch (e:any) { setMsg(e?.body||'Failed'); }
    finally { setSaving(false); setTimeout(()=>setMsg(null),3000); }
  };

  const isOwner = domain.ownerId === viewerId;

  const saveCustom = async () => {
    if (!isOwner) return;
    setSaving(true);
    try { await apiFetch(`/api/domains/${domain.id}/custom-domain`, { method:'POST', body: JSON.stringify({ customDomain: form.customDomain })}); refresh(); setMsg('Saved'); }
    catch(e:any){ setMsg(e?.body||'Failed'); }
    finally{ setSaving(false); }
  };

  const verify = async () => {
    if (!isOwner) return;
    setSaving(true);
    try { const resp = await apiFetch(`/api/domains/${domain.id}/custom-domain/verify`, { method:'POST' }); setMsg(resp.success?'Verified':'Failed'); refresh(); }
    catch(e:any){ setMsg(e?.body||'Failed'); }
    finally{ setSaving(false); }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="border rounded p-4 space-y-3 bg-card">
        <h3 className="font-medium">General</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="border p-1 rounded" placeholder="Name"/>
          <input value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} className="border p-1 rounded" placeholder="Slug"/>
          <textarea rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="border p-1 rounded col-span-2" placeholder="Description"/>
        </div>
        <button onClick={saveMeta} disabled={saving} className="px-2 py-0.5 bg-primary text-white rounded text-xs">Save</button>
        {msg && <p className="text-xs mt-1">{msg}</p>}
      </div>

      <div className="border rounded p-4 space-y-2 bg-card text-xs">
        <h3 className="font-medium">Custom Domain</h3>
        <input value={form.customDomain} onChange={(e)=>setForm({...form,customDomain:e.target.value})} className="border p-1 rounded w-full" placeholder="myapp.example.com"/>
        <div className="flex gap-2">
          <button onClick={saveCustom} disabled={!isOwner || saving} className="px-2 py-0.5 bg-primary text-white rounded">Save</button>
          <button onClick={verify} disabled={!isOwner || saving} className="px-2 py-0.5 bg-green-600 text-white rounded">Verify</button>
        </div>
        {domain.customDomainVerified && <p className="text-green-700 flex items-center gap-1"><CheckCircleIcon className="w-4 h-4"/>Verified</p>}
        {!isOwner && <p className="text-xs text-muted-foreground">Only domain owner can modify.</p>}
      </div>

      <MembersPanel domainId={domain.id} scope={scope} />

      {/* Danger Zone */}
      {scope === 'admin' && (
        <div className="border rounded p-4 space-y-2 bg-red-50 dark:bg-red-900/20 text-xs">
          <h3 className="font-medium text-red-700 dark:text-red-300">Danger Zone</h3>
          <p>Suspend disables access; Archive permanently removes the domain after a grace period.</p>
          <div className="flex gap-2">
            <button
              onClick={async()=>{ if(!confirm('Toggle suspension?')) return; try{ await apiFetch(`/api/admin/domains/${domain.id}/suspend`,{method:'PATCH'}); refresh(); }catch(e){ console.error(e);} }}
              className="px-2 py-0.5 bg-orange-600 text-white rounded"
            >
              {domain.status==='suspended'?'Activate':'Suspend'}
            </button>
            <button
              onClick={async()=>{ if(!confirm('Archive domain? This cannot be undone.')) return; try{ await apiFetch(`/api/admin/domains/${domain.id}`,{method:'DELETE'}); }catch(e){ console.error(e);} }}
              className="px-2 py-0.5 bg-red-700 text-white rounded"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainDetailCard; 