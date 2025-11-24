import React from 'react';
import { Link } from 'react-router-dom';

type DomainView = 'public' | 'agent' | 'admin';
type ViewKey = DomainView | 'workshop';

interface DomainViewNavigationProps {
  domainSlug: string;
  domainId?: string | null;
  currentView: DomainView;
  canAccessWorkshop?: boolean;
  showAdminLink?: boolean;
  className?: string;
}

/**
 * Lightweight navigation used across Domain / Agent / Admin views
 * to help users move between story, agent workbench, and workshop.
 */
export function DomainViewNavigation({
  domainSlug,
  domainId,
  currentView,
  canAccessWorkshop = false,
  showAdminLink = false,
  className = '',
}: DomainViewNavigationProps) {
  const linkBase =
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const inactiveBtn =
    'bg-white/90 text-gray-700 border-gray-300 hover:bg-white focus-visible:ring-rose-200';
  const activeBtn = 'bg-rose-600 text-white border-rose-600 cursor-default';
  const disabledBtn =
    'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';

  const renderLink = (
    to: string,
    label: string,
    viewKey: ViewKey,
    isEnabled = true
  ) => {
    const isActive = currentView === viewKey;
    const classNames = [
      linkBase,
      isActive ? activeBtn : isEnabled ? inactiveBtn : disabledBtn,
    ].join(' ');

    if (!isEnabled) {
      return (
        <span key={label} className={classNames} aria-disabled="true">
          {label}
        </span>
      );
    }

    if (isActive) {
      return (
        <span key={label} className={classNames} aria-current="page">
          {label}
        </span>
      );
    }

    return (
      <Link key={label} to={to} className={classNames}>
        {label}
      </Link>
    );
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {renderLink(`/d/${domainSlug}`, 'View Domain', 'public')}
      {renderLink(
        `/d/${domainSlug}/agent`,
        'Open Agent',
        'agent',
        true
      )}
      {showAdminLink &&
        renderLink(`/d/${domainSlug}/admin`, 'Domain Admin', 'admin', true)}
      {renderLink(
        `/studio/domain/${domainId ?? 'missing'}/board-studio`,
        'Open Workshop',
        'workshop',
        Boolean(canAccessWorkshop && domainId)
      )}
    </div>
  );
}

