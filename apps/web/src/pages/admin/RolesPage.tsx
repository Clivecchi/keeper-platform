import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
}

interface RoleDetails {
  name: string;
  description: string;
  permissions: {
    implemented: string[];
    needed: string[];
  };
  color: string;
}

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignment' | 'details' | 'permissions'>('assignment');

  // Role details and permissions tracking
  const roleDetails: Record<string, RoleDetails> = {
    'super-admin': {
      name: 'Super Admin',
      description: 'Full platform access with all administrative capabilities',
      permissions: {
        implemented: ['access_admin_pages', 'manage_platform_roles'],
        needed: ['manage_domains', 'manage_users', 'view_analytics', 'manage_api_keys', 'system_configuration']
      },
      color: 'bg-red-100 text-red-800'
    },
    'admin': {
      name: 'Admin',
      description: 'Platform administrator with domain management access',
      permissions: {
        implemented: [],
        needed: ['manage_domains', 'view_analytics', 'manage_users', 'content_moderation']
      },
      color: 'bg-orange-100 text-orange-800'
    },
    'support': {
      name: 'Support',
      description: 'Platform support staff with user assistance access',
      permissions: {
        implemented: [],
        needed: ['view_user_data', 'assist_users', 'view_logs', 'basic_analytics']
      },
      color: 'bg-blue-100 text-blue-800'
    },
    'moderator': {
      name: 'Moderator',
      description: 'Content moderator with content management access',
      permissions: {
        implemented: [],
        needed: ['moderate_content', 'review_reports', 'manage_flags', 'view_content_analytics']
      },
      color: 'bg-yellow-100 text-yellow-800'
    },
    'analyst': {
      name: 'Analyst',
      description: 'Data analyst with read-only access to analytics',
      permissions: {
        implemented: [],
        needed: ['view_analytics', 'export_data', 'view_reports', 'read_only_access']
      },
      color: 'bg-green-100 text-green-800'
    },
    'developer': {
      name: 'Developer',
      description: 'Developer with API and technical access',
      permissions: {
        implemented: [],
        needed: ['api_access', 'view_logs', 'debug_access', 'technical_tools']
      },
      color: 'bg-purple-100 text-purple-800'
    },
    'viewer': {
      name: 'Viewer',
      description: 'Read-only access to platform data',
      permissions: {
        implemented: [],
        needed: ['read_only_access', 'view_public_data', 'basic_reports']
      },
      color: 'bg-gray-100 text-gray-800'
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        apiFetch('/api/admin/roles'),
        apiFetch('/api/admin/roles/users'),
      ]);
      setRoles(rolesRes.roles);
      setUsers(usersRes.users);
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || e.body || e.message || 'Failed to load roles and users';
      setError(errorMessage);
      console.error('Error loading roles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (userId: string, roleName: string, hasRole: boolean) => {
    setActionError(null);
    console.log(`[RolesPage] Attempting to ${hasRole ? 'remove' : 'assign'} role '${roleName}' for user ${userId}`);
    
    try {
      if (hasRole) {
        console.log('[RolesPage] Removing role...');
        await apiFetch('/api/admin/roles/assign', {
          method: 'DELETE',
          body: JSON.stringify({ userId, roleName }),
        });
        console.log('[RolesPage] Role removed successfully');
      } else {
        console.log('[RolesPage] Assigning role...');
        await apiFetch('/api/admin/roles/assign', {
          method: 'POST',
          body: JSON.stringify({ userId, roleName }),
        });
        console.log('[RolesPage] Role assigned successfully');
      }
      await load();
    } catch (e: any) {
      console.error('[RolesPage] Error details:', e);
      console.error('[RolesPage] Error response:', e.response);
      console.error('[RolesPage] Error body:', e.body);
      console.error('[RolesPage] Error message:', e.message);
      
      const errorMessage = e.response?.data?.error || e.body || e.message || 'Failed to update role assignment';
      setActionError(errorMessage);
      console.error('Error updating role:', e);
    }
  };

  const getRoleDetails = (roleName: string) => {
    return roleDetails[roleName] || {
      name: roleName,
      description: 'No description available',
      permissions: { implemented: [], needed: [] },
      color: 'bg-gray-100 text-gray-800'
    };
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Platform Roles</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2 rounded ${activeTab === 'assignment' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Role Assignment
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded ${activeTab === 'details' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Role Details
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded ${activeTab === 'permissions' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Permissions
          </button>
        </div>
      </div>
      
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {actionError}
          <button 
            onClick={() => setActionError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Role Assignment Matrix</h2>
            <p className="text-sm text-gray-600 mt-1">
              Assign platform roles to users. Check the boxes to grant roles.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3 font-medium">User</th>
                  {roles.map((r) => (
                    <th key={r.id} className="p-3 font-medium text-center">
                      <div className="flex flex-col items-center">
                        <span className="capitalize">{r.name}</span>
                        <span className="text-xs text-gray-500">{getRoleDetails(r.name).name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{u.name || u.email}</div>
                      <div className="text-xs text-gray-500">{u.id}</div>
                    </td>
                    {roles.map((r) => {
                      const hasRole = u.roles.includes(r.name);
                      return (
                        <td key={r.id} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={hasRole}
                            onChange={() => toggleRole(u.id, r.name, hasRole)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const details = getRoleDetails(role.name);
            return (
              <div key={role.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">{details.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${details.color}`}>
                    {role.name}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{details.description}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Implemented Permissions:</span>
                    <div className="mt-1">
                      {details.permissions.implemented.length > 0 ? (
                        details.permissions.implemented.map((perm, idx) => (
                          <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">None implemented</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Needed Permissions:</span>
                    <div className="mt-1">
                      {details.permissions.needed.map((perm, idx) => (
                        <span key={idx} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Permission Implementation Status</h2>
          <div className="space-y-4">
            {Object.entries(roleDetails).map(([roleName, details]) => (
              <div key={roleName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{details.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${details.color}`}>
                    {roleName}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">✅ Implemented ({details.permissions.implemented.length})</h4>
                    <div className="space-y-1">
                      {details.permissions.implemented.map((perm, idx) => (
                        <div key={idx} className="text-sm bg-green-50 p-2 rounded">
                          {perm}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-700 mb-2">🚧 Needed ({details.permissions.needed.length})</h4>
                    <div className="space-y-1">
                      {details.permissions.needed.map((perm, idx) => (
                        <div key={idx} className="text-sm bg-yellow-50 p-2 rounded">
                          {perm}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage; 