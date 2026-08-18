/**
 * Keep the in-app glossary bundle in sync with docs/keeper-object-glossary.md.
 * Vercel ignores docs/ and *.md, so the web app ships a copy under src/v0/glossary/.
 * Local / full-repo builds refresh that copy when the docs file is present.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "../../..")
const source = path.join(repoRoot, "docs", "keeper-object-glossary.md")
const dest = path.join(scriptDir, "../src/v0/glossary/keeper-object-glossary.md")

if (fs.existsSync(source)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(source, dest)
  console.log("[sync-object-glossary] copied docs/keeper-object-glossary.md → apps/web bundle")
  process.exit(0)
}

if (fs.existsSync(dest)) {
  console.log("[sync-object-glossary] docs/ missing (Vercel ignore); using bundled copy")
  process.exit(0)
}

console.error("[sync-object-glossary] Object Glossary markdown not found at", source, "or", dest)
process.exit(1)
