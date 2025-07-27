import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import DomainDetailModal from '../../components/domain-manager/DomainDetailModal';
import { useAuth } from '../../context/AuthContext';

interface Member {
  userId: string;
  name: string;
  role: string;
  expiresAt?: string;
}

interface Domain {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName?: string;
  isPrimary?: boolean;
  status: string;
  createdAt: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
}

const DomainsPage: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Domain | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/admin/domains');
        setDomains(data.domains);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load domains');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  const reload = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/domains');
      setDomains(data.domains);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (domain: Domain) => {
    setSelected(domain);
    setMemberLoading(true);
    try {
      const data = await apiFetch(`/api/admin/domains/${domain.id}/members`);
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setMemberLoading(false);
    }
  };

  const suspendToggle = async () => {
    if (!selected) return;
    await apiFetch(`/api/admin/domains/${selected.id}/suspend`, { method: 'PATCH' });
    await reload();
    setSelected(null);
  };

  const deleteDomain = async () => {
    if (!selected) return;
    if (!confirm('Archive this domain?')) return;
    await apiFetch(`/api/admin/domains/${selected.id}`, { method: 'DELETE' });
    await reload();
    setSelected(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Domain Management</h1>
        <button onClick={() => setShowCreate(true)} className="px-3 py-1 bg-primary text-primary-foreground rounded">
          Create Domain
        </button>
      </div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-muted text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Slug</th>
            <th className="p-2">Owner</th>
            <th className="p-2">Status</th>
            <th className="p-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => (
            <tr key={d.id} className="border-t hover:bg-muted cursor-pointer" onClick={() => openDetail(d)}>
              <td className="p-2">{d.name}</td>
              <td className="p-2">{d.slug}</td>
              <td className="p-2 truncate max-w-[160px]" title={d.ownerId}>{d.ownerId}</td>
              <td className="p-2 capitalize">{d.status}</td>
              <td className="p-2">{new Date(d.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create Domain Modal */}
      {showCreate && (
        <CreateDomainModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await reload();
          }}
        />
      )}

      {/* Domain Detail Modal */}
      {selected && (
        <DomainDetailModal domain={selected as any} scope="admin" onClose={()=>setSelected(null)} refreshList={reload} />
      )}
    </div>
  );
};

