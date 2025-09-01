/**
 * Board Renderer
 * ==============
 * 
 * Main component for rendering Board layouts with Frame components.
 * Handles different layout types, engagement modes, and theme overrides.
 */

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  PencilIcon,
  EyeIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FrameRenderer } from '../frames';
import { useBoard, BoardInstance, BoardLayout } from '../../context/BoardContext';
import { useFrame } from '../../context/FrameContext';
import { ExtendedFrameInstance, FrameInteraction } from '../../types/frame';

// =============================================================================
// BOARD RENDERER PROPS
// =============================================================================

interface BoardRendererProps {
  boardInstance?: BoardInstance;
  className?: string;
  onFrameInteraction?: (interaction: FrameInteraction) => void;
  onBoardUpdate?: (updates: Partial<BoardInstance>) => void;
  onLayoutChange?: (layout: Record<string, unknown>) => void;
  showLayoutControls?: boolean;
  isPreview?: boolean;
}

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

interface LayoutProps {
  frames: ExtendedFrameInstance[];
  onFrameInteraction?: (interaction: FrameInteraction) => void;
  isLayoutEditing: boolean;
  selectedFrameId: string | null;
  onFrameSelect: (frameId: string | null) => void;
  boardTheme?: Record<string, string>;
  onLayoutChange?: (layout: Record<string, unknown>) => void;
}

