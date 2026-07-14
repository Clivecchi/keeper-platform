import type { ChronicleDocument } from "@keeper/shared"

/** Synthetic ChronicleDocument — Library shared-context roadmap status (no DB row). */
export function buildLibraryRoadmapDocument(): ChronicleDocument {
  return {
    identity: {
      label: "Library",
      subtitle: "Shared context",
    },
    title: "Library — connective index (in progress)",
    lede: "Five stores today; Library is becoming the read/search surface for domain reference material.",
    body: {
      text: [
        "Completed in this sequence: domain permissions, legacy /library retired, Chronicle registry pilot, subject/overlay shim, read/search API.",
        "Next: library.read for Kip, scoped MCP tools, ownership decision (index vs uploads-only), AGENTS.md update.",
        "Gloss rule: ephemeral diagnostics use message-anchored gloss; anything that must survive a session promotes to LibraryItem.",
      ].join("\n\n"),
      clampLines: 10,
      expandable: true,
    },
    status: { label: "Planning → building", tone: "pending" },
  }
}
