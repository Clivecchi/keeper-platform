/**
 * Board Studio Page
 * =================
 * 
 * Central control panel for creating, editing, and managing Boards.
 * Provides drag-and-drop interface for board design and frame management.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  Squares2X2Icon,
  CogIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SaveIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../../context/BoardContext';
import { useFrame } from '../../context/FrameContext';
import { useAuth } from '../../context/AuthContext';

// =============================================================================
// TYPES
// =============================================================================

interface BoardListItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  lastModified: Date;
  frameCount: number;
  engagementMode: string;
}

interface FrameType {
  id: string;
  name: string;
  type: string;
  description: string;
  category: 'content' | 'interaction' | 'configuration' | 'visualization';
  icon: string;
  preview?: string;
}

interface BoardTheme {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  borderColor: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const BoardStudioPage: React.FC = () => {
  const { user } = useAuth();
  const { activeBoard, loadBoard, saveBoard, isLoading } = useBoard();
  const { handleFrameInteraction } = useFrame();

  // UI State
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
  const [isFrameLibraryOpen, setIsFrameLibraryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Board Studio State
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [frameTypes, setFrameTypes] = useState<FrameType[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // Board Properties
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [engagementMode, setEngagementMode] = useState<'dialogic' | 'wizard' | 'focus' | 'canvas'>('canvas');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>({
    primaryColor: '#334155',
    backgroundColor: '#E2E8F0',
    accentColor: '#0F172A',
    borderColor: '#CBD5E1'
  });

  // Load boards and frame types on mount
  useEffect(() => {
    loadBoardsAndFrames();
  }, []);

  // Update board properties when active board changes
  useEffect(() => {
    if (activeBoard) {
      setBoardName(activeBoard.config.name || '');
      setBoardDescription(activeBoard.config.description || '');
      setEngagementMode(activeBoard.config.engagementMode || 'canvas');
      setBoardTheme({
        primaryColor: activeBoard.config.theme?.primaryColor || '#334155',
        backgroundColor: activeBoard.config.theme?.backgroundColor || '#E2E8F0',
        accentColor: activeBoard.config.theme?.accentColor || '#0F172A',
        borderColor: activeBoard.config.theme?.borderColor || '#CBD5E1'
      });
    }
  }, [activeBoard]);

  const loadBoardsAndFrames = async () => {
    try {
      // Load boards for current domain
      const boardsResponse = await fetch(`/api/boards?domainId=${user?.currentDomainId || 'demo'}`);
      if (boardsResponse.ok) {
        const boardsData = await boardsResponse.json();
        setBoards(boardsData);
      } else {
        // Mock data if API not available
        setBoards([
          {
            id: 'agent-board-1',
            name: 'Agent Configuration Board',
            type: 'agent_board',
            description: 'Configure and manage AI agents',
            lastModified: new Date('2024-01-28'),
            frameCount: 4,
            engagementMode: 'dialogic'
          },
          {
            id: 'domain-board-1',
            name: 'Domain Management Board',
            type: 'domain_board',
            description: 'Manage domain settings and members',
            lastModified: new Date('2024-01-27'),
            frameCount: 4,
            engagementMode: 'wizard'
          },
          {
            id: 'journey-board-1',
            name: 'Journey Visualization Board',
            type: 'journey_board',
            description: 'Visualize and manage learning journeys',
            lastModified: new Date('2024-01-26'),
            frameCount: 4,
            engagementMode: 'canvas'
          }
        ]);
      }

      // Load available frame types
      const framesResponse = await fetch('/api/frames');
      if (framesResponse.ok) {
        const framesData = await framesResponse.json();
        setFrameTypes(framesData);
      } else {
        // Mock frame types if API not available
        setFrameTypes([
          {
            id: 'media-card',
            name: 'Media Card',
            type: 'media_card',
            description: 'Rich media presentation with images and content',
            category: 'content',
            icon: '🖼️'
          },
          {
            id: 'preview',
            name: 'Preview Frame',
            type: 'preview',
            description: 'Compact content summary and overview',
            category: 'content',
            icon: '👁️'
          },
          {
            id: 'dialog',
            name: 'Dialog Frame',
            type: 'dialog',
            description: 'Guided agent interaction and conversation',
            category: 'interaction',
            icon: '💬'
          },
          {
            id: 'config-panel',
            name: 'Config Panel',
            type: 'config_panel',
            description: 'Form-based settings and configuration',
            category: 'configuration',
            icon: '⚙️'
          },
          {
            id: 'process-frame',
            name: 'Process Frame',
            type: 'process_frame',
            description: 'Step-based workflow and guided processes',
            category: 'interaction',
            icon: '📋'
          },
          {
            id: 'agent-preview',
            name: 'Agent Preview',
            type: 'agent_preview',
            description: 'Agent identity and configuration preview',
            category: 'visualization',
            icon: '🤖'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load boards and frames:', error);
    }
  };

  const handleBoardSelect = async (boardId: string) => {
    setSelectedBoardId(boardId);
    try {
      await loadBoard(boardId);
    } catch (error) {
      console.error('Failed to load board:', error);
    }
  };

  const handleCreateBoard = async () => {
    try {
      const newBoard = {
        name: 'New Board',
        type: 'custom_board',
        description: 'A new custom board',
        engagementMode: 'canvas',
        domainId: user?.currentDomainId || 'demo'
      };

      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBoard)
      });

      if (response.ok) {
        const createdBoard = await response.json();
        setBoards(prev => [...prev, {
          id: createdBoard.id,
          name: createdBoard.name,
          type: createdBoard.type,
          description: createdBoard.description,
          lastModified: new Date(),
          frameCount: 0,
          engagementMode: createdBoard.engagementMode
        }]);
        setSelectedBoardId(createdBoard.id);
        await loadBoard(createdBoard.id);
      } else {
        console.error('Failed to create board');
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleSaveBoard = async () => {
    if (!activeBoard) return;

    setIsSaving(true);
    try {
      const updatedBoard = {
        ...activeBoard,
        config: {
          ...activeBoard.config,
          name: boardName,
          description: boardDescription,
          engagementMode,
          theme: boardTheme
        }
      };

      const response = await fetch(`/api/boards/${activeBoard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBoard)
      });

      if (response.ok) {
        console.log('Board saved successfully');
        // Update local boards list
        setBoards(prev => prev.map(board => 
          board.id === activeBoard.id 
            ? { ...board, name: boardName, description: boardDescription, lastModified: new Date() }
            : board
        ));
      } else {
        console.error('Failed to save board');
      }
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFrameDrop = (frameType: FrameType, position: { x: number; y: number }) => {
    console.log('Frame dropped:', frameType, 'at position:', position);
    // TODO: Implement frame creation and positioning
  };

  const filteredFrameTypes = frameTypes.filter(frame =>
    frame.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    frame.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const framesByCategory = filteredFrameTypes.reduce((acc, frame) => {
    if (!acc[frame.category]) {
      acc[frame.category] = [];
    }
    acc[frame.category].push(frame);
    return acc;
  }, {} as Record<string, FrameType[]>);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Board List Panel */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Board Studio</h2>
            <button
              onClick={handleCreateBoard}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Board</span>
            </button>
          </div>
          <p className="text-sm text-slate-600">Create and manage your boards</p>
        </div>

        {/* Board List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {boards.map((board) => (
              <motion.div
                key={board.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleBoardSelect(board.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedBoardId === board.id
                    ? 'border-slate-300 bg-slate-100 ring-2 ring-slate-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-slate-900 truncate">{board.name}</h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {board.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">{board.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{board.frameCount} frames</span>
                  <span>{board.lastModified.toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            {activeBoard && (
              <>
                <h1 className="text-xl font-semibold text-slate-900">{boardName || 'Untitled Board'}</h1>
                <select
                  value={engagementMode}
                  onChange={(e) => setEngagementMode(e.target.value as any)}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="canvas">Canvas Mode</option>
                  <option value="wizard">Wizard Mode</option>
                  <option value="dialogic">Dialogic Mode</option>
                  <option value="focus">Focus Mode</option>
                </select>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFrameLibraryOpen(!isFrameLibraryOpen)}
              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isFrameLibraryOpen
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span>Frame Library</span>
            </button>

            <button
              onClick={() => setIsPropertiesPanelOpen(!isPropertiesPanelOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isPropertiesPanelOpen
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CogIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleSaveBoard}
              disabled={!activeBoard || isSaving}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SaveIcon className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Board Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {activeBoard ? (
            <div 
              className="w-full h-full p-6 overflow-auto"
              style={{ 
                backgroundColor: boardTheme.backgroundColor,
                backgroundImage: engagementMode === 'canvas' 
                  ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
                  : 'none',
                backgroundSize: engagementMode === 'canvas' ? '20px 20px' : 'auto'
              }}
            >
              <BoardRenderer
                boardInstance={activeBoard}
                onFrameInteraction={(interaction) => {
                  console.log('Board Studio frame interaction:', interaction);
                  handleFrameInteraction(interaction);
                }}
                showLayoutControls={true}
                className="bg-white rounded-lg shadow-sm border border-slate-200"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-100">
              <div className="text-center">
                <Squares2X2Icon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-900 mb-2">No Board Selected</h3>
                <p className="text-slate-600 mb-6">Select a board from the list or create a new one to get started.</p>
                <button
                  onClick={handleCreateBoard}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create New Board</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <AnimatePresence>
        {isPropertiesPanelOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Properties</h3>
                <button
                  onClick={() => setIsPropertiesPanelOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Properties Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeBoard ? (
                <div className="space-y-6">
                  {/* Board Info */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Board Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={boardName}
                          onChange={(e) => setBoardName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          value={boardDescription}
                          onChange={(e) => setBoardDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Settings */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Theme</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={boardTheme.primaryColor}
                            onChange={(e) => setBoardTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={boardTheme.primaryColor}
                            onChange={(e) => setBoardTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 px-3 py-1 border border-slate-300 rounded text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Background Color</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={boardTheme.backgroundColor}
                            onChange={(e) => setBoardTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={boardTheme.backgroundColor}
                            onChange={(e) => setBoardTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="flex-1 px-3 py-1 border border-slate-300 rounded text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Frame Properties */}
                  {selectedFrameId && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-3">Selected Frame</h4>
                      <div className="text-sm text-slate-600">
                        Frame ID: {selectedFrameId}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <CogIcon className="w-8 h-8 mx-auto mb-2" />
                  <p>Select a board to edit properties</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frame Library Drawer */}
      <AnimatePresence>
        {isFrameLibraryOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 h-80 bg-white border-t border-slate-200 shadow-lg z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-900">Frame Library</h3>
                <button
                  onClick={() => setIsFrameLibraryOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search frames..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            {/* Frame List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {Object.entries(framesByCategory).map(([category, frames]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-slate-900 mb-2 capitalize">{category}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {frames.map((frame) => (
                        <motion.div
                          key={frame.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify(frame));
                          }}
                          className="p-3 border border-slate-200 rounded-lg cursor-move hover:border-slate-300 hover:shadow-sm transition-all bg-white"
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">{frame.icon}</div>
                            <h5 className="text-sm font-medium text-slate-900 mb-1">{frame.name}</h5>
                            <p className="text-xs text-slate-600 line-clamp-2">{frame.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoardStudioPage;
