import { PrismaClient } from '@prisma/client';

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

// Run if called directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error seeding themes:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
