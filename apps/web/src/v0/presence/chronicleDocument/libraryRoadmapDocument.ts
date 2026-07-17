import {
  buildEphemeralSyntheticGlossAnchor,
  type Document,
} from "@keeper/shared"

const ROADMAP_STABLE_KEY = "library-roadmap"

/** Synthetic Document — Library shared-context roadmap status (no DB row). */
export function buildLibraryRoadmapDocument(): Document {
  const title = "Library — connective index (in progress)"
  const bodyText = [
    "Completed in this sequence: domain permissions, legacy /library retired, Chronicle registry pilot, subject/overlay shim, read/search API.",
    "Next: library.read for Kip, scoped MCP tools, ownership decision (index vs uploads-only), AGENTS.md update.",
    "Gloss rule: ephemeral diagnostics use message-anchored gloss; anything that must survive a session promotes to LibraryItem.",
  ].join("\n\n")

  return {
    identity: {
      label: "Library",
      subtitle: "Shared context",
    },
    title,
    lede: "Five stores today; Library is becoming the read/search surface for domain reference material.",
    body: {
      text: bodyText,
      clampLines: 10,
      expandable: true,
    },
    status: { label: "Planning → building", tone: "pending" },
    gloss: {
      anchor: buildEphemeralSyntheticGlossAnchor({
        stableKey: ROADMAP_STABLE_KEY,
        messageId: ROADMAP_STABLE_KEY,
        entityId: ROADMAP_STABLE_KEY,
      }),
      snapshot: { label: title, text: bodyText },
    },
  }
}
