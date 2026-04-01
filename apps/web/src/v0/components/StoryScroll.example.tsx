/**
 * StoryScroll — parent usage example (documentation only).
 *
 * This module is not imported by any route. It shows the contract:
 * - `schema` drives chapters, narrative placeholders, and fields.
 * - `accentColor` on each chapter comes from the parent’s theme (or any source).
 * - `onChange` receives the full cumulative edit buffer after every change.
 * - StoryScroll does not persist; the host decides when to commit.
 */

import * as React from "react"
import { StoryScroll } from "./StoryScroll"
import type { StoryScrollChanges, StoryScrollSchema } from "./StoryScroll.types"

/**
 * Example host: accents pretend to come from `domainFrame.theme.colors`
 * (or any other theme source). StoryScroll stays agnostic.
 */
export function ExampleStoryScrollHost() {
  const themePrimary = "#2d6a7f"
  const themeAccent = "#b8963e"

  const schema: StoryScrollSchema = {
    chapters: [
      {
        id: "opening",
        label: "Opening",
        accentColor: themePrimary,
        narrative:
          "We call this place {placeName}. Light falls across it as {moodWord}, and the walls remember {toneColor}.",
        fields: [
          { id: "placeName", type: "text", value: "the studio", size: 14 },
          {
            id: "moodWord",
            type: "wordchoice",
            value: "gentle",
            options: ["gentle", "sharp", "quiet"],
          },
          { id: "toneColor", type: "color", value: "#fdfaf4" },
        ],
      },
      {
        id: "cadence",
        label: "Cadence",
        accentColor: themeAccent,
        narrative: "Visitors arrive as {roles}, carrying {note} with them.",
        fields: [
          {
            id: "roles",
            type: "pills",
            value: ["guests", "keepers"],
            availableOptions: ["guests", "keepers", "admins"],
          },
          { id: "note", type: "readonly", value: "unfinished questions" },
        ],
      },
    ],
  }

  const [changes, setChanges] = React.useState<StoryScrollChanges>({})

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <StoryScroll
        schema={schema}
        onChange={setChanges}
        kipPlaceholder="Ask about this story…"
        onKipMessage={(msg) => console.info("[example] Kip message:", msg)}
      />
      <pre className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {JSON.stringify(changes, null, 2)}
      </pre>
    </div>
  )
}
