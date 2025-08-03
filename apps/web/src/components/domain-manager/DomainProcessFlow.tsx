import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClockIcon,
  PlusIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'in-progress';
  metadata?: {
    date?: string;
    ip?: string;
    domain?: string;
    records?: any[];
    nameServers?: string[];
    error?: string;
  };
  action?: () => void;
  disabled?: boolean;
}

interface DomainProcessFlowProps {
  domain: any;
  onRefresh?: () => void;
}

const DomainProcessFlow: React.FC<DomainProcessFlowProps> = ({ domain, onRefresh }) => {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<any>(null);
  const [showMetadata, setShowMetadata] = useState<string | null>(null);

  useEffect(() => {
    if (domain) {
      loadProcessSteps();
    }
  }, [domain]);

  const loadProcessSteps = async () => {
    if (!domain) return;

    const baseSteps: ProcessStep[] = [
      {
        id: 'add-domain',
        title: 'Add Domain',
        description: 'Domain has been added to the system',
        status: 'completed',
        metadata: {
          date: domain.createdAt,
          domain: domain.name
        }
      }
    ];

    if (domain.customDomain) {
      // Load DNS status for custom domains
      try {
        const status = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain/status`);
        setDnsStatus(status);
        
        const customDomainSteps: ProcessStep[] = [
          {
            id: 'add-custom-domain',
            title: 'Add Custom Domain',
            description: `Custom domain ${domain.customDomain} has been configured`,
            status: 'completed',
            metadata: {
              date: domain.updatedAt,
              domain: domain.customDomain
            }
          },
          {
            id: 'add-to-vercel',
            title: 'Add to Vercel',
            description: 'Domain has been added to Vercel project',
            status: status.attached ? 'completed' : 'pending',
            metadata: status.attached ? {
              date: new Date().toISOString(), // We don't have this in DB yet
              domain: domain.customDomain,
              records: status.records,
              nameServers: status.nameServers
            } : undefined,
            action: status.attached ? () => setShowMetadata('add-to-vercel') : handleAddToVercel,
            disabled: status.attached
          },
          {
            id: 'configure-dns',
            title: 'Configure DNS',
            description: 'DNS records have been configured at registrar',
            status: status.configured ? 'completed' : 'pending',
            metadata: status.configured ? {
              date: new Date().toISOString(),
              records: status.records,
              nameServers: status.nameServers
            } : undefined,
            action: status.configured ? () => setShowMetadata('configure-dns') : undefined,
            disabled: !status.attached || status.configured
          },
          {
            id: 'verify-domain',
            title: 'Verify Domain',
            description: 'Domain has been verified and SSL certificate issued',
            status: domain.customDomainVerified ? 'completed' : 'pending',
            metadata: domain.customDomainVerified ? {
              date: domain.verifiedAt || new Date().toISOString(),
              domain: domain.customDomain
            } : undefined,
            action: domain.customDomainVerified ? () => setShowMetadata('verify-domain') : handleVerifyDomain,
            disabled: !status.configured || domain.customDomainVerified
          }
        ];

        setSteps([...baseSteps, ...customDomainSteps]);
      } catch (err) {
        console.error('Error loading DNS status:', err);
        setSteps(baseSteps);
      }
    } else {
      setSteps(baseSteps);
    }
  };

  const handleAddToVercel = async () => {
    if (!domain?.customDomain) return;
    
    setLoading(true);
    try {
      const response = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain`, {
        method: 'POST',
        body: JSON.stringify({ customDomain: domain.customDomain })
      });
      
      if (response.success) {
        await loadProcessSteps(); // Refresh steps
        onRefresh?.();
      }
    } catch (err: any) {
      console.error('Error adding to Vercel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!domain?.customDomain) return;
    
    setLoading(true);
    try {
      const response = await apiFetch(`/api/domains/custom/${domain.id}/custom-domain/verify`, {
        method: 'POST'
      });
      
      if (response.success) {
        await loadProcessSteps(); // Refresh steps
        onRefresh?.();
      }
    } catch (err: any) {
      console.error('Error verifying domain:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: ProcessStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (step: ProcessStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'in-progress':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderMetadata = (step: ProcessStep) => {
    if (!step.metadata) return null;

    return (
      <div className="mt-3 p-3 bg-white rounded border">
        <div className="text-sm font-medium mb-2">Step Details</div>
        
        {step.metadata.date && (
          <div className="text-xs text-gray-600 mb-1">
            Completed: {new Date(step.metadata.date).toLocaleString()}
          </div>
        )}
        
        {step.metadata.domain && (
          <div className="text-xs text-gray-600 mb-1">
            Domain: {step.metadata.domain}
          </div>
        )}
        
        {step.metadata.records && step.metadata.records.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium mb-1">DNS Records:</div>
            {step.metadata.records.map((record: any, index: number) => (
              <div key={index} className="text-xs font-mono bg-gray-100 p-1 rounded mb-1">
                {record.type} {record.domain} → {record.value}
              </div>
            ))}
          </div>
        )}
        
        {step.metadata.nameServers && step.metadata.nameServers.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium mb-1">Nameservers:</div>
            {step.metadata.nameServers.map((ns: string, index: number) => (
              <div key={index} className="text-xs font-mono bg-gray-100 p-1 rounded mb-1">
                {ns}
              </div>
            ))}
          </div>
        )}
        
        {step.metadata.error && (
          <div className="mt-2 text-xs text-red-600">
            Error: {step.metadata.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Domain Setup Process</h3>
        <button
          onClick={loadProcessSteps}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className={`border rounded-lg p-4 ${getStepColor(step)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{step.title}</h4>
                    {step.status === 'completed' && (
                      <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  
                  {showMetadata === step.id && step.metadata && renderMetadata(step)}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {step.action && !step.disabled && (
                  <button
                    onClick={step.action}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Execute'}
                  </button>
                )}
                
                {step.metadata && step.status === 'completed' && (
                  <button
                    onClick={() => setShowMetadata(showMetadata === step.id ? null : step.id)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {showMetadata === step.id ? 'Hide' : 'Details'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {dnsStatus && !domain.customDomainVerified && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Next Steps</span>
          </div>
          <p className="text-sm text-blue-700">
            {dnsStatus.configured 
              ? 'DNS is configured. Click "Verify Domain" to complete the setup.'
              : 'Add the domain to Vercel first, then configure DNS records at your registrar.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DomainProcessFlow; 