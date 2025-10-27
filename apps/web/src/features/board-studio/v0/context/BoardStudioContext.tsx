"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { apiFetch } from '../../../../lib/api'
import type { StudioBoard, StudioFrame } from '../types'

export type BoardStudioMode = 'studio' | 'preview'

interface BoardStudioContextValue {
  // Mode state
  mode: BoardStudioMode
  setMode: (mode: BoardStudioMode) => void

  // Board state
  board: StudioBoard | null
  setBoard: (board: StudioBoard) => void
  
  // Frame state
  frames: StudioFrame[]
  activeFrameId: string | null
  setActiveFrame: (frameId: string | null) => void
  
  // Board ID
  boardId: string | null
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  
  // CRUD operations
  addFrame: () => Promise<void>
  updateFrame: (frameId: string, updates: Partial<StudioFrame>) => Promise<void>
  removeFrame: (frameId: string) => Promise<void>
  addPropToFrame: (frameId: string, propType: string, propConfig?: Record<string, any>) => Promise<void>
  
  // Board operations
  loadBoard: (boardId: string) => Promise<void>
  saveBoard: () => Promise<void>
}

const BoardStudioContext = createContext<BoardStudioContextValue | undefined>(undefined)

export function useBoardStudio() {
  const context = useContext(BoardStudioContext)
  if (!context) {
    throw new Error('useBoardStudio must be used within BoardStudioProvider')
  }
  return context
}

interface BoardStudioProviderProps {
  children: ReactNode
  initialBoard?: StudioBoard
  initialBoardId?: string
}

