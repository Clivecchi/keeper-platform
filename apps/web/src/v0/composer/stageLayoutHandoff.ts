/**
 * A Lead `stage.story.layout` writes the domain filmstrip.
 * It does not create or update a Story.
 * The receipt's titles are the link back to the turn. Slide bodies stay on the filmstrip.
 */

export type StageLayoutReceipt = {
  messageId: string
  titles: string[]
}

type LayoutAction = {
  type?: string
  status?: string
  data?: unknown
}

export type LayoutMessage = {
  id: string
  actionResults?: readonly LayoutAction[] | null
}

export type StageCanvasReading = "filmstrip" | "frame" | "stale" | "empty"

const LAYOUT_ACTION = "stage.story.layout"

function titlesFrom(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return []
  const titles = (data as { titles?: unknown }).titles
  if (!Array.isArray(titles)) return []
  return titles
    .filter((title): title is string => typeof title === "string" && title.trim().length > 0)
    .map((title) => title.trim())
}

export function readStageLayoutReceipt(message: LayoutMessage): StageLayoutReceipt | null {
  const action = message.actionResults?.find(
    (row) => row.type === LAYOUT_ACTION && row.status === "success",
  )
  if (!action) return null
  const titles = titlesFrom(action.data)
  if (titles.length === 0) return null
  return { messageId: message.id, titles }
}

export function filmstripMatchesLayout(
  receipt: StageLayoutReceipt,
  slides: readonly { title: string }[],
): boolean {
  if (slides.length !== receipt.titles.length || slides.length === 0) return false
  return receipt.titles.every((title, index) => slides[index]?.title === title)
}

export function classifyStageLayout(input: {
  messages: readonly LayoutMessage[]
  slides: readonly { title: string }[]
}): { current: StageLayoutReceipt | null; stale: StageLayoutReceipt | null } {
  if (input.slides.length === 0) return { current: null, stale: null }
  let latest: StageLayoutReceipt | null = null
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index]
    if (!message) continue
    const receipt = readStageLayoutReceipt(message)
    if (!receipt) continue
    if (!latest) latest = receipt
    if (filmstripMatchesLayout(receipt, input.slides)) {
      return { current: receipt, stale: null }
    }
  }
  return { current: null, stale: latest }
}

/**
 * The filmstrip wins over an older Frame. A Frame composed after the layout wins.
 */
export function stageCanvasReading(input: {
  messages: readonly { id: string }[]
  current: StageLayoutReceipt | null
  stale: StageLayoutReceipt | null
  performedMessageId: string | null
}): StageCanvasReading {
  const frameId = input.performedMessageId?.trim() || ""
  const frameIndex = frameId
    ? input.messages.findIndex((message) => message.id === frameId)
    : -1
  if (input.current) {
    if (frameIndex >= 0) {
      const layoutIndex = input.messages.findIndex((message) => message.id === input.current?.messageId)
      if (frameIndex > layoutIndex) return "frame"
    }
    return "filmstrip"
  }
  if (frameIndex >= 0) return "frame"
  if (input.stale) return "stale"
  return "empty"
}

/** Keep this sentence identical to `stageLayoutReceiptMessage` in the API. */
export function stageLayoutReceiptMessage(slideCount: number): string {
  const count = Number.isFinite(slideCount) ? Math.max(0, Math.floor(slideCount)) : 0
  const label = count === 1 ? "1 Slide" : `${count} Slides`
  return `Laid out ${label} on the Stage filmstrip. No Story was saved. This receipt does not verify what is on screen.`
}
