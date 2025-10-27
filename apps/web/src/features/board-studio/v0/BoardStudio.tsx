"use client"

import React, { useState, useEffect } from "react"
import { apiFetch } from "../../../lib/api"
import { Button } from "./components/ui/button"
import { ScrollArea } from "./components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu"
import {
  Plus,
  ImageIcon,
  Type,
  Book,
  Cog,
  ChevronDown,
  Sparkles,
  Eye,
  Video,
  Image,
  MousePointer,
  Bot,
  ArrowLeft,
} from "lucide-react"
import { BoardStudioProvider, useBoardStudio } from "./context/BoardStudioContext"
import { FrameRenderer } from "./components/FrameRenderer"
import { FrameConfigPanel } from "./components/FrameConfigPanel"
import type { StudioBoard, StudioFrame } from "./types"

interface BoardStudioProps {
  boardId?: string;
  initialBoard?: StudioBoard;
}

// Props Library Categories - Exact V0 structure
const PROPS_LIBRARY = {
  Media: [
    { id: 'hero-image', name: 'Hero Image', description: 'Large featured image', type: 'image', icon: Image },
    { id: 'video-player', name: 'Video Player', description: 'Embedded video content', type: 'media', icon: Video },
    { id: 'image-gallery', name: 'Image Gallery', description: 'Collection of images', type: 'image', icon: ImageIcon },
  ],
  Content: [
    { id: 'heading', name: 'Heading', description: 'Title or section header', type: 'text', icon: Type },
    { id: 'text-block', name: 'Text Block', description: 'Body text content', type: 'text', icon: Type },
    { id: 'quote', name: 'Quote', description: 'Highlighted testimonial', type: 'text', icon: Type },
  ],
  Interactive: [
    { id: 'action-button', name: 'Action Button', description: 'Clickable call-to-action', type: 'button', icon: MousePointer },
    { id: 'form', name: 'Form', description: 'Input collection interface', type: 'form', icon: Type },
  ],
  AI: [
    { id: 'ai-assistant', name: 'AI Assistant', description: 'Conversational AI interface', type: 'token', icon: Bot },
  ],
};

