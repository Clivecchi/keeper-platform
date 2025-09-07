"use client"

import React, { useState, useEffect } from "react"
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
          const r = await fetch(`/api/board-data/agents/${agentId}/home`);
          if (r.status === 401) {
            setAuthRequired(true);
            return;
          }
          if (!r.ok) return;
          const data = await r.json();
          const bid = data?.boardId || null;
          if (!bid) {
            setNoAhb(true);
            return;
          }
          console.info('[Studio] Loaded Agent Home Board', { boardId: bid });
          await loadBoardById(bid);
        } catch (e) {
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
      const response = await fetch(`/api/board-data/${boardId}`);
      if (response.ok) {
        const payload = await response.json();
        const boardData = payload?.data?.board || payload; // support both shapes
        setBoard(boardData);
        setActiveFrameId(boardData.frames?.[0]?.id || '');
        const isAgent = Boolean(boardData?.agentId) || (boardData?.data?.scope === 'agent');
        setAgentMode(isAgent);
      } else {
        console.error('Failed to load board:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading board:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBoardById = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/board-data/${id}`);
      if (response.ok) {
        const payload = await response.json();
        const boardData = payload?.data?.board || payload;
        setBoard(boardData);
        setActiveFrameId(boardData.frames?.[0]?.id || '');
        const isAgent = Boolean(boardData?.agentId) || (boardData?.data?.scope === 'agent');
        setAgentMode(isAgent);
      }
    } catch (e) {
      console.error('Error loading board by id:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBoard = async () => {
    if (!boardId) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(board),
      });
      
      if (response.ok) {
        console.log('Board saved successfully');
      } else {
        console.error('Failed to save board:', response.statusText);
      }
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const activeFrame = board.frames.find(f => f.id === activeFrameId);

  const addFrame = () => {
    const newFrame: StudioFrame = {
      id: `frame-${Date.now()}`,
      name: `Frame ${board.frames.length + 1}`,
      role: 'custom',
      pattern: 'canvas',
      props: []
    };
    setBoard(prev => ({
      ...prev,
      frames: [...prev.frames, newFrame]
    }));
  };

  const updateFrame = (frameId: string, updates: Partial<StudioFrame>) => {
    setBoard(prev => ({
      ...prev,
      frames: prev.frames.map(frame => 
        frame.id === frameId ? { ...frame, ...updates } : frame
      )
    }));
    // Auto-save after frame updates
    if (boardId && boardId !== 'new-board') {
      setTimeout(saveBoard, 500); // Debounced save
    }
  };

  const addPropToFrame = (frameId: string, propType: string) => {
    const newProp: StudioProp = {
      id: `prop-${Date.now()}`,
      type: propType,
      config: propType === 'token' ? {
        displayName: 'AI Assistant',
        avatarUrl: '/placeholder.svg',
        personaNote: 'Helpful AI assistant',
      } : {}
    };
    
    setBoard(prev => ({
      ...prev,
      frames: prev.frames.map(frame => 
        frame.id === frameId 
          ? { ...frame, props: [...frame.props, newProp] }
          : frame
      )
    }));
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
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Form
                      </DropdownMenuItem>
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
              ) : (
                <div className="w-full max-w-4xl h-full flex items-center justify-center">
                  {authRequired ? (
                    <div className="text-center text-gray-600">
                      <p>Please sign in to view this board.</p>
                    </div>
                  ) : noAhb ? (
                    <div className="text-center text-gray-600">
                      <p>No Agent Home Board for this agent.</p>
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                          <Film className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Product Launch Story</h1>
                        <p className="text-blue-100">Discover the journey behind our latest innovation</p>
                      </div>
                    </div>
                  )}
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
              <span className="text-xs text-gray-500">Drag elements to your frame</span>
            </div>
            
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
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <Image className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Hero Image</div>
                        <div className="text-xs text-gray-500">Large featured image</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <Video className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Video Player</div>
                        <div className="text-xs text-gray-500">Embedded video content</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
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
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Heading</div>
                        <div className="text-xs text-gray-500">Title or section header</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <Type className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Text Block</div>
                        <div className="text-xs text-gray-500">Body text content</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
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
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <MousePointer className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-900">Action Button</div>
                        <div className="text-xs text-gray-500">Clickable call-to-action</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
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
                      onClick={() => activeFrameId && addPropToFrame(activeFrameId, 'token')}
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
