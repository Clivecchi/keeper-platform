/**
 * Engagement Templates Page
 * Browser for real engagement templates from the database
 * 
 * Replaces mock "Engagement Processes" with actual template system
 * Shows templates grouped by KeeperType
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';

interface EngagementTemplate {
  id: string;
  slug: string;
  label: string;
  type: string;
  targetType: string;
  icon?: string;
  config: {
    visibility: string;
    action?: {
      endpoint: string;
      method: string;
      successMessage: string;
    };
  };
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
  }>;
}

type GroupedTemplates = {
  [keeperType: string]: EngagementTemplate[];
};

const EngagementTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EngagementTemplate[]>([]);
  const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EngagementTemplate | null>(null);
  const [activeKeeperType, setActiveKeeperType] = useState<string>('Domain');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    try {
      // For now, load Domain templates as the primary example
      // Later we can load all templates and group by KeeperType
      const response = await apiFetch('/api/engagement/templates/type/Domain');
      
      if (response.success && response.data) {
        const domainTemplates = response.data;
        setTemplates(domainTemplates);
        setGroupedTemplates({ Domain: domainTemplates });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getIconForTemplate = (template: EngagementTemplate) => {
    const iconMap: Record<string, any> = {
      'domain.public.contact': EnvelopeIcon,
      'domain.admin.update': Cog6ToothIcon,
      'domain.admin.verify': CheckCircleIcon,
      'domain.admin.addCustomDomain': GlobeAltIcon,
      'domain.admin.editApiKey': KeyIcon,
      'domain.admin.assignAgent': RocketLaunchIcon,
    };
    
    return iconMap[template.slug] || DocumentTextIcon;
  };

  const getVisibilityBadge = (visibility: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      public: { color: 'bg-green-100 text-green-800', text: 'Public' },
      admin: { color: 'bg-red-100 text-red-800', text: 'Admin Only' },
      member: { color: 'bg-blue-100 text-blue-800', text: 'Members' },
    };
    
    const badge = badges[visibility] || badges.public;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Engagement Templates
          </h1>
          <p className="text-gray-600">
            Pre-configured actions and forms for different Keeper types.
            Templates define the fields, validation, and backend endpoints for user interactions.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-1">How It Works</h3>
          <p className="text-sm text-blue-800">
            Engagement Templates are the runtime system that powers actions throughout Keeper.
            When you click "Update Domain" or "Verify DNS", you're triggering an Engagement Template
            that validates inputs, checks permissions, and calls the appropriate API endpoint.
          </p>
        </div>

        {/* Keeper Type Tabs */}
        {Object.keys(groupedTemplates).length > 1 && (
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              {Object.keys(groupedTemplates).map(keeperType => (
                <button
                  key={keeperType}
                  onClick={() => setActiveKeeperType(keeperType)}
                  className={`
                    px-4 py-2 font-medium border-b-2 transition-colors
                    ${activeKeeperType === keeperType
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {keeperType}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {templates.map((template) => {
            const Icon = getIconForTemplate(template);
            
            return (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedTemplate(template)}
                className="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  {getVisibilityBadge(template.config.visibility)}
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">
                  {template.label}
                </h3>

                <p className="text-sm text-gray-600 mb-3">
                  {template.type === 'form' ? 'Form' : 'Action'} • {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                </p>

                <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-2 py-1">
                  {template.slug}
                </div>
              </motion.div>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No templates found for {activeKeeperType}</p>
            <p className="text-sm text-gray-500">
              Templates are configured in the database seed files.
            </p>
          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedTemplate.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedTemplate.slug}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Template Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2 text-gray-900">{selectedTemplate.type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Target:</span>
                    <span className="ml-2 text-gray-900">{selectedTemplate.targetType}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Visibility:</span>
                    <span className="ml-2">{getVisibilityBadge(selectedTemplate.config.visibility)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fields:</span>
                    <span className="ml-2 text-gray-900">{selectedTemplate.fields.length}</span>
                  </div>
                </div>

                {/* Action Endpoint */}
                {selectedTemplate.config.action && (
                  <div className="bg-gray-50 rounded p-3">
                    <h4 className="font-medium text-gray-900 mb-2">API Endpoint</h4>
                    <div className="font-mono text-sm text-gray-700">
                      <span className="font-bold text-blue-600">
                        {selectedTemplate.config.action.method}
                      </span>
                      {' '}
                      {selectedTemplate.config.action.endpoint}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Success: "{selectedTemplate.config.action.successMessage}"
                    </p>
                  </div>
                )}

                {/* Fields */}
                {selectedTemplate.fields.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Fields</h4>
                    <div className="space-y-2">
                      {selectedTemplate.fields.map((field, idx) => (
                        <div key={idx} className="border border-gray-200 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{field.label}</span>
                            {field.required && (
                              <span className="text-xs text-red-600">(required)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {field.name}
                            </span>
                            {' • '}
                            <span>{field.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    console.log('Test template:', selectedTemplate.slug);
                    alert('Template testing UI coming soon!');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Test Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Engagement Templates are defined in{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              packages/database/prisma/seeds/domain-engagement-templates.seed.ts
            </code>
          </p>
          <p className="mt-2">
            To add new templates, update the seed file and run <code>pnpm run seed</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EngagementTemplatesPage;
