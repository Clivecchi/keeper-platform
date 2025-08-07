/**
 * Custom Domain Frame
 * ===================
 * 
 * Config panel frame component for configuring custom domain settings and DNS.
 * Supports domain validation, SSL configuration, and DNS management.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  value: string;
  status: 'verified' | 'pending' | 'error';
  required: boolean;
}

interface DomainConfig {
  customDomain: string;
  isVerified: boolean;
  sslEnabled: boolean;
  autoRedirect: boolean;
  dnsRecords: DnsRecord[];
}

const CustomDomainFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState('domain');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Mock domain configuration
  const [domainConfig, setDomainConfig] = useState<DomainConfig>({
    customDomain: 'my-company.com',
    isVerified: false,
    sslEnabled: true,
    autoRedirect: true,
    dnsRecords: [
      {
        type: 'CNAME',
        name: 'www',
        value: 'keeper-platform.vercel.app',
        status: 'pending',
        required: true
      },
      {
        type: 'A',
        name: '@',
        value: '76.76.19.61',
        status: 'verified',
        required: true
      },
      {
        type: 'TXT',
        name: '_keeper-verification',
        value: 'keeper-verify=abc123def456',
        status: 'pending',
        required: true
      }
    ]
  });

  const handleDomainSave = () => {
    const interaction = {
      type: 'submit' as const,
      frameId: frameInstance.id,
      data: { 
        action: 'custom_domain_save',
        domain: domainConfig.customDomain,
        sslEnabled: domainConfig.sslEnabled,
        autoRedirect: domainConfig.autoRedirect
      },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setDomainConfig(prev => ({
      ...prev,
      isVerified: true,
      dnsRecords: prev.dnsRecords.map(record => ({
        ...record,
        status: 'verified'
      }))
    }));
    
    setIsVerifying(false);
    
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action: 'domain_verify', domain: domainConfig.customDomain },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleCopyRecord = async (record: DnsRecord) => {
    try {
      await navigator.clipboard.writeText(record.value);
      setCopied(record.name);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusIcon = (status: DnsRecord['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ArrowPathIcon className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: DnsRecord['status']) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const tabs: FrameTab[] = [
    {
      id: 'domain',
      label: 'Domain Setup',
      icon: <GlobeAltIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Domain Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Domain
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={domainConfig.customDomain}
                onChange={(e) => setDomainConfig(prev => ({ ...prev, customDomain: e.target.value }))}
                placeholder="your-domain.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleDomainSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter your custom domain without http:// or www
            </p>
          </div>

          {/* Domain Status */}
          <div className={`p-4 rounded-lg border ${
            domainConfig.isVerified 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {domainConfig.isVerified ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              )}
              <h4 className={`font-medium ${
                domainConfig.isVerified ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {domainConfig.isVerified ? 'Domain Verified' : 'Domain Verification Required'}
              </h4>
            </div>
            <p className={`text-sm ${
              domainConfig.isVerified ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {domainConfig.isVerified 
                ? 'Your custom domain is configured and working correctly.'
                : 'Please configure the DNS records below to verify your domain.'
              }
            </p>
          </div>

          {/* Domain Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Domain Settings</h4>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={domainConfig.sslEnabled}
                  onChange={(e) => setDomainConfig(prev => ({ ...prev, sslEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Enable SSL Certificate</span>
                  <p className="text-xs text-gray-500">Automatically provision and manage SSL certificates</p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={domainConfig.autoRedirect}
                  onChange={(e) => setDomainConfig(prev => ({ ...prev, autoRedirect: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-redirect to HTTPS</span>
                  <p className="text-xs text-gray-500">Automatically redirect HTTP traffic to HTTPS</p>
                </div>
              </label>
            </div>
          </div>

          {/* Verify Button */}
          {!domainConfig.isVerified && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleVerifyDomain}
                disabled={isVerifying}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                <span>{isVerifying ? 'Verifying...' : 'Verify Domain'}</span>
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'dns',
      label: 'DNS Records',
      icon: <Cog6ToothIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">DNS Configuration</h4>
                <p className="text-sm text-blue-800">
                  Add these DNS records to your domain registrar to connect your custom domain.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {domainConfig.dnsRecords.map((record, index) => (
              <motion.div
                key={`${record.type}-${record.name}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {record.type}
                    </span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1 capitalize">{record.status}</span>
                    </div>
                    {record.required && (
                      <span className="text-xs text-red-600 font-medium">Required</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-2 py-1 bg-gray-50 rounded text-sm font-mono">
                        {record.name}
                      </code>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-2 py-1 bg-gray-50 rounded text-sm font-mono truncate">
                        {record.value}
                      </code>
                      <button
                        onClick={() => handleCopyRecord(record)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied === record.name ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
            <p className="text-sm text-gray-600 mb-3">
              DNS changes can take up to 24 hours to propagate. If you're having trouble, check our guides:
            </p>
            <div className="space-y-1 text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-700 block">→ Configuring DNS with Cloudflare</a>
              <a href="#" className="text-blue-600 hover:text-blue-700 block">→ Setting up custom domains with GoDaddy</a>
              <a href="#" className="text-blue-600 hover:text-blue-700 block">→ Troubleshooting DNS issues</a>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ssl',
      label: 'SSL & Security',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">SSL Certificate Active</h4>
            </div>
            <p className="text-sm text-green-800">
              Your domain is protected with a valid SSL certificate. All traffic is encrypted.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Security Settings</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span>HTTPS Redirect</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span>HSTS Header</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span>Certificate Auto-Renewal</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Certificate Expires</span>
                <span className="text-gray-600">March 15, 2025</span>
              </div>
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
          <GlobeAltIcon className="w-5 h-5 text-green-600" />
          <h3 className="font-medium text-gray-900">Custom Domain</h3>
        </div>
        <p className="text-sm text-gray-600">
          Configure custom domain settings, DNS records, and SSL certificates.
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
            <GlobeAltIcon className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900">Custom Domain Configuration</h3>
          </div>
          <div className={`text-sm font-medium ${
            domainConfig.isVerified ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {domainConfig.isVerified ? 'Verified' : 'Pending Verification'}
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
                  ? 'border-green-500 text-green-600'
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
    </div>
  );
};

export default CustomDomainFrame;
