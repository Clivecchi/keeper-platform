/**
 * Object Glossary markdown — bundled for Vite.
 * Governing source: docs/keeper-object-glossary.md (not a Dialog Document).
 * Vercel ignores docs/ and *.md, so the web app imports a copy under this folder.
 * `pnpm --filter keeper-web run build` syncs the copy when docs/ is present.
 */
import objectGlossaryMarkdown from "./keeper-object-glossary.md?raw"

export const OBJECT_GLOSSARY_MARKDOWN: string = objectGlossaryMarkdown

export const OBJECT_GLOSSARY_TITLE = "Object Glossary"

export const OBJECT_GLOSSARY_SOURCE_REF = "docs/keeper-object-glossary.md"

/** GitHub blob on the Cloud branch — Design definition-ownership open-source action. */
export const OBJECT_GLOSSARY_SOURCE_URL =
  "https://github.com/Clivecchi/keeper-platform/blob/cloud/docs/keeper-object-glossary.md"
