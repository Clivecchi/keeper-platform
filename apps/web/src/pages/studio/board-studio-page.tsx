/**
 * Board Studio Page - Redesigned
 * ==============================
 * 
 * Modern, intuitive board editing interface with improved UX.
 * Features drag-and-drop, contextual help, and better discoverability.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { Button } from '../../features/board-studio/v0/components/ui/button';
import { ScrollArea } from '../../features/board-studio/v0/components/ui/scroll-area';
import { 
  PlusIcon,
  Squares2X2Icon,
  Bars3Icon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  SparklesIcon,
  AcademicCapIcon,
  CommandLineIcon,
  PaintBrushIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import {
  Plus,
  Edit3,
  Layout,
  Eye,
  Sparkles,
  Book,
  ImageIcon,
  Type,
  MousePointer,
  Bot,
  Video,
  Image,
} from "lucide-react";
import { useBoard } from '../../context/BoardContext';
import { useFrame } from '../../context/FrameContext';
import { useAuth } from '../../context/AuthContext';
import { useKeeperContext } from '../../context/KeeperContext';
import PatternRenderer from '../../features/board-studio/patterns/PatternRenderer';
import type { ExtendedFrameInstance } from '../../types/frame';
import { makeFrameInstance } from '../../utils/frameFactory';
import DraggableTabs from '../../components/studio/DraggableTabs';
import { useAutosave } from '../../hooks/useAutosave';
import ConflictDialog from '../../components/studio/ConflictDialog';
import AIAssistPanel from '../../components/studio/AIAssistPanel';
import TemplateChooser from '../../components/studio/TemplateChooser';
import { type TemplateId } from '../../boards/templates';

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
      onDragStart={() => {
        setIsDragging(true);
        onDragStart(frame);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
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

// Simple error boundary to prevent total page crash
class BoardStudioErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any) {
    console.error('BoardStudio crashed, showing safe fallback:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Board Studio recovered from an error</h1>
            <p className="text-slate-600 mb-4">You can continue by creating a new board. Developer console has details.</p>
            <a href="/studio/board-studio" className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 text-white rounded-lg">Reload Board Studio</a>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

const BoardStudioPage: React.FC = () => {
  console.log('BoardStudioPage: Component initializing');
  
  const { user } = useAuth();
  console.log('BoardStudioPage: useAuth hook called, user:', user);
  
  const { activeBoard, loadBoard, isLoading, addFrame } = useBoard();
  console.log('BoardStudioPage: useBoard hook called, activeBoard:', activeBoard);
  
  const { handleFrameInteraction } = useFrame();
  console.log('BoardStudioPage: useFrame hook called');

  // UI State
  const { activeKeeper, keepers, setActiveKeeperId } = useKeeperContext();
  const [editorMode, setEditorMode] = useState<'edit'|'layout'|'preview'|'assist'>('edit');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [hasInitializedBoard, setHasInitializedBoard] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveError, setShowSaveError] = useState(false);

  // Board Studio State
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [frameTypes, setFrameTypes] = useState<FrameType[]>(FRAME_TYPES);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [openFrameConfigId, setOpenFrameConfigId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<'frame' | 'prop' | null>(null);
  
  // Props Library State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Media: true,
    Content: true,
    Interactive: true,
    AI: true,
  });
  
  // Mock frames for the selected board (since BoardContext might not work)
  const [mockFrames, setMockFrames] = useState<any[]>([]);

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

  const handleBoardSelect = useCallback(async (boardId: string) => {
    if (selectedBoardId === boardId) return; // Prevent re-selecting same board
    
    setSelectedBoardId(boardId);
    setIsLoadingBoards(true);
    setHasInitializedBoard(false); // Reset initialization flag
    
    try {
      console.log('Loading board:', boardId);
      
      // Load full board data from API
      const boardData = await apiFetch(`/api/board-data/${boardId}`);
      
      if (boardData.success && boardData.data) {
        const board = boardData.data;
        setBoardName(board.name);
        setBoardDescription(board.description || '');
        
        // Parse theme and behavior
        const theme = board.theme || {};
        const behavior = board.behavior || {};
        
        setEngagementMode(behavior.defaultPattern || 'canvas');
        setBoardTheme({
          primaryColor: theme.primary || '#3B82F6',
          backgroundColor: theme.background || '#F8FAFC',
          accentColor: '#0F172A',
          borderColor: '#CBD5E1'
        });
        
        // Debug the raw board data from API
        console.log('🔍 Debug: Raw board data from API:', {
          boardId: board.id,
          boardName: board.name,
          totalFrames: board.frames?.length || 0,
          framesWithProps: board.frames?.filter((f: any) => f.props && Object.keys(f.props as object).length > 0).length || 0,
          rawFrames: board.frames
        });

        // Set frames from API data
        const frames = (board.frames || []).map((frame: any) => ({
          id: frame.id,
          data: { 
            name: frame.name,
            role: frame.role 
          },
          FrameConfig: { 
            engagementMode: frame.pattern,
            role: frame.role 
          },
          props: frame.props || {},
          layoutKind: frame.layoutKind,
          layoutData: frame.layoutData || {},
          orderIndex: frame.orderIndex
        }));
        
        console.log('🔍 Debug: Processed frames for mockFrames:', {
          processedFrames: frames.length,
          framesWithProps: frames.filter((f: any) => f.props && Object.keys(f.props as object).length > 0).length,
          frameDetails: frames.map((f: any) => ({
            id: f.id,
            name: f.data.name,
            role: f.data.role,
            hasProps: !!f.props,
            propsCount: f.props ? Object.keys(f.props as object).length : 0,
            props: f.props
          }))
        });
        
        setMockFrames(frames);
        // Select the content frame (not cover) by default
        const contentFrame = frames.find((f: any) => f.data?.role !== 'cover' && f.data?.role !== 'settings') || frames[1] || frames[0];
        setSelectedFrameId(contentFrame?.id || null);
        
        // Update etag for autosave conflict detection
        if (board.etag) {
          autosave.updateEtag(board.etag);
        }
        
        console.log('Board loaded successfully:', board);
        
        // Set initialization flag after a delay to prevent immediate autosave
        setTimeout(() => {
          setHasInitializedBoard(true);
        }, 1000);
      } else {
        throw new Error('Invalid board data received');
      }
    } catch (error) {
      console.error('Failed to load board:', error);
      setBoardName('Error Loading Board');
      setBoardDescription('Please try selecting another board');
      
      // Fallback to basic frames
      const defaultFrames = [
        {
          id: 'cover-frame',
          data: { name: 'Cover', role: 'cover' },
          FrameConfig: { engagementMode: 'focus', role: 'cover' }
        },
        {
          id: 'settings-frame',
          data: { name: 'Settings', role: 'settings' },
          FrameConfig: { engagementMode: 'form', role: 'settings' }
        }
      ];
      setMockFrames(defaultFrames);
      setSelectedFrameId(defaultFrames[0]?.id || null);
    } finally {
      setIsLoadingBoards(false);
    }
  }, [selectedBoardId]);

  // Load boards and frame types on mount
  useEffect(() => {
    loadBoardsAndFrames();
  }, []);

  // Auto-select first board if none selected
  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId && !isLoadingBoards) {
      console.log('Auto-selecting first board:', boards[0].id);
      handleBoardSelect(boards[0].id);
    }
  }, [boards, selectedBoardId, isLoadingBoards, handleBoardSelect]);

  // Debug modal state
  useEffect(() => {
    console.log('showHelpModal state changed:', showHelpModal);
  }, [showHelpModal]);

  // Note: Board properties are now managed in handleBoardSelect to avoid conflicts

  const loadBoardsAndFrames = async () => {
    try {
      console.log('Loading boards from API...');
      // Load boards using the correct API endpoint
      const boardsData = await apiFetch(`/api/board-data?keeperId=${activeKeeper?.id || '00000000-0000-0000-0000-000000000001'}`);
      
      // Transform API response to match our BoardListItem interface
      const transformedBoards = (boardsData.data || []).map((board: any) => ({
        id: board.id,
        name: board.name,
        type: board.type,
        description: board.description,
        lastModified: new Date(board.lastModified),
        frameCount: board.frameCount || 0,
        engagementMode: board.engagementMode || 'canvas'
      }));
      
      setBoards(transformedBoards);
      console.log('Loaded boards from API:', transformedBoards);
    } catch (error) {
      console.warn('Board API not available, using fallback data:', error);
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
        }
      ]);
    }
  };

  const handleCreateBoard = async () => {
    if (!activeKeeper?.id) {
      console.error('No active keeper available for board creation');
      return;
    }

    // Show template chooser
    setShowTemplateChooser(true);
  };

  const handleCreateBoardWithTemplate = async (templateId: TemplateId | null) => {
    try {
      if (!activeKeeper?.id) {
        console.error('No active keeper available for board creation');
        return;
      }

      const timestamp = Date.now();
      const newBoard = {
        keeperId: activeKeeper.id,
        name: 'New Board',
        slug: `new-board-${timestamp}`,
        description: 'A new custom board',
        templateId // Add template ID to request
      };

      // Try to create via API first
      try {
        const createdBoard = await apiFetch('/api/board-data', {
          method: 'POST',
          body: JSON.stringify(newBoard)
        });
        
        console.log('Board created via API:', createdBoard);
        
        if (createdBoard.success && createdBoard.data) {
          const boardData = createdBoard.data;
          const newBoardItem = {
            id: boardData.id,
            name: boardData.name,
            type: 'custom',
            description: boardData.description || '',
            lastModified: new Date(boardData.updatedAt),
            frameCount: boardData.frames?.length || 2, // Cover + Settings
            engagementMode: 'canvas'
          };
          
          setBoards(prev => [...prev, newBoardItem]);
          setSelectedBoardId(boardData.id);
          
          // Set board properties
          setBoardName(boardData.name);
          setBoardDescription(boardData.description || '');
          setEngagementMode('canvas');
          setBoardTheme({
            primaryColor: '#3B82F6',
            backgroundColor: '#F8FAFC',
            accentColor: '#0F172A',
            borderColor: '#CBD5E1'
          });
          
          console.log('New board created successfully:', newBoardItem);
        }
      } catch (apiError) {
        console.error('Board creation API failed:', apiError);
        alert('Failed to create board. Please try again.');
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  // Autosave save function
  const saveBoard = async (data: any, options?: { etag?: string; force?: boolean }) => {
    if (!selectedBoardId) throw new Error('No board selected');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add etag for conflict detection
    if (options?.etag) {
      headers['If-Match'] = options.etag;
    }

    // Add force parameter if specified
    const url = options?.force 
      ? `/api/board-data/${selectedBoardId}?force=true`
      : `/api/board-data/${selectedBoardId}`;

    return await apiFetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
  };

  // Autosave hook with improved error handling
  const autosave = useAutosave(saveBoard, {
    debounceMs: 800,
    enabled: true,
    onConflict: (conflictData) => {
      setConflictData(conflictData);
      setShowConflictDialog(true);
    },
    onError: (error) => {
      console.error('Autosave error:', error);
      setSaveError(error);
      setShowSaveError(true);
      
      // Emit telemetry event for error
      console.log('Telemetry: board_save_error', { 
        boardId: selectedBoardId, 
        error,
        timestamp: new Date().toISOString()
      });
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setShowSaveError(false);
      }, 5000);
    },
    onSuccess: () => {
      console.log('Board autosaved successfully');
      setSaveError(null);
      setShowSaveError(false);
      
      // Emit telemetry event for success
      console.log('Telemetry: board_save_success', { 
        boardId: selectedBoardId,
        timestamp: new Date().toISOString()
      });
    }
  });

  const handleSaveBoard = async () => {
    if (!selectedBoardId) return;

    setIsSaving(true);
    try {
      const boardToSave = {
        name: boardName,
        description: boardDescription,
        theme: {
          primary: boardTheme.primaryColor,
          background: boardTheme.backgroundColor
        },
        behavior: {
          showGrid: true,
          snapToGrid: true,
          gridSize: 8,
          defaultPattern: engagementMode
        }
      };

      // Try to save via API
      try {
        const savedBoard = await apiFetch(`/api/board-data/${selectedBoardId}`, {
          method: 'PUT',
          body: JSON.stringify(boardToSave)
        });
        console.log('Board saved successfully via API:', savedBoard);
      } catch (apiError) {
        console.error('Board save API failed:', apiError);
        alert('Failed to save board. Please try again.');
        return;
      }

      // Update Cover frame title binding (Phase 1 requirement)
      const coverFrame = mockFrames.find(frame => frame.data?.role === 'cover');
      if (coverFrame) {
        try {
          const updatedProps = {
            ...coverFrame.props,
            title: boardName, // Bind Cover title to Board name
            subtitle: boardDescription || coverFrame.props?.subtitle
          };

          await apiFetch(`/api/board-data/${selectedBoardId}/frames/${coverFrame.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ props: updatedProps })
          });

          // Update local frame state
          setMockFrames(prev => prev.map(frame =>
            frame.id === coverFrame.id
              ? { ...frame, props: updatedProps }
              : frame
          ));
          
          console.log('Cover frame title updated to match board name');
        } catch (frameError) {
          console.warn('Failed to update Cover frame title:', frameError);
        }
      }

      // Update local boards list
      setBoards(prev => prev.map(board => 
        board.id === selectedBoardId 
          ? { ...board, name: boardName, description: boardDescription, lastModified: new Date() }
          : board
      ));
      
      console.log('Board saved successfully');
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Conflict resolution handlers
  const handleConflictResolve = (resolution: 'server' | 'overwrite') => {
    if (resolution === 'server') {
      // Reload from server
      const serverVersion = autosave.resolveConflictWithServer();
      if (serverVersion) {
        // Update local state with server data
        setBoardName(serverVersion.name || '');
        setBoardDescription(serverVersion.description || '');
        setBoardTheme({
          primaryColor: serverVersion.theme?.primary || '#3B82F6',
          backgroundColor: serverVersion.theme?.background || '#FFFFFF',
          accentColor: '#0F172A',
          borderColor: '#CBD5E1'
        });
        setEngagementMode(serverVersion.behavior?.defaultPattern || 'dialogic');
        
        // Update frames if present
        if (serverVersion.frames) {
          setMockFrames(serverVersion.frames.map((frame: any) => ({
            id: frame.id,
            data: { name: frame.name, role: frame.role },
            FrameConfig: { engagementMode: frame.pattern },
            frameType: frame.frameType,
            layoutKind: frame.layoutKind,
            layoutData: frame.layoutData,
            props: frame.props,
            orderIndex: frame.orderIndex
          })));
        }
      }
    } else {
      // Force overwrite
      const boardToSave = {
        name: boardName,
        description: boardDescription,
        theme: {
          primary: boardTheme.primaryColor,
          background: boardTheme.backgroundColor
        },
        behavior: {
          showGrid: true,
          snapToGrid: true,
          gridSize: 8,
          defaultPattern: engagementMode
        }
      };
      autosave.forceSave(boardToSave);
    }
    
    setShowConflictDialog(false);
    setConflictData(null);
  };

  // Trigger autosave when board data changes (but not during loading or initial setup)
  useEffect(() => {
    if (selectedBoardId && boardName && !isLoadingBoards && hasInitializedBoard) {
      const boardData = {
        name: boardName,
        description: boardDescription,
        theme: {
          primary: boardTheme.primaryColor,
          background: boardTheme.backgroundColor
        },
        behavior: {
          showGrid: true,
          snapToGrid: true,
          gridSize: 8,
          defaultPattern: engagementMode
        }
      };
      
      console.log('Triggering autosave for board:', selectedBoardId);
      autosave.save(boardData);
    }
  }, [selectedBoardId, boardName, boardDescription, boardTheme.primaryColor, boardTheme.backgroundColor, engagementMode, isLoadingBoards, hasInitializedBoard]);

  // Update etag when loading board
  useEffect(() => {
    if (selectedBoardId) {
      handleBoardSelect(selectedBoardId);
    }
  }, [selectedBoardId]);

  const handleTabReorder = async (newOrder: string[]) => {
    if (!selectedBoardId) return;
    
    try {
      const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: newOrder })
      });
      
      if (response.success) {
        // Update local frame order
        const reorderedFrames = newOrder.map((frameId, index) => {
          const frame = mockFrames.find(f => f.id === frameId);
          return frame ? { ...frame, orderIndex: index } : null;
        }).filter(Boolean);
        
        setMockFrames(reorderedFrames as any[]);
        console.log('Tabs reordered successfully');
        
        // Emit telemetry event
        console.log('Telemetry: frame_reordered', { 
          boardId: selectedBoardId, 
          newOrder,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Failed to reorder tabs:', response.error);
      }
    } catch (error) {
      console.error('Error reordering tabs:', error);
    }
  };

  const handleFrameModeChange = async (frameId: string, newMode: string) => {
    if (!selectedBoardId) return;
    
    try {
      console.log('Changing frame mode:', frameId, newMode);
      
      // Update local state immediately for responsive UI
      setMockFrames(prev => prev.map(frame =>
        frame.id === frameId
          ? { 
              ...frame, 
              FrameConfig: { 
                ...frame.FrameConfig, 
                engagementMode: newMode 
              } 
            }
          : frame
      ));
      
      // Persist to server
      const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames/${frameId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          engagementMode: newMode,
          pattern: newMode // Also update pattern field for compatibility
        })
      });
      
      if (response.success) {
        console.log('Frame mode updated successfully');
        
        // Emit telemetry event
        console.log('Telemetry: frame_mode_changed', { 
          boardId: selectedBoardId, 
          frameId, 
          newMode,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Failed to update frame mode:', response.error);
        // Revert local state on error
        setMockFrames(prev => prev.map(frame =>
          frame.id === frameId
            ? { 
                ...frame, 
                FrameConfig: { 
                  ...frame.FrameConfig, 
                  engagementMode: frame.FrameConfig?.engagementMode || 'canvas' 
                } 
              }
            : frame
        ));
      }
    } catch (error) {
      console.error('Error updating frame mode:', error);
      // Revert local state on error
      setMockFrames(prev => prev.map(frame =>
        frame.id === frameId
          ? { 
              ...frame, 
              FrameConfig: { 
                ...frame.FrameConfig, 
                engagementMode: frame.FrameConfig?.engagementMode || 'canvas' 
              } 
            }
          : frame
      ));
    }
  };

  const handleFramePinToggle = async (frameId: string, isPinned: boolean) => {
    if (!selectedBoardId) return;
    
    try {
      console.log('Toggling frame pin:', frameId, isPinned);
      
      // Update local state immediately for responsive UI
      setMockFrames(prev => prev.map(frame =>
        frame.id === frameId
          ? { 
              ...frame, 
              data: { 
                ...frame.data, 
                isPinned: isPinned 
              } 
            }
          : frame
      ));
      
      // Persist to server
      const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames/${frameId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          isPinned: isPinned
        })
      });
      
      if (response.success) {
        console.log('Frame pin status updated successfully');
        
        // Emit telemetry event
        console.log('Telemetry: frame_pin_toggled', { 
          boardId: selectedBoardId, 
          frameId, 
          isPinned,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Failed to update frame pin status:', response.error);
        // Revert local state on error
        setMockFrames(prev => prev.map(frame =>
          frame.id === frameId
            ? { 
                ...frame, 
                data: { 
                  ...frame.data, 
                  isPinned: !isPinned 
                } 
              }
            : frame
        ));
      }
    } catch (error) {
      console.error('Error updating frame pin status:', error);
      // Revert local state on error
      setMockFrames(prev => prev.map(frame =>
        frame.id === frameId
          ? { 
              ...frame, 
              data: { 
                ...frame.data, 
                isPinned: !isPinned 
              } 
            }
          : frame
      ));
    }
  };

  const handleFrameDelete = async (frameId: string) => {
    if (!selectedBoardId) return;
    
    try {
      console.log('Deleting frame:', frameId);
      
      // Find the frame to get its name for logging
      const frameToDelete = mockFrames.find(frame => frame.id === frameId);
      
      // Update local state immediately for responsive UI
      setMockFrames(prev => {
        const remainingFrames = prev.filter(frame => frame.id !== frameId);
        
        // If the deleted frame was selected, select the first remaining frame
        if (selectedFrameId === frameId) {
          if (remainingFrames.length > 0) {
            setSelectedFrameId(remainingFrames[0].id);
          } else {
            setSelectedFrameId(null);
          }
        }
        
        return remainingFrames;
      });
      
      // Persist to server
      const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames/${frameId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        console.log('Frame deleted successfully');
        
        // Emit telemetry event
        console.log('Telemetry: frame_deleted', { 
          boardId: selectedBoardId, 
          frameId,
          frameName: frameToDelete?.data?.name || 'Unknown',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Failed to delete frame:', response.error);
        // Revert local state on error
        setMockFrames(prev => {
          // Re-add the frame if deletion failed
          if (frameToDelete) {
            return [...prev, frameToDelete].sort((a, b) => {
              // Maintain original order - this is simplified, ideally we'd store the original index
              return a.id.localeCompare(b.id);
            });
          }
          return prev;
        });
        
        // Restore selection if needed
        if (selectedFrameId === frameId) {
          setSelectedFrameId(frameId);
        }
      }
    } catch (error) {
      console.error('Error deleting frame:', error);
      // Revert local state on error - same as above
      const frameToDelete = mockFrames.find(frame => frame.id === frameId);
      setMockFrames(prev => {
        if (frameToDelete) {
          return [...prev, frameToDelete].sort((a, b) => a.id.localeCompare(b.id));
        }
        return prev;
      });
      
      if (selectedFrameId === frameId) {
        setSelectedFrameId(frameId);
      }
    }
  };

  const handleFrameDragStart = (frame: FrameType) => {
    console.log('Frame drag started:', frame);
  };

  const handleAddFrameToBoard = async (frame: FrameType) => {
    if (!selectedBoardId) {
      alert('Please select a board first');
      return;
    }

    try {
      console.log('Adding frame to board:', frame);
      
      // Create a new frame instance
      const newFrame = {
        id: `frame-${Date.now()}`,
        data: {
          name: frame.name,
          description: frame.description,
          category: frame.category,
          icon: frame.icon,
        },
        FrameConfig: {
          engagementMode: 'dialogic', // Default pattern
        }
      };

      // Add to mock frames immediately for responsive UI
      setMockFrames(prev => [...prev, newFrame]);
      setSelectedFrameId(newFrame.id);
      
      console.log(`Added ${frame.name} to board locally`);
      
      // Persist the frame to the backend
      try {
        const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames`, {
          method: 'POST',
          body: JSON.stringify({
            id: newFrame.id,
            name: frame.name,
            description: frame.description,
            category: frame.category,
            icon: frame.icon,
            pattern: 'dialogic',
            props: {},
            layoutKind: 'default',
            layoutData: {},
            orderIndex: 0
          })
        });
        
        if (response.success) {
          console.log('Frame persisted to backend successfully');
        } else {
          console.error('Failed to persist frame to backend:', response.error);
          // Optionally revert the optimistic update
        }
      } catch (error) {
        console.error('Error persisting frame to backend:', error);
        // Optionally revert the optimistic update
      }
      
      // Try to add via the board context as well (but don't break if it fails)
      try {
        if (activeBoard && addFrame) {
          // Create a proper frame instance for the context
          const contextFrame = makeFrameInstance({
            name: newFrame.data.name,
            role: 'settings',
            pattern: 'preview',
            props: {},
            entityType: 'board',
            entityId: activeBoard.id,
            configId: 'context'
          });
          await addFrame(activeBoard.id, contextFrame);
        }
      } catch (contextError) {
        console.warn('Board context add frame failed, but continuing with local state:', contextError);
      }
      
      console.log(`Added ${frame.name} to board successfully`);
      
    } catch (error) {
      console.error('Error adding frame to board:', error);
      alert('Failed to add frame to board');
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Only show board drop state for frames, not props
    if (draggedItemType === 'frame') {
      setDragOverBoard(true);
    }
    // For props, we don't set dragOverBoard - they should be dropped on frames
  };

  const handleCanvasDragLeave = () => {
    setDragOverBoard(false);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBoard(false);
    setDraggedItemType(null);
    
    try {
      // Try to get JSON data first (new format)
      let draggedData;
      const jsonData = e.dataTransfer.getData('application/json');
      const textData = e.dataTransfer.getData('text/plain');
      
      if (jsonData) {
        draggedData = JSON.parse(jsonData);
      } else if (textData) {
        draggedData = JSON.parse(textData);
      } else {
        console.error('No drag data found');
        return;
      }
      
      // Check if this is a frame or prop
      if (draggedData.name && draggedData.description && draggedData.category) {
        // This is a frame being dropped on the board
        if (selectedBoardId) {
          console.log('Frame dropped:', draggedData);
          
          // Create a new frame instance
          const newFrame = {
            id: `frame-${Date.now()}`,
            data: {
              name: draggedData.name,
              description: draggedData.description,
              category: draggedData.category,
              icon: draggedData.icon,
            },
            FrameConfig: {
              engagementMode: 'dialogic',
            }
          };

          // Add to mock frames immediately for responsive UI
          setMockFrames(prev => [...prev, newFrame]);
          setSelectedFrameId(newFrame.id);
          
          console.log(`Dropped and added ${draggedData.name} to board`);
          
          // Persist the frame to the backend
          try {
            const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames`, {
              method: 'POST',
              body: JSON.stringify({
                id: newFrame.id,
                name: draggedData.name,
                description: draggedData.description,
                category: draggedData.category,
                icon: draggedData.icon,
                pattern: 'dialogic',
                props: {},
                layoutKind: 'default',
                layoutData: {},
                orderIndex: 0
              })
            });
            
            if (response.success) {
              console.log('Frame persisted to backend successfully');
            } else {
              console.error('Failed to persist frame to backend:', response.error);
              // Optionally revert the optimistic update
            }
          } catch (error) {
            console.error('Error persisting frame to backend:', error);
            // Optionally revert the optimistic update
          }
        }
      } else if (draggedData.type && draggedData.config) {
        // This is a prop being dropped - should not happen on canvas
        console.log('Prop dropped on canvas - this should not happen. Props should be dropped on frames.');
      }
    } catch (error) {
      console.error('Error handling drop:', error);
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

  console.log('BoardStudioPage: About to render component');
  
  // Simple test render to see if component loads
  if (!user) {
    return (
      <div className="p-8">
        <h1>Board Studio - Loading...</h1>
        <p>Waiting for authentication...</p>
      </div>
    );
  }
  
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

          {/* Header is clean - Save belongs with board tools */}
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Sidebar - Boards List Only */}
        <aside className="w-64 bg-white border-r">
          <div className="p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Boards</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={handleCreateBoard}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Board List Items */}
              <div className="space-y-1">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">Loading boards...</span>
                  </div>
                ) : boards.length > 0 ? (
                  boards.map((board) => (
                    <div 
                      key={board.id}
                      onClick={() => handleBoardSelect(board.id)}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedBoardId === board.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        selectedBoardId === board.id ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{board.name}</span>
                      <span className="text-xs text-gray-500">{board.frameCount} frames</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <span className="text-xs text-gray-500">No boards found</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-gray-100 p-4">
          {/* Mode Toolbar - Above Board Composition */}
          <div className="flex items-center justify-between mb-4 bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-gray-200/50">
            <div className="flex items-center gap-1">
              <Button 
                variant={editorMode === 'edit' ? 'default' : 'ghost'} 
                size="sm"
                className={`h-8 px-3 text-xs transition-all ${
                  editorMode === 'edit' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm text-gray-700'
                }`}
                onClick={() => setEditorMode('edit')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant={editorMode === 'layout' ? 'default' : 'ghost'} 
                size="sm"
                className={`h-8 px-3 text-xs transition-all ${
                  editorMode === 'layout' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm text-gray-700'
                }`}
                onClick={() => setEditorMode('layout')}
              >
                <Layout className="w-4 h-4 mr-2" />
                Layout
              </Button>
              <Button 
                variant={editorMode === 'preview' ? 'default' : 'ghost'} 
                size="sm"
                className={`h-8 px-3 text-xs transition-all ${
                  editorMode === 'preview' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm text-gray-700'
                }`}
                onClick={() => setEditorMode('preview')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant={editorMode === 'assist' ? 'default' : 'ghost'} 
                size="sm"
                className={`h-8 px-3 text-xs transition-all ${
                  editorMode === 'assist' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm text-gray-700'
                }`}
                onClick={() => setEditorMode('assist')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI assist
              </Button>
            </div>
            
            {/* Save Button - Right justified for prominence */}
            {selectedBoardId && (
              <div className="flex items-center space-x-2">
                {/* Autosave status - Non-blocking error display */}
                <div className="text-xs text-gray-500">
                  {autosave.status === 'saving' && 'Saving...'}
                  {autosave.status === 'saved' && autosave.lastSaved && (
                    `Saved ${autosave.lastSaved.toLocaleTimeString()}`
                  )}
                  {autosave.status === 'error' && showSaveError && (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">Save failed</span>
                      <button
                        onClick={() => {
                          setSaveError(null);
                          setShowSaveError(false);
                          handleSaveBoard();
                        }}
                        className="text-red-600 hover:text-red-700 underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {autosave.status === 'conflict' && (
                    <span className="text-amber-600">Conflict detected</span>
                  )}
                  {autosave.status === 'idle' && !showSaveError && 'Auto-save enabled'}
                </div>
                
                <Button
                  onClick={handleSaveBoard}
                  disabled={isSaving}
                  size="sm"
                  className="h-8 px-3 text-xs bg-green-600 text-white hover:bg-green-700 shadow-sm transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Now'}
                </Button>
              </div>
            )}
          </div>

          {/* Board Composition Area */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Board Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{boardName || 'Untitled Board'}</span>
                  {boardDescription && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs text-gray-600">{boardDescription}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {mockFrames.length} frame{mockFrames.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Frame Tabs - Inside Board Composition */}
            <div className="border-b border-dotted border-gray-300 bg-white">
              <div className="flex items-center justify-between">
                <DraggableTabs
                  tabs={mockFrames.map((frame: any) => ({
                    id: frame.id,
                    name: frame.data?.name || 'Frame',
                    role: frame.data?.role,
                    pattern: frame.FrameConfig?.engagementMode || 'canvas',
                    isPinned: frame.data?.isPinned || false,
                    allowedModes: ['default', 'canvas', 'dialogic', 'wizard', 'focus']
                  }))}
                  selectedTabId={selectedFrameId || undefined}
                  onTabSelect={setSelectedFrameId}
                  onTabReorder={handleTabReorder}
                  onTabConfig={(tabId) => setOpenFrameConfigId(tabId)}
                  onModeChange={handleFrameModeChange}
                  onPinToggle={handleFramePinToggle}
                  onDelete={handleFrameDelete}
                />
                <div className="px-4 py-2">
                  <Button
                    onClick={() => {
                      if (selectedBoardId) {
                        const newFrame = {
                          id: `frame-${Date.now()}`,
                          data: { name: `Frame ${mockFrames.length + 1}` },
                          FrameConfig: { engagementMode: 'dialogic' }
                        };
                        setMockFrames(prev => [...prev, newFrame]);
                        setSelectedFrameId(newFrame.id);
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700"
                    disabled={!selectedBoardId}
                  >
                    <Plus className="w-3 h-3" />
                    Add Frame
                  </Button>
                </div>
              </div>
            </div>

            {/* Canvas Area - Inside Board Composition */}
            <div className="flex-1 bg-white">
            <div className="h-full flex items-center justify-center p-8">
              {isLoadingBoards ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading board...</p>
                </div>
              ) : selectedBoardId ? (
                <div 
                  ref={canvasRef}
                  className="w-full h-full"
                  onDragOver={handleCanvasDragOver}
                  onDragLeave={handleCanvasDragLeave}
                  onDrop={handleCanvasDrop}
                >
                  {dragOverBoard ? (
                    <div className="w-full h-96 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-blue-600">
                        <SparklesIcon className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Drop Frame Here</h3>
                        <p>Release to add the frame to your board</p>
                      </div>
                    </div>
                  ) : editorMode === 'preview' ? (
                    <div className="w-full h-full p-8">
                      {selectedFrameId && mockFrames.length > 0 ? (
                        <PatternRenderer
                          frame={{
                            id: selectedFrameId,
                            name: mockFrames.find(f => f.id === selectedFrameId)?.data?.name || 'Frame Content',
                            pattern: mockFrames.find(f => f.id === selectedFrameId)?.FrameConfig?.engagementMode || 'canvas',
                            frameType: mockFrames.find(f => f.id === selectedFrameId)?.frameType || 'media_card',
                            layoutKind: mockFrames.find(f => f.id === selectedFrameId)?.layoutKind || 'canvas',
                            layoutData: mockFrames.find(f => f.id === selectedFrameId)?.layoutData || {},
                            props: mockFrames.find(f => f.id === selectedFrameId)?.props || {},
                            role: mockFrames.find(f => f.id === selectedFrameId)?.data?.role
                          }}
                          mode={editorMode}
                          boardName={boardName}
                          boardDescription={boardDescription}
                          boardData={{
                            id: selectedBoardId,
                            name: boardName,
                            slug: `board-${selectedBoardId}`,
                            description: boardDescription,
                            theme: boardTheme,
                            behavior: {
                              showGrid: true,
                              snapToGrid: true,
                              gridSize: 8,
                              defaultPattern: engagementMode
                            },
                            data: {
                              scope: 'keeper',
                              entityId: activeKeeper?.id
                            },
                            access: {
                              visibility: 'private',
                              allowComments: false,
                              shareLinkEnabled: false
                            }
                          }}
                          frames={mockFrames.map(f => ({
                            id: f.id,
                            name: f.data?.name || 'Frame',
                            role: f.data?.role
                          }))}
                          onFrameUpdate={async (frameId, updates) => {
                            console.log('🔄 Board Studio: onFrameUpdate called in Preview mode', { 
                              frameId, 
                              updates,
                              selectedBoardId 
                            });
                            // In preview mode, we might not want to allow updates
                            // But we'll keep the handler for consistency
                          }}
                          onBoardUpdate={handleSaveBoard}
                        />
                      ) : (
                        <div className="text-center">
                          <Squares2X2Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-medium text-gray-900 mb-2">No Frame Selected</h3>
                          <p className="text-gray-600 mb-6">Select a frame to preview its content.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full p-8">
                      {selectedFrameId && mockFrames.length > 0 ? (
                        <>
                          {/* Debug info - remove after fixing */}
                          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                            <strong>Debug Info:</strong><br/>
                            Selected Frame ID: {selectedFrameId}<br/>
                            Total Frames: {mockFrames.length}<br/>
                            Frame Roles: {mockFrames.map(f => `${f.data?.name}(${f.data?.role})`).join(', ')}<br/>
                            Selected Frame Role: {mockFrames.find(f => f.id === selectedFrameId)?.data?.role}<br/>
                            Selected Frame Pattern: {mockFrames.find(f => f.id === selectedFrameId)?.FrameConfig?.engagementMode}<br/>
                            Mode: {editorMode}
                          </div>
                          <PatternRenderer
                          frame={{
                            id: selectedFrameId,
                            name: mockFrames.find(f => f.id === selectedFrameId)?.data?.name || 'Frame Content',
                            pattern: mockFrames.find(f => f.id === selectedFrameId)?.FrameConfig?.engagementMode || 'canvas',
                            frameType: mockFrames.find(f => f.id === selectedFrameId)?.frameType || 'media_card',
                            layoutKind: mockFrames.find(f => f.id === selectedFrameId)?.layoutKind || 'canvas',
                            layoutData: mockFrames.find(f => f.id === selectedFrameId)?.layoutData || {},
                            props: mockFrames.find(f => f.id === selectedFrameId)?.props || {},
                            role: mockFrames.find(f => f.id === selectedFrameId)?.data?.role
                          }}
                          mode={editorMode}
                          boardName={boardName}
                          boardDescription={boardDescription}
                          boardData={{
                            id: selectedBoardId,
                            name: boardName,
                            slug: `board-${selectedBoardId}`,
                            description: boardDescription,
                            theme: boardTheme,
                            behavior: {
                              showGrid: true,
                              snapToGrid: true,
                              gridSize: 8,
                              defaultPattern: engagementMode
                            },
                            data: {
                              scope: 'keeper',
                              entityId: activeKeeper?.id
                            },
                            access: {
                              visibility: 'private',
                              allowComments: false,
                              shareLinkEnabled: false
                            }
                          }}
                          frames={mockFrames.map(f => ({
                            id: f.id,
                            name: f.data?.name || 'Frame',
                            role: f.data?.role
                          }))}
                          onFrameUpdate={async (frameId, updates) => {
                            console.log('🔄 Board Studio: onFrameUpdate called', { 
                              frameId, 
                              updates,
                              selectedBoardId 
                            });

                            try {
                              // Update frame via API
                              console.log('📡 Board Studio: Making PATCH request to API...');
                              const response = await apiFetch(`/api/board-data/${selectedBoardId}/frames/${frameId}`, {
                                method: 'PATCH',
                                body: JSON.stringify(updates)
                              });
                              
                              console.log('📡 Board Studio: API response received:', response);
            
            // Debug the frame data being loaded
            if (response.data && response.data.frames) {
              const framesResp = ((response.data as any)?.frames ?? []) as ExtendedFrameInstance[];
              console.log('🔍 Debug: Frame data from API:', {
                totalFrames: framesResp.length,
                framesWithProps: framesResp.filter((f: ExtendedFrameInstance) => f.props && Object.keys(f.props as object).length > 0).length,
                frameDetails: framesResp.map((f: ExtendedFrameInstance) => ({
                  id: f.id,
                  name: (f as any).name || (f as any).data?.name,
                  role: (f as any).data?.role,
                  hasProps: !!f.props,
                  propsCount: f.props ? Object.keys(f.props as object).length : 0,
                  props: f.props
                }))
              });
            }
                              
                              // Update local state
                              console.log('💾 Board Studio: Updating local mockFrames state...');
                              setMockFrames(prev => {
                                const updated = prev.map(frame =>
                                  frame.id === frameId ? { ...frame, ...updates } : frame
                                );
                                console.log('📋 Board Studio: Updated mockFrames:', updated);
                                return updated;
                              });
                              
                              console.log('✅ Board Studio: Frame updated successfully');
                            } catch (error) {
                              console.error('❌ Board Studio: Failed to update frame:', error);
                              throw error;
                            }
                          }}
                          onBoardUpdate={handleSaveBoard}
                        />
                        </>
                      ) : (
                        <div className="w-full max-w-4xl mx-auto">
                          <div className="w-full h-96 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <div className="text-center text-white">
                              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <BookOpenIcon className="w-8 h-8" />
                              </div>
                              <h1 className="text-2xl font-bold mb-2">{boardName || 'Untitled Board'}</h1>
                              <p className="text-blue-100">{boardDescription || 'Discover the journey behind our latest innovation'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Squares2X2Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Board Selected</h3>
                  <p className="text-gray-600 mb-6">Select a board from the list or create a new one to get started.</p>
                  <Button onClick={handleCreateBoard} className="inline-flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Create New Board</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          </div>
        </main>

        {/* Right Sidebar - Props Library or AI Assist */}
        {(editorMode === 'edit' || editorMode === 'assist') && (
          <aside className="w-80 bg-white border-l">
            {editorMode === 'assist' ? (
              <AIAssistPanel
                boardId={selectedBoardId || undefined}
                selectedFrameId={selectedFrameId || undefined}
                selectedFrame={selectedFrameId ? {
                  name: mockFrames.find(f => f.id === selectedFrameId)?.data?.name || 'Frame',
                  pattern: mockFrames.find(f => f.id === selectedFrameId)?.FrameConfig?.engagementMode || 'canvas',
                  frameType: mockFrames.find(f => f.id === selectedFrameId)?.frameType || 'media_card',
                  props: mockFrames.find(f => f.id === selectedFrameId)?.props || {}
                } : undefined}
                boardName={boardName}
                boardDescription={boardDescription}
                onApplySuggestion={async (frameId, updates) => {
                  try {
                    // Apply suggestions to frame props
                    await apiFetch(`/api/board-data/${selectedBoardId}/frames/${frameId}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ props: updates })
                    });
                    
                    // Update local state
                    setMockFrames(prev => prev.map(frame =>
                      frame.id === frameId ? { ...frame, props: { ...frame.props, ...updates } } : frame
                    ));
                    
                    console.log('AI suggestions applied successfully');
                  } catch (error) {
                    console.error('Failed to apply AI suggestions:', error);
                  }
                }}
                className="h-full"
              />
            ) : (
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
                      onClick={() => setExpandedCategories(prev => ({ ...prev, Media: !prev.Media }))}
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">Media</span>
                      </div>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedCategories.Media ? 'rotate-180' : ''}`} />
                    </Button>
                    {expandedCategories.Media && (
                      <div className="ml-6 mt-2 space-y-2">
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'image', 
                            config: { 
                              url: '', 
                              alt: 'Hero image', 
                              size: 'large',
                              name: 'Hero Image'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                        onClick={() => handleAddFrameToBoard({ id: 'hero-image', name: 'Hero Image', type: 'media_card', description: 'Large featured image', category: 'content', icon: '🖼️' })}
                      >
                        <Image className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Hero Image</div>
                          <div className="text-xs text-gray-500">Large featured image</div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'media', 
                            config: { 
                              url: '', 
                              type: 'video',
                              autoplay: false,
                              name: 'Video Player'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                        onClick={() => handleAddFrameToBoard({ id: 'video-player', name: 'Video Player', type: 'media_card', description: 'Embedded video content', category: 'content', icon: '🎥' })}
                      >
                        <Video className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Video Player</div>
                          <div className="text-xs text-gray-500">Embedded video content</div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'gallery', 
                            config: { 
                              images: [],
                              layout: 'grid',
                              columns: 3,
                              name: 'Image Gallery'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                        onClick={() => handleAddFrameToBoard({ id: 'image-gallery', name: 'Image Gallery', type: 'media_card', description: 'Collection of images', category: 'content', icon: '🖼️' })}
                      >
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Image Gallery</div>
                          <div className="text-xs text-gray-500">Collection of images</div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-2 h-auto"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, Content: !prev.Content }))}
                    >
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">Content</span>
                      </div>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedCategories.Content ? 'rotate-180' : ''}`} />
                    </Button>
                    {expandedCategories.Content && (
                      <div className="ml-6 mt-2 space-y-2">
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'heading', 
                            config: { 
                              content: 'Enter heading text...',
                              level: 2,
                              alignment: 'left',
                              name: 'Heading'
                            } 
                          }));
                        }}
                        onClick={() => handleAddFrameToBoard({ id: 'heading', name: 'Heading', type: 'preview', description: 'Title or section header', category: 'content', icon: '📝' })}
                      >
                        <Type className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Heading</div>
                          <div className="text-xs text-gray-500">Title or section header</div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'text', 
                            config: { 
                              content: 'Enter your text here...',
                              fontSize: 'medium',
                              bold: false,
                              name: 'Text Block'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                        onClick={() => handleAddFrameToBoard({ id: 'text-block', name: 'Text Block', type: 'preview', description: 'Body text content', category: 'content', icon: '📝' })}
                      >
                        <Type className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Text Block</div>
                          <div className="text-xs text-gray-500">Body text content</div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'quote', 
                            config: { 
                              content: 'Enter quote text...',
                              author: '',
                              style: 'default',
                              name: 'Quote'
                            } 
                          }));
                        }}
                        onClick={() => handleAddFrameToBoard({ id: 'quote', name: 'Quote', type: 'preview', description: 'Highlighted testimonial', category: 'content', icon: '💬' })}
                      >
                        <Type className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Quote</div>
                          <div className="text-xs text-gray-500">Highlighted testimonial</div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Interactive Section */}
                  <div>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-2 h-auto"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, Interactive: !prev.Interactive }))}
                    >
                      <div className="flex items-center gap-2">
                        <MousePointer className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">Interactive</span>
                      </div>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedCategories.Interactive ? 'rotate-180' : ''}`} />
                    </Button>
                    {expandedCategories.Interactive && (
                      <div className="ml-6 mt-2 space-y-2">
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'button', 
                            config: { 
                              label: 'Click me',
                              action: '',
                              variant: 'primary',
                              name: 'Action Button'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                        onClick={() => handleAddFrameToBoard({ id: 'action-button', name: 'Action Button', type: 'dialog', description: 'Clickable call-to-action', category: 'interaction', icon: '🔘' })}
                      >
                        <MousePointer className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Action Button</div>
                          <div className="text-xs text-gray-500">Clickable call-to-action</div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'form', 
                            config: { 
                              fields: [],
                              submitLabel: 'Submit',
                              action: '',
                              name: 'Form'
                            } 
                          }));
                        }}
                        onClick={() => handleAddFrameToBoard({ id: 'form', name: 'Form', type: 'config_panel', description: 'Input collection interface', category: 'configuration', icon: '📋' })}
                      >
                        <Type className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-900">Form</div>
                          <div className="text-xs text-gray-500">Input collection interface</div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* AI Section */}
                  <div>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-2 h-auto"
                      onClick={() => setExpandedCategories(prev => ({ ...prev, AI: !prev.AI }))}
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">AI</span>
                      </div>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedCategories.AI ? 'rotate-180' : ''}`} />
                    </Button>
                    {expandedCategories.AI && (
                      <div className="ml-6 mt-2 space-y-2">
                        <div 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          draggable
                        onDragStart={(e) => {
                          setDraggedItemType('prop');
                          e.dataTransfer.setData('application/json', JSON.stringify({ 
                            type: 'token', 
                            config: { 
                              name: 'AI Assistant',
                              persona: 'Helpful AI assistant',
                              color: '#3b82f6',
                              size: 'medium'
                            } 
                          }));
                        }}
                        onDragEnd={() => setDraggedItemType(null)}
                          onClick={() => handleAddFrameToBoard({ id: 'ai-token', name: 'AI Token', type: 'ai_token', description: 'AI agent placeholder and configuration', category: 'interaction', icon: '🎯' })}
                        >
                          <SparklesIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-900">AI Token</div>
                            <div className="text-xs text-gray-500">AI agent placeholder and configuration</div>
                          </div>
                        </div>
                        <div 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          draggable
                          onDragStart={(e) => {
                            setDraggedItemType('prop');
                            e.dataTransfer.setData('application/json', JSON.stringify({ 
                              type: 'image-slider', 
                              config: { 
                                images: [],
                                autoPlay: true,
                                showDots: true,
                                name: 'Image Slider'
                              } 
                            }));
                          }}
                          onClick={() => handleAddFrameToBoard({ id: 'image-slider', name: 'Image Slider', type: 'media_card', description: 'Animated image carousel', category: 'content', icon: '🎞️' })}
                        >
                          <ImageIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-900">Image Slider</div>
                            <div className="text-xs text-gray-500">Animated image carousel</div>
                          </div>
                        </div>
                        <div 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          draggable
                          onDragStart={(e) => {
                            setDraggedItemType('prop');
                            e.dataTransfer.setData('application/json', JSON.stringify({ 
                              type: 'ai-assistant', 
                              config: { 
                                agentId: '',
                                greeting: 'Hello! How can I help you?',
                                showAvatar: true,
                                name: 'AI Assistant'
                              } 
                            }));
                          }}
                          onClick={() => handleAddFrameToBoard({ id: 'ai-assistant', name: 'AI Assistant', type: 'agent_preview', description: 'Conversational AI interface', category: 'interaction', icon: '🤖' })}
                        >
                          <Bot className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-900">AI Assistant</div>
                            <div className="text-xs text-gray-500">Conversational AI interface</div>
                          </div>
                        </div>
                        <div 
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          draggable
                          onDragStart={(e) => {
                            setDraggedItemType('prop');
                            e.dataTransfer.setData('application/json', JSON.stringify({ 
                              type: 'smart-suggestions', 
                              config: { 
                                maxSuggestions: 3,
                                category: 'general',
                                autoRefresh: false,
                                name: 'Smart Suggestions'
                              } 
                            }));
                          }}
                          onClick={() => handleAddFrameToBoard({ id: 'smart-suggestions', name: 'Smart Suggestions', type: 'ai_widget', description: 'AI-powered content recommendations', category: 'interaction', icon: '💡' })}
                        >
                          <Sparkles className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-900">Smart Suggestions</div>
                            <div className="text-xs text-gray-500">AI-powered content recommendations</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">How to Use Board Studio</h2>
                      <p className="text-slate-600">Learn the basics of creating and editing boards</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Board Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-3">1. Select a Board</h3>
                    <p className="text-slate-700 mb-3">
                      Click on any board in the left panel to load it into the editor. The selected board will be highlighted with a blue border.
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Selected boards show with a blue highlight</span>
                      </div>
                    </div>
                  </div>

                  {/* Adding Frames */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-3">2. Add Frames</h3>
                    <p className="text-slate-700 mb-3">
                      Add content to your board using frames from the Frame Library on the right:
                    </p>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-center space-x-2">
                        <PlusIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span><strong>Click the + button</strong> that appears when you hover over a frame</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Bars3Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span><strong>Drag and drop</strong> frames directly onto the canvas</span>
                      </li>
                    </ul>
                  </div>

                  {/* Frame Types */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-3">3. Frame Types</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">💬</span>
                          <span className="font-medium text-slate-900">Interaction</span>
                        </div>
                        <p className="text-sm text-slate-600">Dialog frames, forms, and interactive elements</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">🖼️</span>
                          <span className="font-medium text-slate-900">Content</span>
                        </div>
                        <p className="text-sm text-slate-600">Media cards, previews, and content display</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">⚙️</span>
                          <span className="font-medium text-slate-900">Configuration</span>
                        </div>
                        <p className="text-sm text-slate-600">Settings panels and configuration forms</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">📊</span>
                          <span className="font-medium text-slate-900">Visualization</span>
                        </div>
                        <p className="text-sm text-slate-600">Charts, graphs, and data visualization</p>
                      </div>
                    </div>
                  </div>

                  {/* Board Properties */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-3">4. Edit Properties</h3>
                    <p className="text-slate-700 mb-3">
                      Use the Properties panel on the right to customize your board:
                    </p>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Change board name and description</li>
                      <li>• Select engagement modes (Canvas, Grid, Column, etc.)</li>
                      <li>• Customize colors and themes</li>
                      <li>• Configure layout settings</li>
                    </ul>
                  </div>

                  {/* Save */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-3">5. Save Your Work</h3>
                    <p className="text-slate-700">
                      Click the <strong>Save</strong> button in the top toolbar to save your changes. The button will show "Saving..." while your changes are being saved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Need more help? Check out our documentation or contact support.
                  </p>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        isOpen={showConflictDialog}
        conflictData={conflictData}
        onResolve={handleConflictResolve}
        onClose={() => setShowConflictDialog(false)}
      />

      {/* Template Chooser Modal */}
      <TemplateChooser
        isOpen={showTemplateChooser}
        onClose={() => setShowTemplateChooser(false)}
        onSelectTemplate={handleCreateBoardWithTemplate}
        onSkip={() => handleCreateBoardWithTemplate(null)}
      />
    </div>
  );
};

export default BoardStudioPage;