import type { GlossAnchor, GlossContentSnapshot } from "@keeper/shared"

/** Short instructive text for the Gloss affordance tooltip. */
export function describeGlossHint(
  anchor: GlossAnchor,
  snapshot?: GlossContentSnapshot,
): string {
  const node = anchor.nodeId ?? "content"

  if (node === "body") {
    return "Discuss message"
  }

  if (node === "image") {
    return "Discuss just the image — look, mood, or visual changes."
  }

  if (node === "caption") {
    return "Discuss the caption — the prompt or description text."
  }

  if (node === "card") {
    if (anchor.entityKind === "moment") {
      return "Discuss this Moment — title, narrative, and card together."
    }
    if (snapshot?.imageUrl || anchor.entityKind === "library") {
      return "Discuss the whole receipt — image, caption, and actions together."
    }
    return "Discuss everything in this card."
  }

  if (anchor.entityKind === "draft" && anchor.nodeId) {
    return "Discuss this draft point."
  }

  if (anchor.entityKind === "moment") {
    return "Discuss this Moment."
  }

  return "Discuss this selection — conversation stays here in context."
}
