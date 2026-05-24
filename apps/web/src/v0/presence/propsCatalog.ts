/**
 * propsCatalog
 * ============
 * Unified Props Library catalog for KeeperPresence frame config.
 * Single source of truth — replaces duplicate catalogs in Studio and DesignBoardFrameDetail.
 */

export interface PropsCatalogItem {
  name: string
  description: string
  propType: string
  propConfig: Record<string, unknown>
}

export interface PropsCatalogSection {
  label: string
  /** CSS custom property name (without --) that resolves to an HSL channel triple. */
  colorVar: string
  items: PropsCatalogItem[]
}

export const PROPS_CATALOG_SECTIONS: PropsCatalogSection[] = [
  {
    label: "Media",
    colorVar: "--theme-accent-secondary",
    items: [
      {
        name: "Hero Image",
        description: "Full-width hero image banner",
        propType: "image",
        propConfig: { url: "", alt: "Hero image", size: "large", name: "Hero Image" },
      },
      {
        name: "Video Player",
        description: "Embedded video playback",
        propType: "media",
        propConfig: { url: "", type: "video", autoplay: false, name: "Video Player" },
      },
      {
        name: "Image Gallery",
        description: "Multi-image grid layout",
        propType: "gallery",
        propConfig: { images: [], layout: "grid", columns: 3, name: "Image Gallery" },
      },
    ],
  },
  {
    label: "Content",
    colorVar: "--theme-accent-primary",
    items: [
      {
        name: "Heading",
        description: "Section heading text",
        propType: "heading",
        propConfig: {
          content: "Enter heading text...",
          level: 2,
          alignment: "left",
          name: "Heading",
        },
      },
      {
        name: "Text Block",
        description: "Rich text paragraph content",
        propType: "text",
        propConfig: {
          content: "Enter your text here...",
          fontSize: "medium",
          bold: false,
          name: "Text Block",
        },
      },
      {
        name: "Quote",
        description: "Styled quote or callout",
        propType: "quote",
        propConfig: {
          content: "Enter quote text...",
          author: "",
          style: "default",
          name: "Quote",
        },
      },
    ],
  },
  {
    label: "Interactive",
    colorVar: "--theme-accent-secondary",
    items: [
      {
        name: "Action Button",
        description: "Primary CTA button",
        propType: "button",
        propConfig: { label: "Click me", action: "", variant: "primary", name: "Action Button" },
      },
      {
        name: "Form",
        description: "Input form with fields",
        propType: "form",
        propConfig: { fields: [], submitLabel: "Submit", action: "", name: "Form" },
      },
    ],
  },
  {
    label: "AI",
    colorVar: "--theme-accent-tertiary",
    items: [
      {
        name: "AI Token",
        description: "Dynamic AI-generated token",
        propType: "ai-assistant",
        propConfig: {
          displayName: "AI Assistant",
          avatarUrl: "/placeholder.svg",
          personaNote: "Helpful AI assistant",
          name: "AI Token",
        },
      },
      {
        name: "AI Assistant",
        description: "Embedded Kip assistant",
        propType: "ai-assistant",
        propConfig: {
          greeting: "Hello! How can I help you?",
          capabilities: [],
          name: "AI Assistant",
        },
      },
      {
        name: "Smart Suggestions",
        description: "Context-aware suggestions",
        propType: "ai-assistant",
        propConfig: {
          type: "suggestions",
          title: "Smart Suggestions",
          suggestions: [],
          name: "Smart Suggestions",
        },
      },
    ],
  },
]
