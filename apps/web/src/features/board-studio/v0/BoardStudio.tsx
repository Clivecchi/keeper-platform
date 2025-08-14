"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
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
  Palette,
  Save,
  Share2,
  MoreHorizontal,
  Book,
  Film,
  Cog,
  ChevronDown,
  User,
  Sparkles,
  Layout,
  Eye,
  Edit3,
  Grid3X3,
} from "lucide-react"
import { PATTERNS } from "./patterns/registry"
import type { StudioBoard, StudioFrame, PatternId, StudioProp, AiTokenV1 } from "./types"

interface BoardStudioProps {
  boardId?: string;
  initialBoard?: StudioBoard;
}

// Props Library Categories
const PROPS_LIBRARY = {
  Content: [
    { id: 'hero-image', name: 'Hero Image', type: 'image', icon: ImageIcon },
    { id: 'text-block', name: 'Text Block', type: 'text', icon: Type },
    { id: 'heading', name: 'Heading', type: 'text', icon: Type },
  ],
  Media: [
    { id: 'image-gallery', name: 'Image Gallery', type: 'image', icon: ImageIcon },
    { id: 'video-player', name: 'Video Player', type: 'media', icon: Film },
  ],
  Interactive: [
    { id: 'button', name: 'Button', type: 'button', icon: Type },
    { id: 'form', name: 'Form', type: 'form', icon: Type },
  ],
  AI: [
    { id: 'ai-token', name: 'Token', type: 'token', icon: Sparkles },
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

  const [activeFrameId, setActiveFrameId] = useState<string>('');
  const [configFrameId, setConfigFrameId] = useState<string | null>(null);
  const [configPropId, setConfigPropId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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

  const loadBoard = async () => {
    if (!boardId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      if (response.ok) {
        const boardData = await response.json();
        setBoard(boardData);
        setActiveFrameId(boardData.frames[0]?.id || '');
      } else {
        console.error('Failed to load board:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading board:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Book className="w-6 h-6 text-amber-600" />
              <span className="font-bold text-xl text-amber-800">Board Studio</span>
            </div>
            <div className="h-6 w-px bg-amber-200" />
            <div className="flex items-center gap-2 text-amber-700">
              <Film className="w-4 h-4" />
              <span className="text-sm font-medium">{board.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveBoard} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Keeper & Boards */}
        <aside className="w-64 bg-white/60 backdrop-blur-sm border-r flex flex-col">
          {/* Keeper Header */}
          <div className="p-4 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={activeKeeper.avatar} 
                      alt={activeKeeper.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm font-medium">{activeKeeper.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Switch Keeper
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Boards List */}
          <div className="p-4 space-y-4 flex-1">
            <div>
              <h3 className="font-semibold text-amber-800 mb-3">Boards</h3>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left bg-amber-100/50"
                >
                  <Film className="w-4 h-4 mr-2" />
                  {board.name}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left"
                >
                  <Book className="w-4 h-4 mr-2" />
                  Demo Board 2
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 border-dashed border-amber-300 hover:border-amber-400 bg-transparent"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Board
              </Button>
            </div>

            <div>
              <h3 className="font-semibold text-amber-800 mb-3">Board Settings</h3>
              <Input
                value={board.name}
                onChange={(e) => setBoard(prev => ({ ...prev, name: e.target.value }))}
                className="mb-3 bg-white/80"
                placeholder="Board name..."
              />
              <Textarea
                value={board.description || ''}
                onChange={(e) => setBoard(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/80 min-h-[80px]"
                placeholder="Board description..."
              />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Mode Bar */}
          <div className="border-b bg-white/60 backdrop-blur-sm p-2">
            <div className="flex items-center gap-2">
              <Button 
                variant={editorMode === 'edit' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEditorMode('edit')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant={editorMode === 'layout' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEditorMode('layout')}
              >
                <Layout className="w-4 h-4 mr-2" />
                Layout
              </Button>
              <Button 
                variant={editorMode === 'preview' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEditorMode('preview')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant={editorMode === 'assist' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setEditorMode('assist')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assist
              </Button>
            </div>
          </div>

          {/* Horizontal Frame Tabs */}
          <div className="border-b bg-white/80 backdrop-blur-sm">
            <div className="flex items-center px-4 py-2">
              <ScrollArea className="flex-1">
                <div className="flex items-center gap-1">
                  {board.frames.map((frame) => (
                    <div key={frame.id} className="flex items-center">
                      <Button
                        variant={activeFrameId === frame.id ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-t-md rounded-b-none"
                        onClick={() => setActiveFrameId(frame.id)}
                      >
                        <span className="text-sm">
                          {frame.name} • {PATTERNS[frame.pattern].name.toLowerCase()}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => setConfigFrameId(frame.id)}
                      >
                        <Cog className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={addFrame}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 border-dashed border-amber-300 hover:border-amber-400 ml-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Frame
                  </Button>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-6">
            <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg border-amber-200">
              <CardContent className="p-8 h-full flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                      <p className="text-amber-600">Loading board...</p>
                    </div>
                  </div>
                ) : activeFrame ? (
                  <>
                    <div className="text-center mb-6">
                      <h1 className="text-3xl font-bold text-amber-800 mb-2 font-serif">{board.name}</h1>
                      <h2 className="text-xl text-amber-700 font-medium">{activeFrame.name}</h2>
                    </div>

                    <div className="flex-1 flex items-center justify-center mb-6">
                      {editorMode === 'preview' ? (
                        <div className="w-full max-w-4xl">
                          <div className="space-y-6">
                            {activeFrame.props.map((prop) => (
                              <div key={prop.id} className="p-6 bg-white rounded-lg shadow-sm border">
                                {prop.type === 'token' && (
                                  <div className="flex items-center gap-4">
                                    <img 
                                      src={prop.config.avatarUrl || '/placeholder.svg'} 
                                      alt={prop.config.displayName}
                                      className="w-12 h-12 rounded-full"
                                    />
                                    <div className="text-left">
                                      <h4 className="text-lg font-semibold text-amber-800">{prop.config.displayName}</h4>
                                      <p className="text-amber-700">{prop.config.personaNote}</p>
                                      <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                                        Coming Soon
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {prop.type === 'image' && (
                                  <img 
                                    src={prop.config.src || '/placeholder.svg'} 
                                    alt={prop.config.alt || 'Image'}
                                    className="w-full rounded-lg shadow-md"
                                  />
                                )}
                                {prop.type === 'text' && (
                                  <div className="text-amber-900 text-lg leading-relaxed font-serif">
                                    {prop.config.content || 'Text content here...'}
                                  </div>
                                )}
                              </div>
                            ))}
                            {activeFrame.props.length === 0 && (
                              <div className="text-center p-12 border-2 border-dashed border-amber-300 rounded-lg">
                                <p className="text-amber-600">No content configured for this frame</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative max-w-2xl w-full">
                          <div className="text-center p-8 border-2 border-dashed border-amber-300 rounded-lg bg-white/50">
                            <div className="text-amber-600 mb-4">
                              <Film className="w-16 h-16 mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-amber-800 mb-2">
                              {activeFrame.name} Frame
                            </h3>
                            <p className="text-amber-700 mb-4">
                              Pattern: {PATTERNS[activeFrame.pattern].name} - {PATTERNS[activeFrame.pattern].summary}
                            </p>
                            {activeFrame.props.length > 0 && (
                              <div className="text-sm text-amber-600 mb-4">
                                {activeFrame.props.length} props configured
                              </div>
                            )}
                            {editorMode === 'edit' && (
                              <p className="text-sm text-amber-600">
                                Drop props from the library to add content
                              </p>
                            )}
                          </div>
                          {editorMode === 'layout' && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="grid grid-cols-12 gap-1 h-full opacity-30">
                                {Array.from({ length: 12 }).map((_, i) => (
                                  <div key={i} className="bg-amber-300/50 border-r border-amber-400/30"></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-amber-600">No frame selected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Right Sidebar - Props Library (Edit mode) or Layout Controls (Layout mode) */}
        {(editorMode === 'edit' || editorMode === 'layout') && (
          <aside className="w-80 bg-white/60 backdrop-blur-sm border-l p-4">
            {editorMode === 'edit' && (
              <div>
                <h3 className="font-semibold text-amber-800 mb-4">Props Library</h3>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {Object.entries(PROPS_LIBRARY).map(([category, props]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-sm font-medium text-amber-700 mb-3">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {props.map((prop) => (
                          <Button
                            key={prop.id}
                            variant="outline"
                            size="sm"
                            className="h-16 flex-col gap-1 bg-white/80 hover:bg-amber-50 border-amber-200"
                            onClick={() => activeFrameId && addPropToFrame(activeFrameId, prop.type)}
                          >
                            <prop.icon className="w-5 h-5 text-amber-600" />
                            <span className="text-xs text-center text-amber-800">{prop.name}</span>
                            {prop.type === 'token' && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">v1</span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {editorMode === 'layout' && (
              <div>
                <h3 className="font-semibold text-amber-800 mb-4">Layout Controls</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-amber-700 mb-2 block">Breakpoints</label>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="p-2 bg-white/80 rounded text-center">SM</div>
                      <div className="p-2 bg-white/80 rounded text-center">MD</div>
                      <div className="p-2 bg-white/80 rounded text-center">LG</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-amber-700 mb-2 block">Grid System</label>
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-600">12-column grid active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* AI Assist Panel */}
        {editorMode === 'assist' && (
          <aside className="w-80 bg-white/60 backdrop-blur-sm border-l p-4">
            <h3 className="font-semibold text-amber-800 mb-4">AI Assist</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2">Content Suggestions</h4>
                <p className="text-sm text-amber-600">AI assistance features coming soon...</p>
              </div>
              <div className="p-4 bg-white/80 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2">Layout Optimization</h4>
                <p className="text-sm text-amber-600">AI layout suggestions coming soon...</p>
              </div>
            </div>
          </aside>
        )}
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
