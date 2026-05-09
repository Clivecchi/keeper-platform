/**
 * useKipSession — deprecated alias for useAgentDialog.
 *
 * All call sites have been migrated to useAgentDialog.
 * This re-export is kept for backward compatibility only and will be removed
 * in a future cleanup pass.
 */

export type { ExperienceContext, IdeFrameContextLike } from "./useAgentDialog"
export { useAgentDialog as useKipSession } from "./useAgentDialog"

// Legacy type aliases — callers that destructure kipAgentId must migrate to agentId.
export type {
  UseAgentDialogOptions as UseKipSessionOptions,
  UseAgentDialogResult as UseKipSessionResult,
} from "./useAgentDialog"
