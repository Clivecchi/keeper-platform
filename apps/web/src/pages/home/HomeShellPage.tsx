"use client"

import * as React from "react"
import { V0Shell } from "../../v0/shell/V0Shell"
import { KipChatDrawerProvider } from "../../v0/components/KipChatDrawer"

/** User-scoped Home — one Realm per user at `/home` (no domain slug in URL). */
const HomeShellPage: React.FC = () => {
  return (
    <KipChatDrawerProvider>
      <V0Shell mode="home" />
    </KipChatDrawerProvider>
  )
}

export default HomeShellPage
