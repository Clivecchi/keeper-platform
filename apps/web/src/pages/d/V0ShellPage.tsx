"use client"

import * as React from "react"
import { V0Shell } from "../../v0/shell/V0Shell"
import { KipChatDrawerProvider } from "../../v0/components/KipChatDrawer"

const V0ShellPage: React.FC = () => {
  return (
    <KipChatDrawerProvider>
      <V0Shell />
    </KipChatDrawerProvider>
  )
}

export default V0ShellPage