export function BoardStudioProvider({ 
  children, 
  initialBoard,
  initialBoardId 
}: BoardStudioProviderProps) {
  const [mode, setMode] = useState<BoardStudioMode>('studio')
  const [board, setBoard] = useState<StudioBoard | null>(initialBoard || null)
  const [activeFrameId, setActiveFrameId] = useState<string | null>(
    initialBoard?.frames[0]?.id || null
  )
  const [boardId, setBoardId] = useState<string | null>(initialBoardId || initialBoard?.id || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const frames = board?.frames || []

  const loadBoard = useCallback(async (id: string) => {
    if (!id || id === 'new-board') return
    
    setIsLoading(true)
    try {
      const payload = await apiFetch(`/api/board-data/${id}`)
      const boardData = payload?.data?.board || payload
      setBoard(boardData)
      setBoardId(id)
      setActiveFrameId(boardData.frames?.[0]?.id || null)
      console.log('✅ Board loaded successfully:', id)
    } catch (error) {
      console.error('❌ Error loading board:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveBoard = useCallback(async () => {
    if (!boardId || boardId === 'new-board' || !board) return
    
    setIsSaving(true)
    try {
      const boardMetadata = {
        name: board.name,
        description: board.description,
      }
      
      await apiFetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardMetadata),
      })
      console.log('✅ Board metadata saved successfully')
    } catch (error) {
      console.error('❌ Error saving board:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [boardId, board])

  const addFrame = useCallback(async () => {
    if (!boardId || boardId === 'new-board' || !board) {
      console.warn('Cannot add frame: no valid boardId')
      return
    }

    const tempId = `temp-frame-${Date.now()}`
    const newFrame: StudioFrame = {
      id: tempId,
      name: `Frame ${frames.length + 1}`,
      role: 'custom',
      pattern: 'canvas',
      props: []
    }
    
    // Optimistic update
    setBoard(prev => prev ? ({
      ...prev,
      frames: [...prev.frames, newFrame]
    }) : null)
    
    try {
      const response = await apiFetch(`/api/boards/${boardId}/frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFrame.name,
          pattern: newFrame.pattern,
          frameType: 'media_card',
          orderIndex: frames.length
        })
      })
      
      if (response.success && response.data) {
        // Replace temp ID with real server ID
        setBoard(prev => prev ? ({
          ...prev,
          frames: prev.frames.map(f => 
            f.id === tempId ? { 
              ...f, 
              id: response.data.id,
              name: response.data.name,
              pattern: response.data.pattern 
            } : f
          )
        }) : null)
        
        // Set the new frame as active
        setActiveFrameId(response.data.id)
        console.log('✅ Frame created and persisted:', response.data.id)
      }
    } catch (error) {
      console.error('❌ Failed to create frame:', error)
      // Revert optimistic update on error
      setBoard(prev => prev ? ({
        ...prev,
        frames: prev.frames.filter(f => f.id !== tempId)
      }) : null)
      throw error
    }
  }, [boardId, board, frames])

  const updateFrame = useCallback(async (frameId: string, updates: Partial<StudioFrame>) => {
    // Optimistic update
    setBoard(prev => prev ? ({
      ...prev,
      frames: prev.frames.map(frame => 
        frame.id === frameId ? { ...frame, ...updates } : frame
      )
    }) : null)
    
    // Persist to backend
    if (boardId && boardId !== 'new-board') {
      try {
        const response = await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        
        if (response.success && response.data) {
          // Update with server response to ensure consistency
          setBoard(prev => prev ? ({
            ...prev,
            frames: prev.frames.map(frame => 
              frame.id === frameId ? { 
                ...frame, 
                ...updates,
                name: response.data.name || frame.name,
                pattern: response.data.pattern || frame.pattern,
                props: response.data.props || frame.props
              } : frame
            )
          }) : null)
          console.log('✅ Frame updated and persisted:', frameId)
        }
      } catch (error) {
        console.error('❌ Failed to update frame:', error)
        throw error
      }
    }
  }, [boardId])

  const removeFrame = useCallback(async (frameId: string) => {
    if (!board) return
    
    const frame = board.frames.find(f => f.id === frameId)
    if (!frame) return
    
    // Prevent deletion of cover and settings frames
    if (frame.role === 'cover' || frame.role === 'settings') {
      alert('Cannot delete default frames (Cover/Settings)')
      return
    }
    
    if (!confirm(`Delete frame "${frame.name}"?`)) return
    
    const originalFrames = board.frames
    
    // Optimistic update
    setBoard(prev => prev ? ({
      ...prev,
      frames: prev.frames.filter(f => f.id !== frameId)
    }) : null)
    
    // Switch to first frame if deleting active frame
    if (activeFrameId === frameId) {
      const remainingFrames = originalFrames.filter(f => f.id !== frameId)
      setActiveFrameId(remainingFrames[0]?.id || null)
    }
    
    // Persist to backend
    if (boardId && boardId !== 'new-board') {
      try {
        await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'DELETE'
        })
        console.log('✅ Frame deleted:', frameId)
      } catch (error) {
        console.error('❌ Failed to delete frame:', error)
        // Revert optimistic update on error
        setBoard(prev => prev ? ({
          ...prev,
          frames: originalFrames
        }) : null)
        throw error
      }
    }
  }, [board, boardId, activeFrameId])

  const addPropToFrame = useCallback(async (
    frameId: string, 
    propType: string, 
    propConfig?: Record<string, any>
  ) => {
    if (!board) return
    
    const frame = board.frames.find(f => f.id === frameId)
    if (!frame) {
      console.warn('Frame not found:', frameId)
      return
    }

    const newProp = {
      id: `prop-${Date.now()}`,
      type: propType,
      config: propConfig || (propType === 'token' ? {
        displayName: 'AI Assistant',
        avatarUrl: '/placeholder.svg',
        personaNote: 'Helpful AI assistant',
      } : {})
    }
    
    const updatedProps = [...frame.props, newProp]
    
    // Optimistic update
    setBoard(prev => prev ? ({
      ...prev,
      frames: prev.frames.map(f => 
        f.id === frameId 
          ? { ...f, props: updatedProps }
          : f
      )
    }) : null)
    
    // Persist to backend
    if (boardId && boardId !== 'new-board') {
      try {
        const response = await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ props: updatedProps })
        })
        
        if (response.success) {
          console.log('✅ Props persisted to server for frame:', frameId)
        }
      } catch (error) {
        console.error('❌ Failed to update frame props:', error)
        // Revert optimistic update on error
        setBoard(prev => prev ? ({
          ...prev,
          frames: prev.frames.map(f => 
            f.id === frameId ? { ...f, props: frame.props } : f
          )
        }) : null)
        throw error
      }
    }
  }, [board, boardId])

  const value: BoardStudioContextValue = {
    mode,
    setMode,
    board,
    setBoard,
    frames,
    activeFrameId,
    setActiveFrame: setActiveFrameId,
    boardId,
    isLoading,
    isSaving,
    addFrame,
    updateFrame,
    removeFrame,
    addPropToFrame,
    loadBoard,
    saveBoard,
  }

  return (
    <BoardStudioContext.Provider value={value}>
      {children}
    </BoardStudioContext.Provider>
  )
}


