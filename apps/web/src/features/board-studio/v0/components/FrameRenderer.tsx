"use client"

import React from 'react'
import PatternRenderer from '../../patterns/PatternRenderer'
import type { StudioFrame, StudioBoard } from '../types'
import type { BoardStudioMode } from '../context/BoardStudioContext'

export interface FrameRendererProps {
  frame: StudioFrame
  mode: BoardStudioMode
  isActive: boolean
  onSelect: () => void
  boardName?: string
  boardDescription?: string
  boardData?: StudioBoard
  frames?: StudioFrame[]
  onFrameUpdate?: (frameId: string, updates: Partial<StudioFrame>) => void
  onBoardUpdate?: (updates: any) => Promise<void>
}

/**
 * FrameRenderer - Unified frame rendering component
 * 
 * This component renders a frame in both studio and preview modes.
 * - In studio mode: Shows the frame with authoring chrome (outline, hover, drag affordances)
 * - In preview mode: Shows the frame without any editing affordances
 * 
 * The actual frame content is always rendered using PatternRenderer, ensuring
 * visual consistency between modes.
 */
export function FrameRenderer({
  frame,
  mode,
  isActive,
  onSelect,
  boardName,
  boardDescription,
  boardData,
  frames,
  onFrameUpdate,
  onBoardUpdate,
}: FrameRendererProps) {
  // Convert our mode to PatternRenderer's mode
  // In studio mode, we use 'edit' for PatternRenderer to enable editing features
  // In preview mode, we use 'preview' for PatternRenderer
  const patternMode = mode === 'studio' ? 'edit' : 'preview'

  const handleClick = (e: React.MouseEvent) => {
    // Only handle selection in studio mode
    if (mode === 'studio') {
      e.stopPropagation()
      onSelect()
    }
  }

  if (mode === 'preview') {
    // Preview mode: render frame without any chrome
    return (
      <div className="w-full">
        <PatternRenderer
          frame={{
            id: frame.id,
            name: frame.name,
            pattern: frame.pattern,
            frameType: 'media_card', // Default frameType
            layoutKind: 'standard',
            layoutData: {},
            props: frame.props as any, // PatternRenderer expects this type
            role: frame.role,
          }}
          mode={patternMode}
          boardName={boardName}
          boardDescription={boardDescription}
          boardData={boardData}
          frames={frames}
          onFrameUpdate={onFrameUpdate}
          onBoardUpdate={onBoardUpdate}
        />
      </div>
    )
  }

  // Studio mode: render frame with authoring chrome
  return (
    <div
      className={`
        w-full transition-all duration-200 cursor-pointer
        ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : 'hover:ring-2 hover:ring-gray-300 rounded-lg'}
      `}
      onClick={handleClick}
    >
      {/* Optional: Frame label in studio mode */}
      {isActive && (
        <div className="mb-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-t-lg inline-block">
          {frame.name}
        </div>
      )}
      
      <div className={`relative ${isActive ? 'p-1' : ''}`}>
        <PatternRenderer
          frame={{
            id: frame.id,
            name: frame.name,
            pattern: frame.pattern,
            frameType: 'media_card',
            layoutKind: 'standard',
            layoutData: {},
            props: frame.props as any,
            role: frame.role,
          }}
          mode={patternMode}
          boardName={boardName}
          boardDescription={boardDescription}
          boardData={boardData}
          frames={frames}
          onFrameUpdate={onFrameUpdate}
          onBoardUpdate={onBoardUpdate}
        />
        
        {/* Drag handle (if needed in future) */}
        {isActive && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-500 shadow-sm">
            Active
          </div>
        )}
      </div>
    </div>
  )
}


