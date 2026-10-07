/**
 * Domain catalog — shelves of what exists. Titles and counts, never bodies.
 * The database is the catalog. This is the shape a prompt and catalog.read share.
 */

export const CATALOG_SHELVES = [
  'dialog',
  'draft',
  'keeper',
  'journey',
  'moment',
  'library',
] as const;

export type CatalogShelf = (typeof CATALOG_SHELVES)[number];

export type DomainCatalogCounts = Record<CatalogShelf, number>;

export type CatalogShelfItem = {
  id: string;
  title: string;
  status?: string;
  kind?: string;
  updatedAt?: string;
  parentId?: string;
};

const SHELF_OPEN: Record<CatalogShelf, string> = {
  dialog: 'dialog.read { id } opens the Document',
  draft: 'draft.read { id } opens the Draft',
  keeper: 'keeper.read { keeperId } opens the Keeper',
  journey: 'journey.read { journeyId } opens the Journey',
  moment: 'moment.read { momentId } opens the Moment',
  library: 'library.read { query } searches Library text; library.read { id } opens one item',
};

export function isCatalogShelf(value: string): value is CatalogShelf {
  return (CATALOG_SHELVES as readonly string[]).includes(value);
}

export function formatDomainCatalogPrompt(input: {
  counts: DomainCatalogCounts | null;
  probeLine: string;
}): string {
  const lines = [
    'DOMAIN CATALOG — shelves for this Domain. Counts are what exists. Bodies are not loaded.',
    'Primary context is the Dialog you are in and the Document or Draft you are working on. Everything on a shelf is secondary.',
    'Find ids with catalog.read { shelf, query?, offset?, limit? }. Omit shelf to refresh counts. A page is titles and ids only.',
    'Open a body only with the read named for that shelf. Do not treat a title list as the content.',
  ];
  if (!input.counts) {
    lines.push('Counts are unavailable this turn. catalog.read still queries the database.');
  } else {
    for (const shelf of CATALOG_SHELVES) {
      lines.push(`- ${shelf}: ${input.counts[shelf]} — ${SHELF_OPEN[shelf]}`);
    }
  }
  lines.push(input.probeLine);
  lines.push('Library meaning search stays library.read. jev.probe does not replace it and does not maintain this catalog.');
  return lines.join('\n');
}
