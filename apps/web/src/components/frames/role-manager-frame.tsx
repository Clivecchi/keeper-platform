/**
 * Role Manager Frame
 * ==================
 * 
 * Config panel frame component for managing roles and permissions.
 * Provides role assignment interface with permissions matrix.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheckIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'people' | 'settings' | 'admin';
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface RoleAssignment {
  personId: string;
  personName: string;
  personEmail: string;
  currentRole: string;
  domains: string[];
  journeys: string[];
}

const RoleManagerFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Mock permissions data
  const [permissions] = useState<Permission[]>([
    { id: 'read_content', name: 'Read Content', description: 'View journeys, moments, and content', category: 'content' },
    { id: 'create_content', name: 'Create Content', description: 'Create new journeys and moments', category: 'content' },
    { id: 'edit_content', name: 'Edit Content', description: 'Modify existing content', category: 'content' },
    { id: 'delete_content', name: 'Delete Content', description: 'Remove content permanently', category: 'content' },
    { id: 'invite_people', name: 'Invite People', description: 'Send invitations to new users', category: 'people' },
    { id: 'manage_people', name: 'Manage People', description: 'Edit user profiles and assignments', category: 'people' },
    { id: 'assign_roles', name: 'Assign Roles', description: 'Change user roles and permissions', category: 'people' },
    { id: 'remove_people', name: 'Remove People', description: 'Remove users from platform', category: 'people' },
    { id: 'manage_domains', name: 'Manage Domains', description: 'Configure domain settings', category: 'settings' },
    { id: 'manage_integrations', name: 'Manage Integrations', description: 'Configure external integrations', category: 'settings' },
    { id: 'view_analytics', name: 'View Analytics', description: 'Access usage and performance data', category: 'settings' },
    { id: 'system_admin', name: 'System Admin', description: 'Full system administration access', category: 'admin' },
  ]);

  // Mock roles data
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'owner',
      name: 'Owner',
      description: 'Full access to all features and settings',
      color: 'purple',
      permissions: permissions.map(p => p.id),
      isSystem: true,
      userCount: 1
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Manage people, content, and most settings',
      color: 'blue',
      permissions: ['read_content', 'create_content', 'edit_content', 'delete_content', 'invite_people', 'manage_people', 'assign_roles', 'manage_domains', 'view_analytics'],
      isSystem: true,
      userCount: 3
    },
    {
      id: 'member',
      name: 'Member',
      description: 'Create and edit content, collaborate on journeys',
      color: 'green',
      permissions: ['read_content', 'create_content', 'edit_content', 'invite_people'],
      isSystem: true,
      userCount: 15
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to content',
      color: 'gray',
      permissions: ['read_content'],
      isSystem: true,
      userCount: 8
    }
  ]);

  // Mock role assignments
  const [assignments] = useState<RoleAssignment[]>([
    {
      personId: '1',
      personName: 'Alice Johnson',
      personEmail: 'alice@example.com',
      currentRole: 'owner',
      domains: ['Tech Domain', 'Marketing Domain'],
      journeys: ['React Development', 'Team Leadership']
    },
    {
      personId: '2',
      personName: 'Bob Smith',
      personEmail: 'bob@example.com',
      currentRole: 'admin',
      domains: ['Tech Domain'],
      journeys: ['Node.js Backend', 'DevOps Practices']
    },
    {
      personId: '3',
      personName: 'Carol Williams',
      personEmail: 'carol@example.com',
      currentRole: 'member',
      domains: ['Marketing Domain'],
      journeys: []
    }
  ]);

  const handleRoleAction = (action: string, data?: any) => {
    const interaction = {
      type: 'submit' as const,
      frameId: frameInstance.id,
      data: { action, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const getRoleColor = (color: string) => {
    switch (color) {
      case 'purple':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'gray':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    }
  };

  const getPermissionCategoryColor = (category: Permission['category']) => {
    switch (category) {
      case 'content':
        return 'text-blue-600 bg-blue-100';
      case 'people':
        return 'text-green-600 bg-green-100';
      case 'settings':
        return 'text-orange-600 bg-orange-100';
      case 'admin':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const tabs: FrameTab[] = [
    {
      id: 'roles',
      label: 'Roles',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Roles List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Available Roles</h4>
              <button
                onClick={() => handleRoleAction('role_create')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Role</span>
              </button>
            </div>

            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedRole === role.id ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role.color)}`}>
                          <ShieldCheckIcon className="w-3 h-3 mr-1" />
                          {role.name}
                        </span>
                        {role.isSystem && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            System Role
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                      <div className="text-xs text-gray-500">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {!role.isSystem && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoleAction('role_edit', { roleId: role.id });
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoleAction('role_delete', { roleId: role.id });
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Role Details */}
                  <AnimatePresence>
                    {selectedRole === role.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Permissions</h5>
                        <div className="space-y-3">
                          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
                            const rolePermissions = categoryPermissions.filter(p => role.permissions.includes(p.id));
                            if (rolePermissions.length === 0) return null;

                            return (
                              <div key={category}>
                                <h6 className={`text-xs font-medium mb-2 inline-flex items-center px-2 py-1 rounded-full ${getPermissionCategoryColor(category as Permission['category'])}`}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {rolePermissions.map((permission) => (
                                    <div key={permission.id} className="flex items-center space-x-2 text-sm">
                                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium text-gray-900">{permission.name}</div>
                                        <div className="text-xs text-gray-500">{permission.description}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: <UserIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Role Assignments */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Role Assignments</h4>
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const role = roles.find(r => r.id === assignment.currentRole);
                return (
                  <div key={assignment.personId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{assignment.personName}</div>
                        <div className="text-sm text-gray-500">{assignment.personEmail}</div>
                        <div className="text-xs text-gray-500">
                          {assignment.domains.length} domain{assignment.domains.length !== 1 ? 's' : ''} • 
                          {assignment.journeys.length} journey{assignment.journeys.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {role && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role.color)}`}>
                          {role.name}
                        </span>
                      )}
                      <button
                        onClick={() => handleRoleAction('assignment_edit', { personId: assignment.personId })}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Change Role
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <LockClosedIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Permissions Matrix */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Permissions Matrix</h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.color)}`}>
                          {role.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-25">
                        <td colSpan={roles.length + 1} className="px-6 py-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPermissionCategoryColor(category as Permission['category'])}`}>
                            {category.charAt(0).toUpperCase() + category.slice(1)} Permissions
                          </span>
                        </td>
                      </tr>
                      {categoryPermissions.map((permission) => (
                        <tr key={permission.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                              <div className="text-xs text-gray-500">{permission.description}</div>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                              {role.permissions.includes(permission.id) ? (
                                <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Role Manager</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage roles, permissions, and user assignments.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-gray-900">Role & Permission Management</h3>
          </div>
          <div className="text-sm text-gray-600">
            {roles.length} roles • {assignments.length} assignments
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs.find(tab => tab.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-gray-600">
            <InformationCircleIcon className="w-4 h-4" />
            <span>Changes to roles affect all assigned users immediately</span>
          </div>
          <button
            onClick={() => handleRoleAction('roles_audit')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleManagerFrame;
