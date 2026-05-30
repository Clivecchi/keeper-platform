/**
 * Universal Chronicle Config — shared save status and entity kinds.
 */

export type ChronicleSaveStatus = "idle" | "saving" | "saved" | "error"

/** Entity kinds that Chronicle Config Mode can persist via targeted PATCH routes. */
export type ChronicleEntityKind =
  | "agent"
  | "domain"
  | "journey"
  | "moment"
  | "keeper"
  | "draft"
  | "dialog"
  | "service"
  | "frame"
  | "boardDef"

export interface ChronicleSaveResult {
  status: ChronicleSaveStatus
  message: string | null
  fieldErrors?: Record<string, string>
}
