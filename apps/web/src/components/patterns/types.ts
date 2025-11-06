/**
 * Pattern Component Types
 * Shared type definitions for all pattern components
 */

// =============================================================================
// MANIFESTO TYPES
// =============================================================================

export interface ManifestoProps {
  title: string;
  kicker?: string;
  quote: string;
  content?: string;
  cta?: { label: string; href: string };
  themeVariant?: "system" | "lowcountry-summer" | "juke-joint";
}

// =============================================================================
// PATHWAYNAV TYPES
// =============================================================================

export type PathwayItem = {
  label: string;
  href: string;
  description?: string;
  icon?: string; // lucide name, optional
  variant?: "system" | "accent" | "dark" | "light";
  analyticsId?: string; // e.g., "path.signin"
};

export type PathwayNavProps = {
  layout?: "edge" | "inline";       // edge = vertical tabs peeking in; inline = pills under hero
  orientation?: "vertical" | "horizontal";
  themeVariant?: "system" | "lowcountry-summer" | "juke-joint";
  paths?: PathwayItem[];            // visible when NOT authed
  authedPaths?: PathwayItem[];      // visible when authed (and optionally owner)
  visibleFor?: Array<"public" | "authed" | "owner">; // default ["public","authed"]
  ownerOnlyAuthedPaths?: boolean;   // if true, authed paths render only for owners
  position?: "right" | "left" | "top" | "bottom";    // for edge layout
};


