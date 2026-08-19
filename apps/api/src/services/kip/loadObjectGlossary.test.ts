import { describe, expect, it } from 'vitest';
import {
  OBJECT_GLOSSARY_HONESTY,
  parseGlossarySections,
  readObjectGlossary,
  searchGlossarySections,
} from './loadObjectGlossary.js';

const SAMPLE = `
# Keeper Object Glossary

## Dialog

A container of sessions with a Document.

## Session (\`kip_sessions\`)

An agent chat session row.

## 📆 Update Log

### 2026-08-18
`;

describe('parseGlossarySections', () => {
  it('indexes h2 terms and skips the update log', () => {
    const sections = parseGlossarySections(SAMPLE);
    expect(sections.map((section) => section.title)).toEqual([
      'Dialog',
      'Session (`kip_sessions`)',
    ]);
    expect(sections[0]?.body).toContain('container of sessions');
  });
});

describe('searchGlossarySections', () => {
  it('prefers an exact title match', () => {
    const sections = parseGlossarySections(SAMPLE);
    const hits = searchGlossarySections(sections, 'dialog', 4);
    expect(hits[0]?.title).toBe('Dialog');
  });
});

describe('readObjectGlossary', () => {
  it('returns Chronicle honesty and can load the governing file', () => {
    const index = readObjectGlossary({});
    expect(index.honesty).toBe(OBJECT_GLOSSARY_HONESTY);
    expect(index.title).toBe('Object Glossary');
    expect(index.sourceRef).toBe('docs/keeper-object-glossary.md');
    if (index.available) {
      expect(index.terms.some((term) => /dialog/i.test(term))).toBe(true);
      const hit = readObjectGlossary({ query: 'Dialog', limit: 3 });
      expect(hit.sections.length).toBeGreaterThan(0);
      expect(hit.sections[0]?.title.toLowerCase()).toContain('dialog');
    }
  });
});
