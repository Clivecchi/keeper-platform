/**
 * Object Glossary for agents — same governing file Chronicle renders.
 * Not a Dialog Document and not a draft.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OBJECT_GLOSSARY_TITLE = 'Object Glossary';
export const OBJECT_GLOSSARY_SOURCE_REF = 'docs/keeper-object-glossary.md';

export const OBJECT_GLOSSARY_HONESTY =
  'The Object Glossary is Chronicle presence from docs/keeper-object-glossary.md — not a Dialog Document and not a draft. Empty Points on a draft titled Glossary are not the glossary.';

export type GlossarySection = {
  title: string;
  body: string;
};

export type ObjectGlossaryRead = {
  available: boolean;
  title: string;
  sourceRef: string;
  honesty: string;
  terms: string[];
  sections: Array<{ title: string; body: string }>;
};

const SKIP_TITLES = new Set([
  '📌 purpose',
  'how this glossary was built',
  '📆 update log',
  'update log',
]);

function resolveGlossaryPath(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), OBJECT_GLOSSARY_SOURCE_REF),
    resolve(here, '../../../../../', OBJECT_GLOSSARY_SOURCE_REF),
    resolve(here, '../../../../', OBJECT_GLOSSARY_SOURCE_REF),
    resolve(here, '../../../', OBJECT_GLOSSARY_SOURCE_REF),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function parseGlossarySections(markdown: string): GlossarySection[] {
  const sections: GlossarySection[] = [];
  let current: GlossarySection | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)\s*$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), body: '' };
      continue;
    }
    if (!current) continue;
    current.body = current.body ? `${current.body}\n${line}` : line;
  }
  if (current) sections.push(current);
  return sections.filter((section) => !SKIP_TITLES.has(section.title.toLowerCase()));
}

export function searchGlossarySections(
  sections: GlossarySection[],
  query: string,
  limit: number,
): GlossarySection[] {
  const needle = query.trim().toLowerCase();
  if (!needle || limit < 1) return [];

  return sections
    .map((section) => {
      const title = section.title.toLowerCase();
      const body = section.body.toLowerCase();
      let score = 0;
      if (title === needle) score = 100;
      else if (title.includes(needle)) score = 80;
      else if (body.includes(needle)) score = 20;
      return { section, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => ({
      title: row.section.title,
      body: row.section.body.trim().slice(0, 2400),
    }));
}

let cachedMarkdown: string | null | undefined;

function loadGlossaryMarkdown(): string | null {
  if (cachedMarkdown !== undefined) return cachedMarkdown;
  const filePath = resolveGlossaryPath();
  if (!filePath) {
    cachedMarkdown = null;
    return null;
  }
  try {
    cachedMarkdown = readFileSync(filePath, 'utf8');
    return cachedMarkdown;
  } catch {
    cachedMarkdown = null;
    return null;
  }
}

export function readObjectGlossary(params: {
  query?: string;
  limit?: number;
}): ObjectGlossaryRead {
  const markdown = loadGlossaryMarkdown();
  const sections = markdown ? parseGlossarySections(markdown) : [];
  const query = params.query?.trim() ?? '';
  const limit = params.limit && params.limit >= 1 ? Math.min(params.limit, 20) : 8;

  return {
    available: Boolean(markdown),
    title: OBJECT_GLOSSARY_TITLE,
    sourceRef: OBJECT_GLOSSARY_SOURCE_REF,
    honesty: OBJECT_GLOSSARY_HONESTY,
    terms: sections.map((section) => section.title),
    sections: query ? searchGlossarySections(sections, query, limit) : [],
  };
}
