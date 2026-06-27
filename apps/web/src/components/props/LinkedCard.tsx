import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { LinkedCardProps } from '../../types/props';

export type LinkedCardVariant = 'context' | 'inline';

export interface LinkedCardComponentProps extends LinkedCardProps {
  variant?: LinkedCardVariant;
  className?: string;
  /** When set, renders a button instead of router navigation (in-board selection). */
  onNavigate?: () => void;
}

const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

const Wrapper: React.FC<
  React.PropsWithChildren<{ href: string; isExternal: boolean; className: string; onNavigate?: () => void }>
> = ({ href, isExternal, className, children, onNavigate }) => {
  if (onNavigate) {
    return (
      <button type="button" onClick={onNavigate} className={className}>
        {children}
      </button>
    );
  }
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
};

export const LinkedCard: React.FC<LinkedCardComponentProps> = ({
  variant = 'context',
  className,
  onNavigate,
  ...card
}) => {
  const previewSnippet = card.preview?.snippet;
  const previewDate = card.preview?.date;
  const hasSnippet = previewSnippet || card.description;
  const hasDate = Boolean(previewDate);
  const hasImage = variant === 'context' && card.preview?.image;

  const baseClasses = clsx(
    'group block rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C96E59]',
    variant === 'context'
      ? 'border-[#E6DED5] bg-white hover:border-[#C96E59]/70 hover:shadow-sm'
      : 'border-dashed border-[#E6DED5] bg-white/80 hover:border-[#C96E59] hover:bg-white',
    className,
  );

  const textClasses =
    variant === 'context'
      ? 'text-sm text-gray-600'
      : 'text-xs text-[#C96E59]';

  return (
    <Wrapper href={card.href} isExternal={isExternalHref(card.href)} className={baseClasses} onNavigate={onNavigate}>
      <div className="flex gap-3">
        {hasImage && (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            <img
              src={card.preview?.image}
              alt={card.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: card.color || '#C96E59' }}
            />
            {card.entityType}
          </div>
          <p
            className={clsx(
              'truncate font-semibold text-gray-900',
              variant === 'context' ? 'text-base' : 'text-sm',
            )}
          >
            {card.title}
          </p>
          {card.subtitle && (
            <p className={clsx('truncate text-gray-500', variant === 'context' ? 'text-sm' : 'text-xs')}>
              {card.subtitle}
            </p>
          )}
          {hasSnippet && (
            <p className={clsx('mt-1 line-clamp-2', textClasses)}>
              {previewSnippet || card.description}
            </p>
          )}
          {hasDate && previewDate && (
            <p className="mt-1 text-xs text-gray-400">
              Updated{' '}
              {new Date(previewDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

