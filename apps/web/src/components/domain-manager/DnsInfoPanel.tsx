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

/** Standard Vercel records when API returns none (common after verification). */
export const DEFAULT_VERCEL_REGISTRAR_RECORDS: DNSRecord[] = [
  { type: 'A', domain: '@', value: '76.76.21.21' },
  { type: 'CNAME', domain: 'www', value: 'cname.vercel-dns.com' },
];

export function isVercelDelegationNameserver(ns: string): boolean {
  return ns.trim().toLowerCase().endsWith('.vercel-dns.com');
}

export function usesVercelNameserverDelegation(nameServers: string[]): boolean {
  return (
    nameServers.length > 0 &&
    nameServers.every((ns) => isVercelDelegationNameserver(ns))
  );
}

export function resolveRegistrarDnsRecords(
  apiRecords: DNSRecord[],
  customDomain?: string,
): DNSRecord[] {
  if (apiRecords.length > 0) return apiRecords;
  if (!customDomain?.trim()) return DEFAULT_VERCEL_REGISTRAR_RECORDS;
  return DEFAULT_VERCEL_REGISTRAR_RECORDS;
}

export interface DnsInfoPanelProps {
  records: DNSRecord[];
  customDomain?: string;
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

type StatusTone = 'success' | 'warning' | 'error';

interface ThemeStyles {
  panel: React.CSSProperties;
  statusRow: React.CSSProperties;
  statusText: React.CSSProperties;
  sectionTitle: React.CSSProperties;
  sectionHint: React.CSSProperties;
  row: React.CSSProperties;
  rowText: React.CSSProperties;
  copyBtn: React.CSSProperties;
  iconSuccess: React.CSSProperties;
  iconWarning: React.CSSProperties;
  iconError: React.CSSProperties;
}

function chronicleTheme(tone: StatusTone): ThemeStyles {
  const statusVar =
    tone === 'success'
      ? '--theme-status-success'
      : tone === 'warning'
        ? '--theme-status-warning'
        : '--theme-status-error';

  return {
    panel: {
      border: `1px solid hsl(var(${statusVar}) / 0.35)`,
      background: `hsl(var(--theme-surface-elevated) / 0.42)`,
      borderRadius: '0.375rem',
      padding: '0.75rem',
    },
    statusRow: {
      borderBottom: '1px solid hsl(var(--theme-border-soft) / 0.35)',
      paddingBottom: '0.625rem',
      marginBottom: '0.625rem',
    },
    statusText: {
      color: `hsl(var(${statusVar}))`,
      fontSize: '0.8125rem',
      lineHeight: 1.45,
    },
    sectionTitle: {
      color: 'hsl(var(--theme-ink-primary))',
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      marginBottom: '0.25rem',
    },
    sectionHint: {
      color: 'hsl(var(--theme-ink-secondary))',
      fontSize: '0.6875rem',
      lineHeight: 1.45,
      marginBottom: '0.5rem',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      border: '1px solid hsl(var(--theme-border-soft) / 0.5)',
      background: 'hsl(var(--theme-surface-paper) / 0.55)',
      borderRadius: '0.375rem',
      padding: '0.375rem 0.5rem',
      marginBottom: '0.25rem',
    },
    rowText: {
      flex: 1,
      fontFamily: 'ui-monospace, monospace',
      fontSize: '0.6875rem',
      color: 'hsl(var(--theme-ink-primary))',
      wordBreak: 'break-all' as const,
    },
    copyBtn: {
      color: 'hsl(var(--theme-ink-secondary))',
      flexShrink: 0,
    },
    iconSuccess: { color: 'hsl(var(--theme-status-success))' },
    iconWarning: { color: 'hsl(var(--theme-status-warning))' },
    iconError: { color: 'hsl(var(--theme-status-error))' },
  };
}

const DnsInfoPanel: React.FC<DnsInfoPanelProps> = (props) => {
  const {
    records: apiRecords,
    customDomain,
    configuredBy,
    configured,
    verified,
    compact = false,
  } = props;
  const { current: currentNameServers, intended: intendedNameServers } =
    resolveNameServers(props);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const usesVercelNs = usesVercelNameserverDelegation(currentNameServers);
  const registrarRecords = resolveRegistrarDnsRecords(apiRecords, customDomain);
  const showRegistrarRecords = !usesVercelNs && registrarRecords.length > 0;
  const showCurrentNs =
    !verified && currentNameServers.length > 0 && !usesVercelNs;
  const showIntendedNs =
    !verified && !usesVercelNs && intendedNameServers.length > 0;

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatus = (): { tone: StatusTone; text: string; icon: React.ReactNode } => {
    if (verified) {
      return {
        tone: 'success',
        text: usesVercelNs
          ? 'Domain verified — DNS is delegated to Vercel.'
          : 'Domain verified — SSL will issue automatically.',
        icon: <CheckCircleIcon className="w-4 h-4 shrink-0" />,
      };
    }
    if (configured) {
      return {
        tone: 'warning',
        text: 'DNS detected — click Verify when ready.',
        icon: <InformationCircleIcon className="w-4 h-4 shrink-0" />,
      };
    }
    return {
      tone: 'error',
      text: 'Add the DNS records below at your registrar, then click Verify.',
      icon: <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />,
    };
  };

  const status = getStatus();
  const themed = compact ? chronicleTheme(status.tone) : null;
  const iconStyle =
    status.tone === 'success'
      ? themed?.iconSuccess
      : status.tone === 'warning'
        ? themed?.iconWarning
        : themed?.iconError;

  const renderCopyButton = (
    text: string,
    fieldName: string,
    style?: React.CSSProperties,
  ) => (
    <button
      type="button"
      onClick={() => void copyToClipboard(text, fieldName)}
      className="hover:opacity-80"
      style={style}
      title="Copy"
    >
      {copiedField === fieldName ? (
        <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
      ) : (
        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
      )}
    </button>
  );

  const renderRecordsSection = () => (
    <div>
      <p
        className={compact ? undefined : 'text-sm font-medium mb-2'}
        style={themed?.sectionTitle}
      >
        {verified ? 'DNS at your registrar' : 'Add at your registrar'}
      </p>
      <p
        className={compact ? undefined : 'text-xs text-gray-500 mb-2'}
        style={themed?.sectionHint}
      >
        {verified
          ? `These records point ${customDomain?.trim() || 'your domain'} to Vercel. Keep your registrar nameservers unchanged.`
          : 'Add these in your registrar DNS settings (e.g. Squarespace → DNS). Keep your existing nameservers unless you choose Vercel delegation below.'}
        {apiRecords.length === 0 ? ' Values below are Vercel defaults.' : ''}
      </p>
      <div>
        {registrarRecords.map((record, index) => (
          <div
            key={`${record.type}-${record.domain}-${index}`}
            style={themed?.row}
            className={
              compact
                ? undefined
                : 'flex items-center gap-2 bg-white p-2 rounded border mb-1'
            }
          >
            <span
              style={themed?.rowText}
              className={compact ? undefined : 'text-sm font-mono flex-1'}
            >
              <span className="font-semibold">{record.type}</span> {record.domain} →{' '}
              {record.value}
            </span>
            {renderCopyButton(record.value, `record-${index}`, themed?.copyBtn)}
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
    <div>
      {servers.map((ns, index) => (
        <div
          key={`${keyPrefix}-${ns}`}
          style={themed?.row}
          className={
            compact ? undefined : 'flex items-center gap-2 bg-white p-2 rounded border mb-1'
          }
        >
          <span
            style={themed?.rowText}
            className={compact ? undefined : 'text-sm font-mono flex-1'}
          >
            {ns}
          </span>
          {!readOnly
            ? renderCopyButton(ns, `${keyPrefix}-${index}`, themed?.copyBtn)
            : null}
        </div>
      ))}
    </div>
  );

  const renderSectionTitle = (text: string) => (
    <p
      className={compact ? undefined : 'text-sm font-medium mb-2'}
      style={themed?.sectionTitle}
    >
      {text}
    </p>
  );

  const renderSectionHint = (text: string) => (
    <p
      className={compact ? undefined : 'text-xs text-gray-500 mb-2'}
      style={themed?.sectionHint}
    >
      {text}
    </p>
  );

  const body = (
    <div className="space-y-3">
      {showRegistrarRecords ? renderRecordsSection() : null}

      {showCurrentNs ? (
        <div>
          {renderSectionTitle('Current nameservers (detected)')}
          {renderSectionHint(
            'Informational only — Vercel detected these at your registrar. Do not change unless switching to full Vercel DNS.',
          )}
          {renderNameserverList(currentNameServers, 'current', true)}
        </div>
      ) : null}

      {showIntendedNs ? (
        <div>
          {renderSectionTitle('Alternative: Vercel nameservers')}
          {renderSectionHint(
            'Optional — replace registrar nameservers only if you want Vercel to manage all DNS.',
          )}
          {renderNameserverList(intendedNameServers, 'intended')}
        </div>
      ) : null}

      {usesVercelNs && configuredBy ? (
        renderSectionHint(`Configured via Vercel nameserver delegation (${configuredBy}).`)
      ) : null}
    </div>
  );

  if (compact && themed) {
    return (
      <div style={themed.panel} className="space-y-0">
        <div style={themed.statusRow} className="flex items-start gap-2">
          <span style={iconStyle}>{status.icon}</span>
          <span style={themed.statusText}>{status.text}</span>
        </div>
        {body}
      </div>
    );
  }

  const legacyStatus = getStatus();
  const legacyBg =
    legacyStatus.tone === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : legacyStatus.tone === 'warning'
        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
        : 'bg-red-50 border-red-200 text-red-700';

  return (
    <div className="bg-gray-50 p-4 rounded-md space-y-4">
      <div className={`border rounded-md p-3 flex items-center gap-2 ${legacyBg}`}>
        {legacyStatus.icon}
        <span className="text-sm">{legacyStatus.text}</span>
      </div>
      {body}
    </div>
  );
};

export default DnsInfoPanel;