// Internal component that uses the context
function BoardStudioContent() {
  const {
    mode,
    setMode,
    board,
    setBoard,
    frames,
    activeFrameId,
    setActiveFrame,
    isLoading,
    addFrame,
    updateFrame,
    removeFrame,
    addPropToFrame,
    boardId,
  } = useBoardStudio()

  const [agentMode, setAgentMode] = useState<boolean>(false)
  const [authRequired, setAuthRequired] = useState(false)
  const [noAhb, setNoAhb] = useState(false)

  // Parity loader: allow agentId query to drive Studio via /api/board-data/agents/:agentId/home
  useEffect(() => {
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const agentId = search?.get('agentId') || ''
    if (!agentId) return

    const loadFromAgent = async () => {
      setAuthRequired(false)
      setNoAhb(false)
      try {
        const data = await apiFetch(`/api/board-data/agents/${agentId}/home`)
        const bid = data?.boardId || null
        if (!bid) {
          setNoAhb(true)
          return
        }
        console.info('[Studio] Loaded Agent Home Board', { boardId: bid })
        // Note: loadBoard should be handled by the parent component's initial load
      } catch (e: any) {
        if (e?.status === 401) {
          setAuthRequired(true)
          return
        }
        console.error('[Studio] parity load error', e)
      }
    }
    loadFromAgent()
  }, [])

  const activeFrame = frames.find(f => f.id === activeFrameId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Studio/Preview Mode */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Keeper</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <span className="text-sm text-gray-600">Board Studio</span>
            {board && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-medium text-gray-900">{board.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {mode === 'studio' ? (
              <>
                <Button
                  onClick={addFrame}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Frame
                </Button>
                <Button
                  onClick={() => setMode('preview')}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Kip Assist
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setMode('studio')}
                variant="default"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Studio
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Sidebar - Only in Studio Mode */}
        {mode === 'studio' && (
          <aside className="w-64 bg-white border-r">
            <div className="p-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Boards</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Current Board */}
                {board && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">{board.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{frames.length} frames</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white">
          {/* Frame Tabs - Only in Studio Mode */}
          {mode === 'studio' && (
            <div className="border-b bg-white">
              <div className="flex items-center px-4 py-2 gap-1">
                {frames.map((frame) => (
                  <div key={frame.id} className="flex items-center">
                    <Button
                      variant={activeFrameId === frame.id ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setActiveFrame(frame.id)}
                    >
                      <span>{frame.name}</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                          <Cog className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem 
                          onClick={() => setActiveFrame(frame.id)}
                        >
                          Configure
                        </DropdownMenuItem>
                        {frame.role !== 'cover' && frame.role !== 'settings' && (
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => removeFrame(frame.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-50 overflow-auto">
            <div className="h-full flex items-center justify-center p-8">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading board...</p>
                </div>
              ) : authRequired ? (
                <div className="text-center text-gray-600">
                  <p>Please sign in to view this board.</p>
                </div>
              ) : noAhb ? (
                <div className="text-center text-gray-600">
                  <p>No Agent Home Board for this agent.</p>
                </div>
              ) : !activeFrame ? (
                <div className="text-center text-gray-600">
                  <p>Select or create a frame to get started</p>
                  <Button
                    onClick={addFrame}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Frame
                  </Button>
                </div>
              ) : (
                <div className="w-full">
                  <FrameRenderer
                    frame={activeFrame}
                    mode={mode}
                    isActive={true}
                    onSelect={() => setActiveFrame(activeFrame.id)}
                    boardName={board?.name}
                    boardDescription={board?.description}
                    boardData={board || undefined}
                    frames={frames}
                    onFrameUpdate={updateFrame}
                    onBoardUpdate={async (updates) => {
                      if (board) {
                        setBoard({ ...board, ...updates })
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Props Library (Studio Mode) or Frame Config Panel */}
        {mode === 'studio' && (
          <aside className="w-80 bg-white border-l">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Props Library</h3>
                <span className="text-xs text-gray-500">Click to add to frame</span>
              </div>
              
              {!activeFrameId && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    Select a frame to add props
                  </p>
                </div>
              )}
              
              {activeFrameId && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    Adding to: <span className="font-medium">{activeFrame?.name || 'Unknown'}</span>
                  </p>
                </div>
              )}
            
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-4">
                {/* Media Section */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Media</span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'hero-image', { 
                        title: 'Hero Image',
                        url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
                        alt: 'Hero image placeholder'
                      })}
                    >
                      <Image className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Hero Image</div>
                        <div className="text-xs text-gray-500">Large featured image</div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'video-player', {
                        title: 'Video Player',
                        url: '',
                        autoplay: false
                      })}
                    >
                      <Video className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Video Player</div>
                        <div className="text-xs text-gray-500">Embedded video content</div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'image-gallery', {
                        title: 'Image Gallery',
                        images: [],
                        layout: 'grid'
                      })}
                    >
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Image Gallery</div>
                        <div className="text-xs text-gray-500">Collection of images</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Content</span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'heading', {
                        text: 'Heading Text',
                        level: 2,
                        alignment: 'left'
                      })}
                    >
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Heading</div>
                        <div className="text-xs text-gray-500">Title or section header</div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'text-block', {
                        text: 'Your content goes here...',
                        alignment: 'left',
                        fontSize: 'medium'
                      })}
                    >
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Text Block</div>
                        <div className="text-xs text-gray-500">Body text content</div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'quote', {
                        text: 'This is a quote',
                        author: 'Author Name',
                        style: 'bordered'
                      })}
                    >
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Quote</div>
                        <div className="text-xs text-gray-500">Highlighted testimonial</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Section */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Interactive</span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'action-button', {
                        text: 'Click Me',
                        variant: 'primary',
                        action: 'navigate',
                        url: '#'
                      })}
                    >
                      <MousePointer className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Action Button</div>
                        <div className="text-xs text-gray-500">Clickable call-to-action</div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'form', {
                        title: 'Form',
                        fields: [],
                        submitText: 'Submit'
                      })}
                    >
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Form</div>
                        <div className="text-xs text-gray-500">Input collection interface</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Section */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">AI</span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'token', {
                        displayName: 'AI Assistant',
                        avatarUrl: '/placeholder.svg',
                        personaNote: 'Helpful AI assistant'
                      })}
                    >
                      <Bot className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">AI Assistant</div>
                        <div className="text-xs text-gray-500">Conversational AI interface</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </aside>
        )}
        
        {/* Frame Config Panel - Replaces right sidebar in Studio mode */}
        <FrameConfigPanel />
      </div>
    </div>
  )
}

// Main export component with provider wrapper
export default function BoardStudio({ boardId, initialBoard }: BoardStudioProps) {
  return (
    <BoardStudioProvider 
      initialBoard={initialBoard} 
      initialBoardId={boardId}
    >
      <BoardStudioContent />
    </BoardStudioProvider>
  )
}
