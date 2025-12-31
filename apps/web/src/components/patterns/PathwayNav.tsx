/**
 * PathwayNav Component
 * 
 * Narrative navigation frame that renders public paths (e.g., Sign In, Get Started) 
 * and authed paths (e.g., Edit Domain). Feels like page-edge path markers—calm, 
 * thematic, and clearly part of the Domain Board.
 * 
 * Features:
 * - Auth-aware: shows different paths based on authentication state
 * - Edge layout: vertical tabs peeking from page edge (bookmark-ish ribbons)
 * - Inline layout: horizontal pill buttons
 * - Theme variants: system, lowcountry-summer, juke-joint
 * - Accessibility: keyboard nav, ARIA labels, WCAG AA contrast
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { PathwayNavProps, PathwayItem } from './types';

// Helper to combine class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function PathwayNav(props: PathwayNavProps) {
  const {
    layout = "edge",
    orientation = "vertical",
    position = "right",
    themeVariant = "system",
    paths = [],
    authedPaths = [],
    visibleFor = ["public", "authed"],
    ownerOnlyAuthedPaths = false,
  } = props;

  const { isAuthenticated, user } = useAuth();

  // Determine what to show based on auth state
  // TODO: Add proper owner check when domain context is available
  const isOwner = false; // Placeholder - replace with actual owner check

  const showPublic = !isAuthenticated && visibleFor.includes("public");
  const showAuthed = isAuthenticated && visibleFor.includes("authed") && (!ownerOnlyAuthedPaths || isOwner);

  const items: PathwayItem[] = showAuthed ? authedPaths : showPublic ? paths : [];

  if (!items?.length) return null;

  // Edge layout: vertical "tabs" peeking from the edge
  if (layout === "edge") {
    const edgePositionClass =
      position === "right"
        ? "right-4"
        : position === "left"
        ? "left-4"
        : position === "top"
        ? "top-4"
        : "bottom-4";

    const orientationClass = orientation === "vertical" 
      ? "flex-col top-1/3" 
      : "flex-row items-center";

    return (
      <nav
        aria-label="Paths"
        className={cn(
          "fixed z-40 flex gap-2 pointer-events-auto",
          orientationClass,
          edgePositionClass
        )}
      >
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-label={item.description ?? item.label}
            data-analytics-id={item.analyticsId}
            className={cn(
              // Bookmark-ish ribbon
              "group text-sm font-semibold rounded-t-lg shadow-sm",
              "px-1.5 py-3 transition-transform",
              "hover:-translate-x-0.5 focus:-translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
              orientation === "vertical" && "writing-mode-vertical",
              variantClass(item.variant ?? "system", themeVariant)
            )}
            style={orientation === "vertical" ? { writingMode: "vertical-rl" } : undefined}
          >
            <span className="select-none">{item.label}</span>
          </a>
        ))}
      </nav>
    );
  }

  // Inline layout: pill buttons (fallback)
  return (
    <nav aria-label="Paths" className="flex gap-2 flex-wrap">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          data-analytics-id={item.analyticsId}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium shadow-sm",
            "transition-transform hover:-translate-y-0.5 focus:-translate-y-0.5",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            pillVariantClass(item.variant ?? "system", themeVariant)
          )}
          aria-label={item.description ?? item.label}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Variant class mapping for edge/ribbon layout
 * Maps variant + theme to Tailwind classes with proper contrast
 */
function variantClass(variant: string, theme: string): string {
  // Accent variant (amber/yellow - high visibility)
  if (variant === "accent") {
    return "bg-amber-400 text-black hover:bg-amber-500 focus:ring-amber-500";
  }
  
  // Dark variant (neutral dark)
  if (variant === "dark") {
    return "bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-700";
  }
  
  // Light variant (white/light with border)
  if (variant === "light") {
    return "bg-white/90 text-neutral-900 border border-neutral-200 hover:bg-white focus:ring-neutral-400";
  }
  
  // System variant - theme-aware
  if (theme === "juke-joint") {
    return "bg-indigo-800 text-white hover:bg-indigo-700 focus:ring-indigo-600";
  }
  
  if (theme === "lowcountry-summer") {
    return "bg-blue-700 text-white hover:bg-blue-600 focus:ring-blue-500";
  }
  
  // Default system (neutral)
  return "bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-600";
}

/**
 * Variant class mapping for inline/pill layout
 */
function pillVariantClass(variant: string, theme: string): string {
  // Accent variant
  if (variant === "accent") {
    return "bg-amber-400 text-black hover:bg-amber-500 focus:ring-amber-500";
  }
  
  // Dark variant
  if (variant === "dark") {
    return "bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-700";
  }
  
  // Light variant
  if (variant === "light") {
    return "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 focus:ring-neutral-400";
  }
  
  // Theme-aware system variant
  if (theme === "juke-joint") {
    return "bg-indigo-700 text-white hover:bg-indigo-600 focus:ring-indigo-500";
  }
  
  if (theme === "lowcountry-summer") {
    return "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400";
  }
  
  // Default system
  return "bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-600";
}

export default PathwayNav;


