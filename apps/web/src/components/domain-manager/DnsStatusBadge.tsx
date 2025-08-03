import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface DnsStatusBadgeProps {
  hasCustomDomain: boolean;
  isVerified: boolean;
  isConfigured?: boolean;
  compact?: boolean;
}

const DnsStatusBadge: React.FC<DnsStatusBadgeProps> = ({ 
  hasCustomDomain, 
  isVerified, 
  isConfigured = false,
  compact = false 
}) => {
  if (!hasCustomDomain) {
    return null;
  }

  const getStatusInfo = () => {
    if (isVerified) {
      return {
        icon: <CheckCircleIcon className="w-4 h-4" />,
        text: 'Verified',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (isConfigured) {
      return {
        icon: <InformationCircleIcon className="w-4 h-4" />,
        text: 'DNS Ready',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
        text: 'DNS Pending',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} border ${statusInfo.color}`}>
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} border ${statusInfo.color}`}>
      <GlobeAltIcon className="w-4 h-4" />
      <span>Custom Domain</span>
      <div className="flex items-center gap-1">
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>
    </div>
  );
};

export default DnsStatusBadge; 