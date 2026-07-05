import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

export interface DNSRecord {
  type: string;
  domain: string;
  value: string;
}

export const VERCEL_DELEGATION_NAMESERVERS = [
  'ns1.vercel-dns.com',
  'ns2.vercel-dns.com',
] as const;

export function isVercelDelegationNameserver(ns: string): boolean {
  return ns.trim().toLowerCase().endsWith('.vercel-dns.com');
}

export function usesVercelNameserverDelegation(nameServers: string[]): boolean {
  return (
    nameServers.length > 0 &&
    nameServers.every((ns) => isVercelDelegationNameserver(ns))
  );
}

export interface DnsInfoPanelProps {
  records: DNSRecord[];
  /** Authoritative NS Vercel detected (registrar DNS). */
  currentNameServers?: string[];
  /** NS for full delegation to Vercel — optional alternative to DNS records. */
  intendedNameServers?: string[];
  configuredBy?: string | null;
  configured: boolean;
  verified: boolean;
  compact?: boolean;
  /** @deprecated Use currentNameServers */
  nameServers?: string[];
}

function resolveNameServers(props: DnsInfoPanelProps): {
  current: string[];
  intended: string[];
} {
  const current = props.currentNameServers ?? props.nameServers ?? [];
  const intended =
    props.intendedNameServers?.length
      ? props.intendedNameServers
      : [...VERCEL_DELEGATION_NAMESERVERS];
  return { current, intended };
}

const DnsInfoPanel: React.FC<DnsInfoPanelProps> = (props) => {
  const {
    records,
    configuredBy,
    configured,
    verified,
    compact = false,
  } = props;
  const { current: currentNameServers, intended: intendedNameServers } =
    resolveNameServers(props);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const usesVercelNs = usesVercelNameserverDelegation(currentNameServers);
  const showRecords = records.length > 0;
  const showCurrentNs = currentNameServers.length > 0 && !usesVercelNs;
  const showIntendedNs =
    !usesVercelNs &&
    intendedNameServers.length > 0 &&
    (!verified || records.length === 0);

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
        text: usesVercelNs
          ? 'Domain verified — DNS is delegated to Vercel.'
          : 'Domain verified — SSL will be issued automatically.',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }
    if (configured) {
      return {
        icon: <InformationCircleIcon className="w-5 h-5 text-yellow-600" />,
        text: 'DNS detected — click Verify when ready.',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      };
    }
    return {
      icon: <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />,
      text: showRecords
        ? 'Add the DNS records below at your registrar, then click Verify.'
        : 'Point DNS to Vercel (records or nameservers), then click Verify.',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  };

  const statusInfo = getStatusInfo();

  const sectionTitleClass = compact
    ? 'text-xs font-semibold uppercase tracking-wide mb-1'
    : 'text-sm font-medium mb-2';
  const sectionHintClass = compact ? 'text-[11px] mb-2' : 'text-xs text-gray-500 mb-2';
  const rowClass = compact
    ? 'flex items-center gap-2 text-xs font-mono bg-white p-1 rounded'
    : 'flex items-center gap-2 bg-white p-2 rounded border';
  const mutedHintStyle: React.CSSProperties = compact
    ? { color: 'hsl(var(--theme-ink-tertiary))' }
    : { color: '#6b7280' };

  const renderCopyButton = (text: string, fieldName: string, compactBtn = false) => (
    <button
      type="button"
      onClick={() => void copyToClipboard(text, fieldName)}
      className={`text-gray-500 hover:text-gray-700 ${compactBtn ? '' : 'p-1 rounded'}`}
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? (
        <ClipboardDocumentCheckIcon className={compactBtn ? 'w-3 h-3' : 'w-4 h-4'} />
      ) : (
        <ClipboardDocumentIcon className={compactBtn ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
    </button>
  );

  const renderRecordsSection = (primary = false) => (
    <div>
      <p className={sectionTitleClass} style={primary ? undefined : mutedHintStyle}>
        {primary ? 'Add at your registrar' : 'DNS records'}
      </p>
      <p className={sectionHintClass} style={mutedHintStyle}>
        Add these in your registrar&apos;s DNS settings (e.g. Squarespace → DNS Settings).
        Keep your existing nameservers — do not change them unless you choose full Vercel
        delegation below.
      </p>
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {records.map((record, index) => (
          <div key={`${record.type}-${record.domain}-${index}`} className={rowClass}>
            <span className="flex-1">
              <span className="font-semibold">{record.type}</span> {record.domain} →{' '}
              {record.value}
            </span>
            {renderCopyButton(
              `${record.type} ${record.domain} ${record.value}`,
              `record-${index}`,
              compact,
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderNameserverList = (
    servers: string[],
    keyPrefix: string,
    readOnly = false,
  ) => (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {servers.map((ns, index) => (
        <div key={`${keyPrefix}-${ns}`} className={rowClass}>
          <span className={`flex-1 ${compact ? '' : 'text-sm font-mono'}`}>{ns}</span>
          {!readOnly ? renderCopyButton(ns, `${keyPrefix}-${index}`, compact) : null}
        </div>
      ))}
    </div>
  );

  const body = (
    <>
      {showRecords && !verified ? renderRecordsSection(true) : null}
      {showRecords && verified ? (
        <p className={sectionHintClass} style={mutedHintStyle}>
          DNS is managed at your registrar
          {configuredBy ? ` (${configuredBy})` : ''} — no nameserver change needed.
        </p>
      ) : null}

      {showCurrentNs ? (
        <div>
          <p className={sectionTitleClass} style={mutedHintStyle}>
            Current nameservers (detected)
          </p>
          <p className={sectionHintClass} style={mutedHintStyle}>
            These are what Vercel sees today. You usually keep these and add DNS records above.
          </p>
          {renderNameserverList(currentNameServers, 'current', true)}
        </div>
      ) : null}

      {showIntendedNs && !verified ? (
        <div>
          <p className={sectionTitleClass} style={mutedHintStyle}>
            Alternative: Vercel nameservers
          </p>
          <p className={sectionHintClass} style={mutedHintStyle}>
            Optional — only if you want Vercel to manage all DNS. At your registrar, replace
            nameservers with:
          </p>
          {renderNameserverList(intendedNameServers, 'intended')}
        </div>
      ) : null}

      {!configured && !showRecords && !showCurrentNs && !showIntendedNs ? (
        <p className={sectionHintClass} style={mutedHintStyle}>
          DNS information will appear here after adding the domain to Vercel.
        </p>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <div
        className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md p-3 space-y-3`}
      >
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md space-y-4">
      <div
        className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md p-3 flex items-center gap-2`}
      >
        {statusInfo.icon}
        <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
      </div>
      {body}
    </div>
  );
};

export default DnsInfoPanel;