const GridLayout: React.FC<LayoutProps> = ({ 
  frames, 
  onFrameInteraction, 
  isLayoutEditing,
  selectedFrameId,
  onFrameSelect,
  boardTheme 
}) => {
  const getGridCols = (frameCount: number) => {
    if (frameCount <= 1) return 'grid-cols-1';
    if (frameCount <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (frameCount <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className={`grid gap-6 ${getGridCols(frames.length)}`}>
      <AnimatePresence>
        {frames.map((frame, index) => (
          <motion.div
            key={frame.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`relative ${
              isLayoutEditing && selectedFrameId === frame.id 
                ? 'ring-2 ring-blue-500 ring-offset-2' 
                : ''
            }`}
            onClick={() => isLayoutEditing && onFrameSelect(frame.id)}
          >
            <FrameRenderer
              frameInstance={frame}
              onInteraction={onFrameInteraction}
              className="h-full"
            />
            {isLayoutEditing && (
              <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <button className="text-gray-400 hover:text-gray-600">
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ColumnLayout: React.FC<LayoutProps> = ({ 
  frames, 
  onFrameInteraction, 
  isLayoutEditing,
  selectedFrameId,
  onFrameSelect 
}) => (
  <div className="space-y-6">
    <AnimatePresence>
      {frames.map((frame, index) => (
        <motion.div
          key={frame.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`relative ${
            isLayoutEditing && selectedFrameId === frame.id 
              ? 'ring-2 ring-blue-500 ring-offset-2' 
              : ''
          }`}
          onClick={() => isLayoutEditing && onFrameSelect(frame.id)}
        >
          <FrameRenderer
            frameInstance={frame}
            onInteraction={onFrameInteraction}
          />
          {isLayoutEditing && (
            <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="text-gray-400 hover:text-gray-600">
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const RowLayout: React.FC<LayoutProps> = ({ 
  frames, 
  onFrameInteraction, 
  isLayoutEditing,
  selectedFrameId,
  onFrameSelect 
}) => (
  <div className="flex space-x-6 overflow-x-auto pb-4">
    <AnimatePresence>
      {frames.map((frame, index) => (
        <motion.div
          key={frame.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`flex-shrink-0 w-80 relative ${
            isLayoutEditing && selectedFrameId === frame.id 
              ? 'ring-2 ring-blue-500 ring-offset-2' 
              : ''
          }`}
          onClick={() => isLayoutEditing && onFrameSelect(frame.id)}
        >
          <FrameRenderer
            frameInstance={frame}
            onInteraction={onFrameInteraction}
          />
          {isLayoutEditing && (
            <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="text-gray-400 hover:text-gray-600">
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const WizardLayout: React.FC<LayoutProps & { currentStep?: number }> = ({ 
  frames, 
  onFrameInteraction,
  currentStep = 0
}) => {
  const currentFrame = frames[currentStep];
  
  if (!currentFrame) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No frames available in this wizard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {frames.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStep + 1) / frames.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / frames.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFrame.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <FrameRenderer
            frameInstance={currentFrame}
            onInteraction={onFrameInteraction}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const FocusLayout: React.FC<LayoutProps & { focusFrameId?: string }> = ({ 
  frames, 
  onFrameInteraction,
  focusFrameId
}) => {
  const focusFrame = focusFrameId 
    ? frames.find(f => f.id === focusFrameId) 
    : frames[0];

  if (!focusFrame) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No frame selected for focus mode.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <FrameRenderer
          frameInstance={focusFrame}
          onInteraction={onFrameInteraction}
        />
      </motion.div>
    </div>
  );
};

const CanvasLayout: React.FC<LayoutProps & { onLayoutChange?: (layout: Record<string, unknown>) => void }> = ({ 
  frames, 
  onFrameInteraction, 
  isLayoutEditing,
  selectedFrameId,
  onFrameSelect,
  onLayoutChange
}) => {
  const emitLayout = (frameId: string, position: { x: number; y: number }) => {
    if (!onLayoutChange) return;
    const layout: Record<string, { x: number; y: number }> = {};
    layout[frameId] = position;
    onLayoutChange(layout);
  };

  return (
    <div className="relative min-h-[600px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      {frames.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Add frames to your canvas</p>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {frames.map((frame, index) => {
            const layoutData: any = frame.layoutData || {};
            const top = typeof layoutData.y === 'number' ? layoutData.y : 50 + (index * 20);
            const left = typeof layoutData.x === 'number' ? layoutData.x : 50 + (index * 20);

            return (
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                drag={isLayoutEditing}
                onDragEnd={(_, info) => {
                  if (!isLayoutEditing) return;
                  const nextLeft = Math.round(left + (info as any).offset.x);
                  const nextTop = Math.round(top + (info as any).offset.y);
                  emitLayout(frame.id, { x: nextLeft, y: nextTop });
                }}
                className={`absolute w-80 ${
                  isLayoutEditing && selectedFrameId === frame.id 
                    ? 'ring-2 ring-blue-500 ring-offset-2' 
                    : ''
                } ${isLayoutEditing ? 'cursor-move' : ''}`}
                style={{ top, left }}
                onClick={() => isLayoutEditing && onFrameSelect(frame.id)}
              >
                <FrameRenderer
                  frameInstance={frame}
                  onInteraction={onFrameInteraction}
                />
                {isLayoutEditing && (
                  <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

// =============================================================================
// LAYOUT REGISTRY
// =============================================================================

const layoutRegistry: Record<BoardLayout, React.FC<LayoutProps & any>> = {
  grid: GridLayout,
  column: ColumnLayout,
  row: RowLayout,
  wizard: WizardLayout,
  focus: FocusLayout,
  canvas: CanvasLayout,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const BoardRenderer: React.FC<BoardRendererProps> = ({
  boardInstance,
  className = '',
  onFrameInteraction,
  onBoardUpdate,
  onLayoutChange,
  showLayoutControls = true,
  isPreview = false,
}) => {
  const { 
    activeBoard, 
    isLoading, 
    error, 
    isLayoutEditing,
    selectedFrameId,
    setLayoutEditing,
    selectFrame,
    loadBoard,
    onLayoutChange: persistLayout
  } = useBoard();
  const { handleFrameInteraction } = useFrame();

  // Use provided board instance or active board from context
  const board = boardInstance || activeBoard;

  // Load board if ID is provided but no board is active
  useEffect(() => {
    if (boardInstance?.id && !activeBoard) {
      loadBoard(boardInstance.id);
    }
  }, [boardInstance?.id, activeBoard, loadBoard]);

  // Handle frame interactions
  const handleInteraction = (interaction: FrameInteraction) => {
    handleFrameInteraction(interaction);
    onFrameInteraction?.(interaction);
  };

  // Apply board theme
  const boardTheme = useMemo(() => {
    if (!board?.config.theme) return {};
    
    const theme: Record<string, string> = {};
    Object.entries(board.config.theme).forEach(([key, value]) => {
      if (value) {
        theme[`--board-${key}`] = value;
      }
    });
    return theme;
  }, [board?.config.theme]);

  // Get layout component
  const LayoutComponent = board?.config.layout 
    ? layoutRegistry[board.config.layout] 
    : GridLayout;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Board</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => board?.id && loadBoard(board.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No board loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${className}`}
      style={boardTheme}
    >
      {/* Board Header */}
      {!isPreview && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.config.name}</h1>
            {board.config.description && (
              <p className="text-gray-600 mt-1">{board.config.description}</p>
            )}
          </div>

          {/* Layout Controls */}
          {showLayoutControls && board.config.allowLayoutEditing && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLayoutEditing(!isLayoutEditing)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                  isLayoutEditing
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isLayoutEditing ? (
                  <>
                    <EyeIcon className="w-4 h-4" />
                    <span>Preview</span>
                  </>
                ) : (
                  <>
                    <PencilIcon className="w-4 h-4" />
                    <span>Edit Layout</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Board Content */}
      <div className="board-content">
        <LayoutComponent
          frames={board.frames}
          onFrameInteraction={handleInteraction}
          isLayoutEditing={isLayoutEditing}
          selectedFrameId={selectedFrameId}
          onFrameSelect={selectFrame}
          boardTheme={boardTheme}
          onLayoutChange={(layout: Record<string, unknown>) => {
            onLayoutChange?.(layout);
            persistLayout(layout);
          }}
        />
      </div>

      {/* Empty State */}
      {board.frames.length === 0 && !isLayoutEditing && (
        <div className="text-center py-12">
          <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Frames Yet</h3>
          <p className="text-gray-600">Add frames to start building your board.</p>
        </div>
      )}
    </div>
  );
};

export default BoardRenderer;
