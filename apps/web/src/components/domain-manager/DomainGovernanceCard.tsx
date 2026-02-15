/**
 * DomainGovernanceCard
 * Domain Governance section for Agent Policy configuration.
 */

import React, { useEffect, useState } from 'react';
import {
  getDomainGovernance,
  updateDomainGovernance,
  getContractDetail,
  type DomainGovernance,
  type ContractDetail,
} from '../../lib/governanceApi';

const CARD_STYLE = {
  border: 'var(--theme-border-soft, hsl(35, 20%, 88%))',
  inkPrimary: 'var(--theme-ink-primary, #1f2937)',
  inkSecondary: 'var(--theme-ink-secondary, #6b7280)',
};

export interface DomainGovernanceCardProps {
  domainId: string | null;
}

export const DomainGovernanceCard: React.FC<DomainGovernanceCardProps> = ({ domainId }) => {
  const [governance, setGovernance] = useState<DomainGovernance | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractModal, setContractModal] = useState<ContractDetail | null>(null);

  useEffect(() => {
    if (!domainId) {
      setGovernance(null);
      return;
    }
    setLoading(true);
    setError(null);
    getDomainGovernance(domainId)
      .then((g) => {
        setGovernance(g);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load governance');
        setGovernance(null);
      })
      .finally(() => setLoading(false));
  }, [domainId]);

  const handleEnforcementChange = async (mode: 'strict' | 'warn' | 'off') => {
    if (!domainId || !governance) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDomainGovernance(domainId, { enforcementMode: mode });
      if (updated) setGovernance(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleViewContract = async () => {
    if (!governance) return;
    try {
      const detail = await getContractDetail(governance.contractId);
      setContractModal(detail ?? null);
    } catch {
      setError('Failed to load contract');
    }
  };

  if (!domainId) return null;

  return (
    <div
      className="rounded-2xl border px-6 py-6"
      style={{ borderColor: CARD_STYLE.border, backgroundColor: 'hsl(var(--theme-surface-paper) / 0.88)' }}
    >
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold" style={{ color: CARD_STYLE.inkPrimary }}>
          Domain Governance
        </h3>
        <p className="text-sm" style={{ color: CARD_STYLE.inkSecondary }}>
          Advanced configuration for agent reliability.
        </p>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: CARD_STYLE.inkSecondary }}>
          Loading…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && governance && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: CARD_STYLE.inkSecondary }}>
              Active Contract
            </label>
            <p className="mt-1 text-sm font-medium" style={{ color: CARD_STYLE.inkPrimary }}>
              {governance.contractName} v{governance.contractVersion}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: CARD_STYLE.inkSecondary }}>
              Enforcement Mode
            </label>
            <select
              value={governance.enforcementMode}
              onChange={(e) => handleEnforcementChange(e.target.value as 'strict' | 'warn' | 'off')}
              disabled={saving}
              className="mt-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: CARD_STYLE.border }}
            >
              <option value="off">Off</option>
              <option value="warn">Warn</option>
              <option value="strict">Strict</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleViewContract}
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: CARD_STYLE.border, color: CARD_STYLE.inkPrimary }}
            >
              View Contract
            </button>
            <span className="text-xs" style={{ color: CARD_STYLE.inkSecondary }}>
              Manage Lenses (coming soon)
            </span>
          </div>
        </div>
      )}

      {!loading && !governance && !error && (
        <p className="text-sm" style={{ color: CARD_STYLE.inkSecondary }}>
          No governance policy for this domain.
        </p>
      )}

      {contractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl"
            style={{ borderColor: CARD_STYLE.border }}
          >
            <div className="mb-4 flex items-start justify-between">
              <h4 className="text-lg font-semibold" style={{ color: CARD_STYLE.inkPrimary }}>
                {contractModal.name} v{contractModal.version}
              </h4>
              <button
                type="button"
                onClick={() => setContractModal(null)}
                className="rounded px-2 py-1 text-sm font-medium hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-xs" style={{ color: CARD_STYLE.inkPrimary }}>
              {contractModal.contractText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainGovernanceCard;
