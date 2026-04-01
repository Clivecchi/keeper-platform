export type StoryFieldType =
  | "text"
  | "color"
  | "wordchoice"
  | "pills"
  | "readonly"

export interface StoryField {
  id: string
  type: StoryFieldType
  value: string | string[]
  /** For wordchoice — the available options */
  options?: string[]
  /** For pills — the full available set */
  availableOptions?: string[]
  /** Display size hint for text fields (approximate character width) */
  size?: number
}

export interface StoryChapter {
  id: string
  label: string
  /**
   * Accent color for the grace note and chapter identity.
   * Passed in by the parent — StoryScroll does not invent theme colors.
   */
  accentColor: string
  /** Narrative template with `{fieldId}` placeholders */
  narrative: string
  fields: StoryField[]
}

export interface StoryScrollSchema {
  chapters: StoryChapter[]
}

export interface StoryScrollChanges {
  [fieldId: string]: string | string[]
}

export interface StoryScrollProps {
  schema: StoryScrollSchema
  /** Fired after every edit with the full accumulated changes map */
  onChange?: (changes: StoryScrollChanges) => void
  kipPlaceholder?: string
  /** If set, invoked on send; otherwise `onKipMessage` */
  sendPrompt?: (message: string) => void | Promise<void>
  onKipMessage?: (message: string) => void
  /** Root height; defaults to a sensible min height for embeds */
  className?: string
}
