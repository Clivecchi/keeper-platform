import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

interface DNSRecord {
  type: string;
  domain: string;
  value: string;
}

interface Props {
  records: DNSRecord[];
  nameServers?: string[];
  configured: boolean;
  verified: boolean;
  compact?: boolean;
}

const DnsInfoPanel: React.FC<Props> = ({ 
  records, 
  nameServers = [], 
  configured, 
  verified, 
  compact = false 
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusInfo = () => {
    if (verified) {
      return {
        icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
        text: 'Domain verified and SSL will be issued automatically.',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (configured) {
      return {
        icon: <InformationCircleIcon className="w-5 h-5 text-yellow-600" />,
        text: 'DNS detected ✅ – waiting for verification. You may click Verify now.',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />,
        text: 'DNS not detected yet – add these records at your registrar then click Verify.',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md p-3 space-y-3`}>
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
        </div>
        
        {nameServers.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Nameservers</p>
            {nameServers.map((ns, index) => (
              <div key={index} className="flex items-center gap-2 text-xs font-mono bg-white p-1 rounded">
                <span className="flex-1">{ns}</span>
                <button
                  onClick={() => copyToClipboard(ns, `ns-${index}`)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copiedField === `ns-${index}` ? (
                    <ClipboardDocumentCheckIcon className="w-3 h-3" />
                  ) : (
                    <ClipboardDocumentIcon className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {records.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">DNS Records</p>
            {records.map((record, index) => (
              <div key={index} className="text-xs font-mono bg-white p-1 rounded mb-1">
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    {record.type} {record.domain} → {record.value}
                  </span>
                  <button
                    onClick={() => copyToClipboard(`${record.type} ${record.domain} ${record.value}`, `record-${index}`)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {copiedField === `record-${index}` ? (
                      <ClipboardDocumentCheckIcon className="w-3 h-3" />
                    ) : (
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md space-y-4">
      <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md p-3 flex items-center gap-2`}>
        {statusInfo.icon}
        <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
      </div>

      {nameServers.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Nameservers</p>
          <div className="space-y-2">
            {nameServers.map((ns, index) => (
              <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                <span className="text-sm font-mono flex-1">{ns}</span>
                <button
                  onClick={() => copyToClipboard(ns, `ns-${index}`)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded"
                  title="Copy to clipboard"
                >
                  {copiedField === `ns-${index}` ? (
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                  ) : (
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">DNS Records</p>
          <div className="space-y-2">
            {records.map((record, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-mono">
                      <span className="font-semibold">{record.type}</span> {record.domain} → {record.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Add this record to your domain registrar's DNS settings
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${record.type} ${record.domain} ${record.value}`, `record-${index}`)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded"
                    title="Copy to clipboard"
                  >
                    {copiedField === `record-${index}` ? (
                      <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!configured && records.length === 0 && nameServers.length === 0 && (
        <div className="text-sm text-gray-500">
          DNS information will appear here after adding the domain to Vercel.
        </div>
      )}
    </div>
  );
};

export default DnsInfoPanel;
