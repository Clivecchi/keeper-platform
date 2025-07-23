import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  platformRoles: string[];
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch('/api/admin/users');
      setUsers(response.users || []);
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || e.body || e.message || 'Failed to load users';
      setError(errorMessage);
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Platform User Management</h1>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Platform Users ({filteredUsers.length})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage platform users and their roles. This is separate from domain-level user management.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Platform Roles</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{user.name || 'Unnamed User'}</div>
                    <div className="text-xs text-gray-500">{user.id}</div>
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {user.platformRoles.length > 0 ? (
                        user.platformRoles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <button className="text-blue-600 hover:text-blue-800 text-xs">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Platform vs Domain User Management</h3>
        <p className="text-sm text-blue-700">
          <strong>Platform Users:</strong> Users who can access the platform. Managed here with platform-level roles.<br/>
          <strong>Domain Users:</strong> Users within specific domains. Managed in each domain's Root Dashboard.
        </p>
      </div>
    </div>
  );
};

export default UserManagementPage; 