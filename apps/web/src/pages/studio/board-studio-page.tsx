/**
 * Board Studio Page - Redesigned
 * ==============================
 * 
 * Modern, intuitive board editing interface with improved UX.
 * Features drag-and-drop, contextual help, and better discoverability.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  Squares2X2Icon,
  CogIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  AcademicCapIcon,
  CommandLineIcon,
  PaintBrushIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon
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
  helpText?: string;
  useCases?: string[];
}

interface BoardTheme {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  borderColor: string;
}

interface EngagementModeInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  useCases: string[];
  example: string;
}

// =============================================================================
// ENGAGEMENT MODE DEFINITIONS
// =============================================================================

const ENGAGEMENT_MODES: EngagementModeInfo[] = [
  {
    id: 'canvas',
    name: 'Canvas Mode',
    description: 'Freeform layout where you can position frames anywhere. Perfect for creative layouts and custom dashboards.',
    icon: <PaintBrushIcon className="w-5 h-5" />,
    useCases: ['Custom dashboards', 'Creative layouts', 'Data visualization', 'Flexible design'],
    example: 'Like a design canvas - drag frames anywhere to create your perfect layout.'
  },
  {
    id: 'wizard',
    name: 'Wizard Mode',
    description: 'Step-by-step guided flow that walks users through a process. Great for onboarding and complex workflows.',
    icon: <AcademicCapIcon className="w-5 h-5" />,
    useCases: ['Onboarding flows', 'Setup processes', 'Multi-step forms', 'Guided tutorials'],
    example: 'Like a setup wizard - users go through frames one by one in sequence.'
  },
  {
    id: 'dialogic',
    name: 'Dialogic Mode',
    description: 'Conversation-driven interface where AI agents guide the interaction. Perfect for agent-assisted workflows.',
    icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
    useCases: ['AI assistance', 'Agent interactions', 'Conversational UI', 'Guided help'],
    example: 'Like chatting with an assistant - the AI guides you through tasks naturally.'
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    description: 'Single-frame deep dive for concentrated work. Minimizes distractions and maximizes focus on one task.',
    icon: <CommandLineIcon className="w-5 h-5" />,
    useCases: ['Deep work', 'Code editing', 'Writing', 'Single-task focus'],
    example: 'Like full-screen mode - one frame takes center stage for maximum focus.'
  }
];

// =============================================================================
// FRAME TYPE DEFINITIONS WITH ENHANCED HELP
// =============================================================================

const FRAME_TYPES: FrameType[] = [
  {
    id: 'media-card',
    name: 'Media Card',
    type: 'media_card',
    description: 'Rich media presentation with images and content',
    category: 'content',
    icon: '🖼️',
    helpText: 'Display images, videos, or rich content in an attractive card format.',
    useCases: ['Photo galleries', 'Video previews', 'Rich content display', 'Media showcases']
  },
  {
    id: 'preview',
    name: 'Preview Frame',
    type: 'preview',
    description: 'Compact content summary and overview',
    category: 'content',
    icon: '👁️',
    helpText: 'Show a quick preview or summary of content without taking up much space.',
    useCases: ['Content summaries', 'Quick previews', 'Overview cards', 'Status displays']
  },
  {
    id: 'dialog',
    name: 'Dialog Frame',
    type: 'dialog',
    description: 'Guided agent interaction and conversation',
    category: 'interaction',
    icon: '💬',
    helpText: 'Enable conversations with AI agents or interactive dialogs.',
    useCases: ['AI chat', 'Interactive help', 'Guided assistance', 'Q&A interfaces']
  },
  {
    id: 'config-panel',
    name: 'Config Panel',
    type: 'config_panel',
    description: 'Form-based settings and configuration',
    category: 'configuration',
    icon: '⚙️',
    helpText: 'Create forms and settings panels for configuration and data input.',
    useCases: ['Settings forms', 'Configuration panels', 'Data entry', 'Preferences']
  },
  {
    id: 'process-frame',
    name: 'Process Frame',
    type: 'process_frame',
    description: 'Step-based workflow and guided processes',
    category: 'interaction',
    icon: '📋',
    helpText: 'Guide users through multi-step processes with clear progression.',
    useCases: ['Onboarding', 'Setup wizards', 'Multi-step forms', 'Guided workflows']
  },
  {
    id: 'agent-preview',
    name: 'Agent Preview',
    type: 'agent_preview',
    description: 'Agent identity and configuration preview',
    category: 'visualization',
    icon: '🤖',
    helpText: 'Display AI agent information, capabilities, and current status.',
    useCases: ['Agent profiles', 'AI status', 'Bot information', 'Assistant previews']
  },
  {
    id: 'code-snippet',
    name: 'Code Snippet',
    type: 'code_snippet',
    description: 'Code viewer and editor with syntax highlighting',
    category: 'content',
    icon: '💻',
    helpText: 'Display and edit code with syntax highlighting and formatting.',
    useCases: ['Code examples', 'Script editing', 'Documentation', 'Technical content']
  },
  // People-specific frames
  {
    id: 'people-overview',
    name: 'People Overview',
    type: 'preview',
    description: 'Comprehensive people management interface',
    category: 'visualization',
    icon: '👥',
    helpText: 'Manage and view all people across your domains and projects.',
    useCases: ['Team management', 'User directories', 'Contact lists', 'People analytics']
  },
  {
    id: 'role-manager',
    name: 'Role Manager',
    type: 'config_panel',
    description: 'Role and permission management interface',
    category: 'configuration',
    icon: '🛡️',
    helpText: 'Assign roles and manage permissions for team members.',
    useCases: ['Permission management', 'Role assignment', 'Access control', 'Team organization']
  },
  {
    id: 'collaboration-network',
    name: 'Collaboration Network',
    type: 'media_card',
    description: 'Visual network of people and relationships',
    category: 'visualization',
    icon: '🕸️',
    helpText: 'Visualize connections and relationships between team members.',
    useCases: ['Team visualization', 'Relationship mapping', 'Network analysis', 'Collaboration insights']
  }
];

// =============================================================================
// HELP TOOLTIP COMPONENT
// =============================================================================

const HelpTooltip: React.FC<{ 
  content: string; 
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap max-w-xs ${
              position === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' :
              position === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' :
              position === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' :
              'left-full ml-2 top-1/2 transform -translate-y-1/2'
            }`}
          >
            {content}
            <div className={`absolute w-2 h-2 bg-slate-800 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1/2'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// ENGAGEMENT MODE SELECTOR WITH HELP
// =============================================================================

const EngagementModeSelector: React.FC<{
  value: string;
  onChange: (mode: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(
    ENGAGEMENT_MODES.find(mode => mode.id === value) || ENGAGEMENT_MODES[0]
  );

  const handleModeSelect = (mode: EngagementModeInfo) => {
    setSelectedMode(mode);
    onChange(mode.id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
      >
        {selectedMode.icon}
        <span className="text-sm font-medium">{selectedMode.name}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-80"
          >
            {ENGAGEMENT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  selectedMode.id === mode.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">{mode.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">{mode.name}</h4>
                    <p className="text-sm text-slate-600 mb-2">{mode.description}</p>
                    <div className="text-xs text-slate-500 italic">{mode.example}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mode.useCases.slice(0, 3).map((useCase) => (
                        <span
                          key={useCase}
                          className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// ENHANCED FRAME CARD WITH HELP
// =============================================================================

const FrameCard: React.FC<{
  frame: FrameType;
  onDragStart: (frame: FrameType) => void;
  onAddToBoard: (frame: FrameType) => void;
}> = ({ frame, onDragStart, onAddToBoard }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart(frame);
        e.dataTransfer.setData('application/json', JSON.stringify(frame));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`group p-4 border border-slate-200 rounded-lg cursor-move hover:border-slate-300 hover:shadow-md transition-all bg-white relative ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Frame Icon and Basic Info */}
      <div className="text-center mb-3">
        <div className="text-3xl mb-2">{frame.icon}</div>
        <h5 className="text-sm font-semibold text-slate-900 mb-1">{frame.name}</h5>
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">{frame.description}</p>
        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs capitalize">
          {frame.category}
        </span>
      </div>

      {/* Help Text - Shown on Hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="border-t border-slate-200 pt-3 mt-3">
          <p className="text-xs text-slate-500 mb-2">{frame.helpText}</p>
          {frame.useCases && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-700">Use cases:</div>
              <div className="flex flex-wrap gap-1">
                {frame.useCases.slice(0, 2).map((useCase) => (
                  <span
                    key={useCase}
                    className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToBoard(frame);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
        title="Add to board"
      >
        <PlusIcon className="w-3 h-3" />
      </button>

      {/* Drag Indicator */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Bars3Icon className="w-4 h-4 text-slate-400" />
      </div>
    </motion.div>
  );
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Board Studio State
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [frameTypes, setFrameTypes] = useState<FrameType[]>(FRAME_TYPES);
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

  // Drag and Drop State
  const [dragOverBoard, setDragOverBoard] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

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
      // Load boards for current domain using new API endpoint
      const boardsResponse = await fetch(`/api/board-data?domainId=${user?.currentDomainId || 'demo'}`, {
        credentials: 'include',
      });
      
      if (boardsResponse.ok) {
        const boardsData = await boardsResponse.json();
        setBoards(boardsData.boards || []);
        console.log('Loaded boards from API:', boardsData);
      } else {
        console.warn('Board API not available, using fallback data');
        // Fallback data if API not available
        setBoards([
          {
            id: 'agent-board-1',
            name: 'Agent Configuration Board',
            type: 'agent',
            description: 'Configure and manage AI agents',
            lastModified: new Date('2024-01-28'),
            frameCount: 3,
            engagementMode: 'dialogic'
          },
          {
            id: 'domain-board-1',
            name: 'Domain Management Board',
            type: 'domain',
            description: 'Manage domain settings and members',
            lastModified: new Date('2024-01-27'),
            frameCount: 4,
            engagementMode: 'wizard'
          },
          {
            id: 'journey-board-1',
            name: 'Journey Visualization Board',
            type: 'journey',
            description: 'Visualize and manage learning journeys',
            lastModified: new Date('2024-01-26'),
            frameCount: 4,
            engagementMode: 'canvas'
          },
          {
            id: 'keeper-type-board-1',
            name: 'Keeper Type Board',
            type: 'keeper-type',
            description: 'Manage keeper types and capabilities',
            lastModified: new Date('2024-01-25'),
            frameCount: 2,
            engagementMode: 'dialogic'
          },
          {
            id: 'people-board-1',
            name: 'People Management Board',
            type: 'people',
            description: 'Manage team members and roles',
            lastModified: new Date('2024-01-24'),
            frameCount: 5,
            engagementMode: 'canvas'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load boards and frames:', error);
      // Set empty array on error
      setBoards([]);
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

  const handleFrameDragStart = (frame: FrameType) => {
    console.log('Frame drag started:', frame);
  };

  const handleAddFrameToBoard = (frame: FrameType) => {
    console.log('Adding frame to board:', frame);
    // TODO: Implement actual frame addition logic
    alert(`Adding ${frame.name} to board! (Feature coming soon)`);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverBoard(true);
  };

  const handleCanvasDragLeave = () => {
    setDragOverBoard(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBoard(false);
    
    try {
      const frameData = JSON.parse(e.dataTransfer.getData('application/json'));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log('Frame dropped at:', { x, y }, 'Frame:', frameData);
        // TODO: Implement actual frame positioning
        alert(`Dropped ${frameData.name} at position (${Math.round(x)}, ${Math.round(y)})! (Positioning coming soon)`);
      }
    } catch (error) {
      console.error('Error handling frame drop:', error);
    }
  };

  // Filter frames
  const filteredFrameTypes = frameTypes.filter(frame => {
    const matchesSearch = frame.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         frame.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || frame.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const framesByCategory = filteredFrameTypes.reduce((acc, frame) => {
    if (!acc[frame.category]) {
      acc[frame.category] = [];
    }
    acc[frame.category].push(frame);
    return acc;
  }, {} as Record<string, FrameType[]>);

  const categories = ['all', ...Array.from(new Set(frameTypes.map(f => f.category)))];

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Board List Panel */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-slate-900">Board Studio</h2>
              <HelpTooltip content="Create and edit visual boards with drag-and-drop frames">
                <QuestionMarkCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </HelpTooltip>
            </div>
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
                <EngagementModeSelector
                  value={engagementMode}
                  onChange={(mode) => setEngagementMode(mode as any)}
                />
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <HelpTooltip content="Toggle properties panel to edit board settings">
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
            </HelpTooltip>

            <button
              onClick={handleSaveBoard}
              disabled={!activeBoard || isSaving}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Board Canvas */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden">
            {activeBoard ? (
              <div 
                ref={canvasRef}
                className={`w-full h-full p-6 overflow-auto transition-all ${
                  dragOverBoard ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                }`}
                style={{ 
                  backgroundColor: dragOverBoard ? undefined : boardTheme.backgroundColor,
                  backgroundImage: engagementMode === 'canvas' && !dragOverBoard
                    ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
                    : 'none',
                  backgroundSize: engagementMode === 'canvas' ? '20px 20px' : 'auto'
                }}
                onDragOver={handleCanvasDragOver}
                onDragLeave={handleCanvasDragLeave}
                onDrop={handleCanvasDrop}
              >
                {dragOverBoard && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-8 text-center">
                      <SparklesIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-blue-900 mb-2">Drop Frame Here</h3>
                      <p className="text-blue-700">Release to add the frame to your board</p>
                    </div>
                  </div>
                )}
                
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

          {/* Frame Library Sidebar */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
            {/* Frame Library Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-slate-900">Frame Library</h3>
                  <HelpTooltip content="Drag frames onto the canvas or click the + button to add them to your board">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </HelpTooltip>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search frames..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors capitalize ${
                      selectedCategory === category
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-150'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame List with Better Scrolling */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-6">
                {Object.entries(framesByCategory).map(([category, frames]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-slate-900 mb-3 capitalize sticky top-0 bg-white py-1">
                      {category} ({frames.length})
                    </h4>
                    <div className="space-y-3">
                      {frames.map((frame) => (
                        <FrameCard
                          key={frame.id}
                          frame={frame}
                          onDragStart={handleFrameDragStart}
                          onAddToBoard={handleAddFrameToBoard}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {filteredFrameTypes.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <InformationCircleIcon className="w-8 h-8 mx-auto mb-2" />
                    <p>No frames found matching your search.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-slate-900">Properties</h3>
                  <HelpTooltip content="Edit board settings, theme, and frame properties">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </HelpTooltip>
                </div>
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

                  {/* Help Section */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Getting Started</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                        <span>Drag frames from the library onto the canvas</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                        <span>Use engagement modes to control layout behavior</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                        <span>Customize colors and save your board</span>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
};

export default BoardStudioPage;