import React from 'react'
import type { StyleId } from './styles'
import { getStyleVars } from './styles'

interface StyleScopeProps {
  styleId: StyleId
  children: React.ReactNode
}

export function StyleScope({ styleId, children }: StyleScopeProps) {
  const styleVars = getStyleVars(styleId)

  return (
    <div
      className="v0-style-scope"
      style={styleVars}
    >
      {children}
    </div>
  )
}