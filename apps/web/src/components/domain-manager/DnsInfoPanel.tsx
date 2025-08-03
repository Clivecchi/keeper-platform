import React from 'react';

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
}

const DnsInfoPanel: React.FC<Props> = ({ records, nameServers = [], configured, verified }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-md space-y-4">
      {!configured && (
        <p className="text-sm text-red-600">
          DNS not detected yet – add these records at your registrar then click Verify.
        </p>
      )}
      {configured && !verified && (
        <p className="text-sm text-yellow-700">
          DNS detected ✅ – waiting for verification. You may click Verify now.
        </p>
      )}
      {verified && (
        <p className="text-sm text-green-700">Domain verified and SSL will be issued automatically.</p>
      )}

      {nameServers.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Nameservers</p>
          {nameServers.map((ns) => (
            <div key={ns} className="text-sm font-mono">{ns}</div>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">DNS Records</p>
          {records.map((r, i) => (
            <div key={i} className="text-sm font-mono">
              {r.type} {r.domain} → {r.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DnsInfoPanel;
