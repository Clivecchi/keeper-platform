import * as React from "react"
import type { BoardMobilePanelId } from "../types/boardMobilePanel"

export interface UseBoardMobilePanelFocusOptions {
  /** When a Chronicle Act opens, focus Chronicle automatically. */
  chronicleEngagementActive: boolean
  initialPanel?: BoardMobilePanelId
}

export function useBoardMobilePanelFocus({
  chronicleEngagementActive,
  initialPanel = "dialog",
}: UseBoardMobilePanelFocusOptions) {
  const [activePanel, setActivePanel] = React.useState<BoardMobilePanelId>(initialPanel)

  React.useEffect(() => {
    if (chronicleEngagementActive) {
      setActivePanel("chronicle")
    }
  }, [chronicleEngagementActive])

  return { activePanel, setActivePanel }
}
