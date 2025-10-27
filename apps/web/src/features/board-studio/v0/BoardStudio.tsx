"use client"

import React, { useState, useEffect } from "react"
import { apiFetch } from "../../../lib/api"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Textarea } from "./components/ui/textarea"
import { ScrollArea } from "./components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu"
import {
  Plus,
  ImageIcon,
  Type,
  Book,
  Film,
  Cog,
  ChevronDown,
  Sparkles,
  Layout,
  Eye,
  Edit3,
  Video,
  Image,
  MousePointer,
  Bot,
} from "lucide-react"
import { PATTERNS } from "./patterns/registry"
import type { StudioBoard, StudioFrame, PatternId, StudioProp } from "./types"

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

export default function BoardStudio({ boardId, initialBoard }: BoardStudioProps) {
  // Editor mode state
  const [editorMode, setEditorMode] = useState<'edit' | 'layout' | 'preview' | 'assist'>('edit');
  
  // Board state
  const [board, setBoard] = useState<StudioBoard>(initialBoard || {
    id: boardId || 'new-board',
    name: 'New Board',
    description: 'Board description',
    frames: [
      {
        id: 'cover-frame',
        name: 'Cover',
        role: 'cover',
        pattern: 'focus',
        props: []
      },
      {
        id: 'settings-frame',
        name: 'Settings',
        role: 'settings',
        pattern: 'form',
        props: []
      }
    ]
  });
  const [agentMode, setAgentMode] = useState<boolean>(false);

  const [activeFrameId, setActiveFrameId] = useState<string>('');
  const [configFrameId, setConfigFrameId] = useState<string | null>(null);
  const [configPropId, setConfigPropId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [noAhb, setNoAhb] = useState(false);
  
  // Keeper state (stubbed for now)
  const [activeKeeper] = useState({
    id: 'keeper-1',
    name: 'Demo Keeper',
    avatar: '/placeholder.svg'
  });

  // Load board data from API
  useEffect(() => {
    if (boardId && boardId !== 'new-board') {
      loadBoard();
    } else {
      // Set active frame for new boards
      setActiveFrameId(board.frames[0]?.id || '');
    }
  }, [boardId]);

  // Parity loader: allow agentId query to drive Studio via /api/board-data/agents/:agentId/home
  useEffect(() => {
    try {
      const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const agentId = search?.get('agentId') || '';
      if (!agentId) return;

      const loadFromAgent = async () => {
        setIsLoading(true);
        setAuthRequired(false);
        setNoAhb(false);
        try {
          // H5: apiFetch returns parsed data or throws; treat 401 via catch
          const data = await apiFetch(`/api/board-data/agents/${agentId}/home`);
          const bid = data?.boardId || null;
          if (!bid) {
            setNoAhb(true);
            return;
          }
          console.info('[Studio] Loaded Agent Home Board', { boardId: bid });
          await loadBoardById(bid);
        } catch (e: any) {
          if (e?.status === 401) {
            setAuthRequired(true);
            return;
          }
          console.error('[Studio] parity load error', e);
        } finally {
          setIsLoading(false);
        }
      };
      loadFromAgent();
    } catch {}
  }, []);

  const loadBoard = async () => {
    if (!boardId) return;
    
    setIsLoading(true);
    try {
      // H5: apiFetch returns payload or throws; use directly
      const payload = await apiFetch(`/api/board-data/${boardId}`);
      const boardData = payload?.data?.board || payload; // support both shapes
      setBoard(boardData);
      setActiveFrameId(boardData.frames?.[0]?.id || '');
      const isAgent = Boolean(boardData?.agentId) || (boardData?.data?.scope === 'agent');
      setAgentMode(isAgent);
    } catch (error) {
      console.error('Error loading board:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBoardById = async (id: string) => {
    setIsLoading(true);
    try {
      // H5: use apiFetch return directly
      const payload = await apiFetch(`/api/board-data/${id}`);
      const boardData = payload?.data?.board || payload;
      setBoard(boardData);
      setActiveFrameId(boardData.frames?.[0]?.id || '');
      const isAgent = Boolean(boardData?.agentId) || (boardData?.data?.scope === 'agent');
      setAgentMode(isAgent);
    } catch (e) {
      console.error('Error loading board by id:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBoard = async () => {
    if (!boardId || boardId === 'new-board') return;
    
    setIsSaving(true);
    try {
      // Only save board-level metadata (name, description, theme, etc.)
      // Frames are separate entities and saved via frame endpoints
      const boardMetadata = {
        name: board.name,
        description: board.description,
        // Don't send frames array - they're managed separately
      };
      
      await apiFetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardMetadata),
      });
      console.log('✅ Board metadata saved successfully');
    } catch (error) {
      console.error('❌ Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const activeFrame = board.frames.find(f => f.id === activeFrameId);

  const addFrame = async () => {
    if (!boardId || boardId === 'new-board') {
      console.warn('Cannot add frame: no valid boardId');
      return;
    }

    const tempId = `temp-frame-${Date.now()}`;
    const newFrame: StudioFrame = {
      id: tempId,
      name: `Frame ${board.frames.length + 1}`,
      role: 'custom',
      pattern: 'canvas',
      props: []
    };
    
    // Optimistic update
    setBoard(prev => ({
      ...prev,
      frames: [...prev.frames, newFrame]
    }));
    
    try {
      // Persist to backend
      const response = await apiFetch(`/api/boards/${boardId}/frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFrame.name,
          pattern: newFrame.pattern,
          frameType: 'media_card',
          orderIndex: board.frames.length
        })
      });
      
      if (response.success && response.data) {
        // Replace temp ID with real server ID
        setBoard(prev => ({
          ...prev,
          frames: prev.frames.map(f => 
            f.id === tempId ? { 
              ...f, 
              id: response.data.id,
              name: response.data.name,
              pattern: response.data.pattern 
            } : f
          )
        }));
        console.log('✅ Frame created and persisted:', response.data.id);
      }
    } catch (error) {
      console.error('❌ Failed to create frame:', error);
      // Revert optimistic update on error
      setBoard(prev => ({
        ...prev,
        frames: prev.frames.filter(f => f.id !== tempId)
      }));
    }
  };

  const updateFrame = async (frameId: string, updates: Partial<StudioFrame>) => {
    // Optimistic update
    setBoard(prev => ({
      ...prev,
      frames: prev.frames.map(frame => 
        frame.id === frameId ? { ...frame, ...updates } : frame
      )
    }));
    
    // Persist to backend immediately
    if (boardId && boardId !== 'new-board') {
      try {
        const response = await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        if (response.success && response.data) {
          // Update with server response to ensure consistency
          setBoard(prev => ({
            ...prev,
            frames: prev.frames.map(frame => 
              frame.id === frameId ? { 
                ...frame, 
                ...updates,
                // Merge server data if available
                name: response.data.name || frame.name,
                pattern: response.data.pattern || frame.pattern,
                props: response.data.props || frame.props
              } : frame
            )
          }));
          console.log('✅ Frame updated and persisted:', frameId);
        }
      } catch (error) {
        console.error('❌ Failed to update frame:', error);
      }
    }
  };

  const addPropToFrame = async (frameId: string, propType: string, propConfig?: Record<string, any>) => {
    const frame = board.frames.find(f => f.id === frameId);
    if (!frame) {
      console.warn('Frame not found:', frameId);
      return;
    }

    const newProp: StudioProp = {
      id: `prop-${Date.now()}`,
      type: propType,
      config: propConfig || (propType === 'token' ? {
        displayName: 'AI Assistant',
        avatarUrl: '/placeholder.svg',
        personaNote: 'Helpful AI assistant',
      } : {})
    };
    
    const updatedProps = [...frame.props, newProp];
    
    // Optimistic update
    setBoard(prev => ({
      ...prev,
      frames: prev.frames.map(f => 
        f.id === frameId 
          ? { ...f, props: updatedProps }
          : f
      )
    }));
    
    // Persist to backend
    if (boardId && boardId !== 'new-board') {
      try {
        const response = await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ props: updatedProps })
        });
        
        if (response.success) {
          console.log('✅ Props persisted to server for frame:', frameId);
        }
      } catch (error) {
        console.error('❌ Failed to update frame props:', error);
        // Revert optimistic update on error
        setBoard(prev => ({
          ...prev,
          frames: prev.frames.map(f => 
            f.id === frameId ? { ...f, props: frame.props } : f
          )
        }));
      }
    }
  };

  const deleteFrame = async (frameId: string) => {
    const frame = board.frames.find(f => f.id === frameId);
    if (!frame) return;
    
    // Prevent deletion of cover and settings frames
    if (frame.role === 'cover' || frame.role === 'settings') {
      alert('Cannot delete default frames (Cover/Settings)');
      return;
    }
    
    if (!confirm(`Delete frame "${frame.name}"?`)) return;
    
    // Optimistic update
    const originalFrames = board.frames;
    setBoard(prev => ({
      ...prev,
      frames: prev.frames.filter(f => f.id !== frameId)
    }));
    
    // Switch to first frame if deleting active frame
    if (activeFrameId === frameId) {
      const remainingFrames = originalFrames.filter(f => f.id !== frameId);
      setActiveFrameId(remainingFrames[0]?.id || '');
    }
    
    // Persist to backend
    if (boardId && boardId !== 'new-board') {
      try {
        await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
          method: 'DELETE'
        });
        console.log('✅ Frame deleted:', frameId);
      } catch (error) {
        console.error('❌ Failed to delete frame:', error);
        // Revert optimistic update on error
        setBoard(prev => ({
          ...prev,
          frames: originalFrames
        }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - V0 Style */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Keeper</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <span className="text-sm text-gray-600">Creative storytelling workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
              <Button 
                variant={editorMode === 'edit' ? 'default' : 'ghost'} 
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setEditorMode('edit')}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button 
                variant={editorMode === 'layout' ? 'default' : 'ghost'} 
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setEditorMode('layout')}
              >
                <Layout className="w-3 h-3 mr-1" />
                Layout
              </Button>
              <Button 
                variant={editorMode === 'preview' ? 'default' : 'ghost'} 
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setEditorMode('preview')}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button 
                variant={editorMode === 'assist' ? 'default' : 'ghost'} 
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setEditorMode('assist')}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI assist
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Sidebar - Boards List Only */}
        <aside className="w-64 bg-white border-r">
          <div className="p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Boards</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Board List Items */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Product Launch Story</span>
                  <span className="text-xs text-gray-500 ml-auto">5 frames</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-700">Customer Journey</span>
                  <span className="text-xs text-gray-500 ml-auto">3 frames</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-700">Brand Narrative</span>
                  <span className="text-xs text-gray-500 ml-auto">7 frames</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white">
          {/* Frame Tabs - Horizontal V0 Style */}
          <div className="border-b bg-white">
            <div className="flex items-center px-4 py-2 gap-1">
              {board.frames.map((frame) => (
                <div key={frame.id} className="flex items-center">
                  <Button
                    variant={activeFrameId === frame.id ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setActiveFrameId(frame.id)}
                  >
                    <span>{frame.name}</span>
                    <span className="text-gray-400 mx-1">•</span>
                    <span className="text-gray-500">{PATTERNS[frame.pattern].name.toLowerCase()}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                        <Cog className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setConfigFrameId(frame.id)}>
                        Configure
                      </DropdownMenuItem>
                      {frame.role !== 'cover' && frame.role !== 'settings' && (
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => deleteFrame(frame.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              <Button
                onClick={addFrame}
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs ml-2 text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Frame
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-white">
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
                </div>
              ) : (
                <div className="w-full max-w-4xl">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="mb-4 pb-4 border-b">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">{activeFrame.name}</h2>
                      <p className="text-sm text-gray-500">Pattern: {activeFrame.pattern}</p>
                    </div>
                    
                    {activeFrame.props.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                          <Layout className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Frame</h3>
                        <p className="text-gray-600 mb-4">Add props from the library to build your frame</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Props ({activeFrame.props.length}):</h3>
                        {activeFrame.props.map((prop, index) => (
                          <div 
                            key={prop.id} 
                            className="border border-gray-200 rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                                <span className="text-sm font-medium text-gray-900">{prop.type}</span>
                              </div>
                              <button 
                                className="text-xs text-red-600 hover:text-red-700"
                                onClick={() => {
                                  const updatedProps = activeFrame.props.filter(p => p.id !== prop.id);
                                  updateFrame(activeFrame.id, { props: updatedProps });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            {Object.keys(prop.config).length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                  {JSON.stringify(prop.config, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Props Library */}
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
      </div>

      {/* Frame Config Sheet */}
      <Sheet open={!!configFrameId} onOpenChange={(open) => !open && setConfigFrameId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Frame Configuration</SheetTitle>
          </SheetHeader>
          {configFrameId && (() => {
            const frame = board.frames.find(f => f.id === configFrameId);
            if (!frame) return null;
            
            return (
              <div className="space-y-6 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Frame Name</label>
                  <Input
                    value={frame.name}
                    onChange={(e) => updateFrame(configFrameId, { name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Engagement Pattern</label>
                  <Select 
                    value={frame.pattern} 
                    onValueChange={(pattern: PatternId) => updateFrame(configFrameId, { pattern })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PATTERNS).map((pattern) => (
                        <SelectItem key={pattern.id} value={pattern.id}>
                          <div>
                            <div className="font-medium">{pattern.name}</div>
                            <div className="text-xs text-muted-foreground">{pattern.summary}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    When to use: {PATTERNS[frame.pattern].whenToUse.join(', ')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Pattern Options</label>
                  <div className="text-sm text-muted-foreground">Coming soon...</div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Data Bindings</label>
                  <div className="text-sm text-muted-foreground">Coming soon...</div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Visibility</label>
                  <div className="text-sm text-muted-foreground">Coming soon...</div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">AI Assist Actions</label>
                  <div className="text-sm text-muted-foreground">Coming soon...</div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* AI Token Config Sheet */}
      <Sheet open={!!configPropId} onOpenChange={(open) => !open && setConfigPropId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI Token Configuration</SheetTitle>
          </SheetHeader>
          {configPropId && (() => {
            const prop = board.frames
              .flatMap(f => f.props)
              .find(p => p.id === configPropId);
            if (!prop || prop.type !== 'token') return null;
            
            const updateProp = (updates: Record<string, any>) => {
              setBoard(prev => ({
                ...prev,
                frames: prev.frames.map(frame => ({
                  ...frame,
                  props: frame.props.map(p => 
                    p.id === configPropId 
                      ? { ...p, config: { ...p.config, ...updates } }
                      : p
                  )
                }))
              }));
            };
            
            return (
              <div className="space-y-6 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Display Name</label>
                  <Input
                    value={prop.config.displayName || ''}
                    onChange={(e) => updateProp({ displayName: e.target.value })}
                    placeholder="AI Assistant"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Avatar URL</label>
                  <Input
                    value={prop.config.avatarUrl || ''}
                    onChange={(e) => updateProp({ avatarUrl: e.target.value })}
                    placeholder="/placeholder.svg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Persona Note</label>
                  <Textarea
                    value={prop.config.personaNote || ''}
                    onChange={(e) => updateProp({ personaNote: e.target.value })}
                    placeholder="Brief description of the AI's role..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Agent ID (Future)</label>
                  <Input
                    value={prop.config.agentId || ''}
                    onChange={(e) => updateProp({ agentId: e.target.value })}
                    placeholder="Reserved for future use"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will connect to specific agents in a future release
                  </p>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