// ---------- Create Domain Modal ----------
interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateDomainModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<{ [k: string]: string }>({ name: '', slug: '', ownerId: '' });
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await apiFetch('/api/admin/roles/users');
        const mapped = data.users.map((u: any) => ({ id: u.id, label: u.name || u.email || u.id }));
        setUsers(mapped);
      } catch (e) {
        console.error('Failed to load users');
      } finally {
        setUserLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/domains', { method: 'POST', body: JSON.stringify(form) });
      await onCreated();
    } catch (e) {
      console.error(e);
      alert('Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 border border-border rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Domain</h2>
        <div className="space-y-3">
          <input name="name" placeholder="Name" className="w-full border p-2" value={form.name} onChange={handle} />
          <input name="slug" placeholder="Slug (optional)" className="w-full border p-2" value={form.slug} onChange={handle} />
          <div>
            <label className="text-sm text-muted-foreground">Owner</label>
            {userLoading ? (
              <div className="text-xs">Loading users...</div>
            ) : (
              <select
                name="ownerId"
                className="w-full border p-2 mt-1"
                value={form.ownerId}
                onChange={handle}
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button disabled={saving} onClick={submit} className="px-3 py-1 bg-primary text-primary-foreground rounded">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Domain Detail Modal ----------
interface LegacyDetailModalProps {
  domain: Domain;
  members: Member[];
  loadingMembers: boolean;
  onClose: () => void;
  onSuspend: () => void;
  onDelete: () => void;
  onUpdated: (d: Domain) => void;
}

const DomainLegacyModal: React.FC<LegacyDetailModalProps> = ({ domain, members, loadingMembers, onClose, onSuspend, onDelete, onUpdated }) => {
  const [customDomain, setCustomDomain] = React.useState(domain.customDomain || '');
  const [processing, setProcessing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = React.useState<any[] | null>(null);

  const saveCustom = async () => {
    if (!customDomain.trim()) return;
    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const resp = await apiFetch(`/api/domains/${domain.id}/custom-domain`, {
        method: 'POST',
        body: JSON.stringify({ customDomain }),
      });
      if (resp.success) {
        setSuccessMsg('Custom domain saved. Configure DNS then verify.');
        setDnsRecords(resp.dnsRecords || null);
        onUpdated(resp.domain);
      } else {
        setErrorMsg(resp.error || 'Failed');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  const verifyCustom = async () => {
    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setDnsRecords(null);
    try {
      const resp = await apiFetch(`/api/domains/${domain.id}/custom-domain/verify`, { method: 'POST' });
      if (resp.success) {
        setSuccessMsg('Domain verified and SSL issued!');
        onUpdated(resp.domain);
      } else {
        setErrorMsg(resp.error || 'Verification failed');
        if (resp.records) setDnsRecords(resp.records);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Verification failed');
    } finally {
      setProcessing(false);
    }
  };

  const removeCustom = async () => {
    if (!confirm('Remove custom domain?')) return;
    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const resp = await apiFetch(`/api/domains/${domain.id}/custom-domain`, { method: 'DELETE' });
      if (resp.success) {
        setSuccessMsg('Custom domain removed');
        setCustomDomain('');
        onUpdated(resp.domain);
      } else {
        setErrorMsg(resp.error || 'Failed');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Domain Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">ID</div>
            <div className="break-all">{domain.id}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Owner</div>
            <div className="break-all">{domain.ownerId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Slug</div>
            <div>{domain.slug}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Status</div>
            <div className="capitalize">{domain.status}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Is Primary</div>
            <div>{domain.isPrimary ? `Yes - ${domain.ownerName || ''}` : 'No'}</div>
          </div>
        </div>

        {/* Custom Domain Management */}
        <h3 className="mt-6 font-medium">Custom Domain</h3>
        <div className="space-y-2 mt-2">
          <input
            type="text"
            className="w-full border p-2 text-sm"
            placeholder="myapp.example.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={saveCustom} disabled={processing || !customDomain.trim()} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50">
              Save
            </button>
            <button onClick={verifyCustom} disabled={processing || !domain.customDomain} className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50">
              Verify
            </button>
            <button onClick={removeCustom} disabled={processing || !domain.customDomain} className="px-3 py-1 bg-destructive text-white rounded text-xs disabled:opacity-50">
              Delete
            </button>
          </div>
          {domain.customDomainVerified ? (
            <p className="text-xs text-green-700">Verified ✓</p>
          ) : (
            domain.customDomain ? <p className="text-xs text-yellow-700">Not verified</p> : null
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 whitespace-pre-wrap">
            {errorMsg}
            {dnsRecords && (
              <pre className="mt-1 bg-white dark:bg-neutral-800 p-1 rounded text-[10px] max-h-40 overflow-y-auto">{JSON.stringify(dnsRecords, null, 2)}</pre>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
            {successMsg}
          </div>
        )}

        <h3 className="mt-6 font-medium">Members</h3>
        {loadingMembers ? (
          <div>Loading members...</div>
        ) : (
          <table className="w-full border text-xs mt-2">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-1">Name</th>
                <th className="p-1">Role</th>
                <th className="p-1">Expires</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} className="border-t">
                  <td className="p-1 break-all max-w-[160px]">{m.name}</td>
                  <td className="p-1">{m.role}</td>
                  <td className="p-1">{m.expiresAt ? new Date(m.expiresAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-between">
          <button onClick={onSuspend} className="px-3 py-1 rounded border">
            {domain.status === 'suspended' ? 'Activate' : 'Suspend'}
          </button>
          <div className="space-x-2">
            <button onClick={onDelete} className="px-3 py-1 rounded border text-red-600">Archive</button>
            <button onClick={onClose} className="px-3 py-1 rounded border">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainsPage; 