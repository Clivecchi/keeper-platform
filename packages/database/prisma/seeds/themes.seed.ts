import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🎨 Seeding canonical themes...');

  const themes = [
    {
      slug: 'keeper-classic',
      label: 'Keeper Classic',
      palette: {
        primary: '#8B5A3C',
        secondary: '#D4AF37',
        accent: '#A0522D',
        background: '#FEFEFE',
        surface: '#F5F5F5',
        text: '#2C1810',
        muted: '#6B7280'
      },
      style: {
        borderRadius: '8px',
        fontFamily: 'serif',
        spacing: 'comfortable'
      },
      source_image: null,
      inspired_by: 'Classic literature and timeless design',
      default_mode: 'light',
      tags: ['classic', 'timeless', 'elegant', 'professional']
    },
    {
      slug: 'keen-kip',
      label: 'Keen Kip',
      palette: {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1E293B',
        muted: '#64748B'
      },
      style: {
        borderRadius: '12px',
        fontFamily: 'sans-serif',
        spacing: 'modern'
      },
      source_image: null,
      inspired_by: 'Modern tech interfaces and clean design',
      default_mode: 'light',
      tags: ['modern', 'tech', 'clean', 'bright']
    },
    {
      slug: 'lowcountry-summer',
      label: 'Lowcountry Summer',
      palette: {
        primary: '#059669',
        secondary: '#F97316',
        accent: '#EC4899',
        background: '#FEF7ED',
        surface: '#FFF7ED',
        text: '#9A3412',
        muted: '#A16207'
      },
      style: {
        borderRadius: '16px',
        fontFamily: 'sans-serif',
        spacing: 'relaxed'
      },
      source_image: null,
      inspired_by: 'Southern coastal summers and warm hospitality',
      default_mode: 'light',
      tags: ['warm', 'coastal', 'summer', 'relaxed']
    },
    {
      slug: 'juke-joint',
      label: 'Juke Joint',
      palette: {
        primary: '#DC2626',
        secondary: '#7C3AED',
        accent: '#F59E0B',
        background: '#0F0F0F',
        surface: '#1A1A1A',
        text: '#F9FAFB',
        muted: '#9CA3AF'
      },
      style: {
        borderRadius: '4px',
        fontFamily: 'mono',
        spacing: 'tight'
      },
      source_image: null,
      inspired_by: 'Vintage music venues and late-night creativity',
      default_mode: 'dark',
      tags: ['dark', 'vintage', 'creative', 'bold']
    },
    {
      slug: 'diary-paper',
      label: 'Diary Paper',
      palette: {
        primary: '#8B5A3C',
        secondary: '#E3C5B5',
        accent: '#A6785A',
        background: '#FAF7F2',
        surface: '#FFFDF8',
        text: '#2E1A12',
        muted: '#9A8477'
      },
      style: {
        "surface.page": "hsl(35, 25%, 97%)",
        "surface.paper": "hsl(35, 15%, 96%)",
        "surface.panel": "hsl(35, 20%, 94%)",
        "surface.elevated": "hsl(35, 15%, 98%)",
        "ink.primary": "hsl(25, 30%, 25%)",
        "ink.secondary": "hsl(25, 20%, 45%)",
        "ink.tertiary": "hsl(25, 15%, 60%)",
        "ink.placeholder": "hsl(25, 10%, 70%)",
        "line.hairline": "hsl(25, 8%, 75%)",
        "line.ruled": "hsl(25, 8%, 75%)",
        "border.soft": "hsl(35, 10%, 85%)",
        "border.strong": "hsl(35, 15%, 80%)",
        "shadow.soft": "0 1px 3px hsl(35, 10%, 85%, 0.3), 0 1px 2px hsl(35, 10%, 85%, 0.2)",
        "focus.ring": "hsl(25, 40%, 50%)",
        "hover.surface": "hsl(35, 15%, 92%)",
        "press.surface": "hsl(35, 20%, 88%)",
        "radius.sheet": "6px",
        "space.framePadding": "1.5rem",
        "space.sheetPadding": "1rem"
      },
      source_image: null,
      inspired_by: 'Ruled diary paper with warm ink',
      default_mode: 'light',
      tags: ['diary', 'paper', 'warm', 'ink', 'v0-style']
    },
    {
      slug: 'gray-earth',
      label: 'Gray Earth',
      palette: {
        primary: '#3d3830',
        secondary: '#7a7268',
        accent: '#6b7355',
        background: '#f5f3ef',
        surface: '#edeae4',
        text: '#3d3830',
        muted: '#8a847a',
      },
      style: {
        "surface.page": "hsl(40, 10%, 96%)",
        "surface.paper": "hsl(38, 12%, 94%)",
        "surface.panel": "hsl(36, 14%, 92%)",
        "surface.elevated": "hsl(40, 8%, 98%)",
        "ink.primary": "hsl(30, 8%, 22%)",
        "ink.secondary": "hsl(30, 6%, 38%)",
        "ink.tertiary": "hsl(28, 5%, 52%)",
        "ink.placeholder": "hsl(28, 4%, 62%)",
        "line.hairline": "hsl(35, 8%, 78%)",
        "line.ruled": "hsl(35, 8%, 78%)",
        "border.soft": "hsl(36, 10%, 84%)",
        "border.strong": "hsl(34, 12%, 74%)",
        "shadow.soft": "0 1px 3px hsl(30, 10%, 20%, 0.08), 0 1px 2px hsl(30, 10%, 20%, 0.05)",
        "focus.ring": "hsl(75, 18%, 42%)",
        "hover.surface": "hsl(38, 12%, 90%)",
        "press.surface": "hsl(36, 14%, 86%)",
        "dialogue.userBg": "hsl(75, 22%, 38%)",
        "dialogue.agentBg": "hsl(38, 12%, 96%)",
        "dialogue.areaBg": "hsl(40, 10%, 94%)",
        "dialogue.border": "hsl(36, 10%, 82%)",
        "radius.sheet": "6px",
        "space.framePadding": "1.5rem",
        "space.sheetPadding": "1rem"
      },
      source_image: null,
      inspired_by: 'Muted stone and earth — universal default for new domains',
      default_mode: 'light',
      tags: ['earth', 'gray', 'neutral', 'default', 'v0-style']
    },
    {
      slug: 'neutral',
      label: 'Neutral',
      palette: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#999999',
        background: '#FFFFFF',
        surface: '#F8F8F8',
        text: '#000000',
        muted: '#666666'
      },
      style: {
        "surface.page": "hsl(0, 0%, 100%)",
        "surface.paper": "hsl(0, 0%, 98%)",
        "surface.panel": "hsl(0, 0%, 96%)",
        "surface.elevated": "hsl(0, 0%, 100%)",
        "ink.primary": "hsl(0, 0%, 9%)",
        "ink.secondary": "hsl(0, 0%, 45%)",
        "ink.tertiary": "hsl(0, 0%, 60%)",
        "ink.placeholder": "hsl(0, 0%, 65%)",
        "line.hairline": "hsl(0, 0%, 85%)",
        "line.ruled": "hsl(0, 0%, 85%)",
        "border.soft": "hsl(0, 0%, 90%)",
        "border.strong": "hsl(0, 0%, 80%)",
        "shadow.soft": "0 1px 3px hsl(0, 0%, 0%, 0.1), 0 1px 2px hsl(0, 0%, 0%, 0.06)",
        "focus.ring": "hsl(221, 83%, 53%)",
        "hover.surface": "hsl(0, 0%, 94%)",
        "press.surface": "hsl(0, 0%, 92%)",
        "radius.sheet": "6px",
        "space.framePadding": "1.5rem",
        "space.sheetPadding": "1rem"
      },
      source_image: null,
      inspired_by: 'Clean, neutral design for focused work',
      default_mode: 'light',
      tags: ['neutral', 'clean', 'minimal', 'v0-style']
    }
  ];

  for (const theme of themes) {
    await prisma.themes.upsert({
      where: { slug: theme.slug },
      update: {
        label: theme.label,
        palette: theme.palette,
        style: theme.style,
        source_image: theme.source_image,
        inspired_by: theme.inspired_by,
        default_mode: theme.default_mode,
        tags: theme.tags,
        updated_at: new Date()
      },
      create: {
        id: randomUUID(),
        ...theme,
        created_at: new Date(),
        updated_at: new Date()
      },
    });
    console.log(`✅ Theme upserted: ${theme.label} (${theme.slug})`);
  }

  console.log('🎉 Canonical themes seed completed');
}

// Export main function for use in seed runner
export default main;

