/**
 * BoardRenderer Component
 * 
 * Main component for rendering Keeper Boards. Handles different engagement modes
 * and orchestrates frame rendering within the board context.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FrameRenderer } from './FrameRenderer';
import type { BoardRendererProps, EngagementMode } from '../../types/board';

export const BoardRenderer: React.FC<BoardRendererProps> = ({
  board,
  onFrameUpdate,
  onFrameAction,
}) => {
  const [focusedFrameId, setFocusedFrameId] = useState<string | null>(null);
  const [currentWizardStep, setCurrentWizardStep] = useState(0);

  const handleFrameUpdate = useCallback((frameId: string, data: any) => {
    onFrameUpdate?.(frameId, data);
  }, [onFrameUpdate]);

  const handleFrameAction = useCallback((frameId: string, action: string, data?: any) => {
    // Handle special actions based on engagement mode
    if (board.engagementMode === 'wizard' && action === 'next') {
      setCurrentWizardStep(prev => Math.min(prev + 1, board.frames.length - 1));
    } else if (board.engagementMode === 'wizard' && action === 'previous') {
      setCurrentWizardStep(prev => Math.max(prev - 1, 0));
    } else if (board.engagementMode === 'focus' && action === 'focus') {
      setFocusedFrameId(frameId);
    } else if (board.engagementMode === 'focus' && action === 'unfocus') {
      setFocusedFrameId(null);
    }

    onFrameAction?.(frameId, action, data);
  }, [board.engagementMode, board.frames.length, onFrameAction]);

  const renderEngagementMode = () => {
    const sortedFrames = [...board.frames].sort((a, b) => a.order - b.order);

    switch (board.engagementMode) {
      case 'wizard':
        return renderWizardMode(sortedFrames);
      case 'focus':
        return renderFocusMode(sortedFrames);
      case 'canvas':
        return renderCanvasMode(sortedFrames);
      case 'dialogic':
      default:
        return renderDialogicMode(sortedFrames);
    }
  };

  const renderDialogicMode = (frames: typeof board.frames) => (
    <div className="space-y-6">
      {frames.map((frame, index) => (
        <motion.div
          key={frame.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="frame-container"
        >
          <FrameRenderer
            instance={frame}
            engagementMode={board.engagementMode}
            onUpdate={(data) => handleFrameUpdate(frame.id, data)}
            onAction={(action, data) => handleFrameAction(frame.id, action, data)}
          />
        </motion.div>
      ))}
    </div>
  );

  const renderWizardMode = (frames: typeof board.frames) => (
    <div className="wizard-container">
      <div className="wizard-progress mb-6">
        <div className="flex items-center justify-between">
          {frames.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index === currentWizardStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentWizardStep
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentWizardStep + 1) / frames.length) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {frames[currentWizardStep] && (
          <motion.div
            key={currentWizardStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FrameRenderer
              instance={frames[currentWizardStep]}
              engagementMode={board.engagementMode}
              onUpdate={(data) => handleFrameUpdate(frames[currentWizardStep].id, data)}
              onAction={(action, data) => handleFrameAction(frames[currentWizardStep].id, action, data)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="wizard-controls mt-6 flex justify-between">
        <button
          onClick={() => handleFrameAction(frames[currentWizardStep]?.id || '', 'previous')}
          disabled={currentWizardStep === 0}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => handleFrameAction(frames[currentWizardStep]?.id || '', 'next')}
          disabled={currentWizardStep === frames.length - 1}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentWizardStep === frames.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );

  const renderFocusMode = (frames: typeof board.frames) => (
    <div className="focus-container">
      {focusedFrameId ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="focused-frame fixed inset-4 bg-background border border-border rounded-lg shadow-lg z-50 overflow-auto"
        >
          <div className="p-6">
            <button
              onClick={() => handleFrameAction(focusedFrameId, 'unfocus')}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {frames.find(f => f.id === focusedFrameId) && (
              <FrameRenderer
                instance={frames.find(f => f.id === focusedFrameId)!}
                engagementMode={board.engagementMode}
                onUpdate={(data) => handleFrameUpdate(focusedFrameId, data)}
                onAction={(action, data) => handleFrameAction(focusedFrameId, action, data)}
              />
            )}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frames.map((frame) => (
            <motion.div
              key={frame.id}
              whileHover={{ scale: 1.02 }}
              className="frame-preview cursor-pointer p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
              onClick={() => handleFrameAction(frame.id, 'focus')}
            >
              <div className="frame-preview-content pointer-events-none">
                <FrameRenderer
                  instance={frame}
                  engagementMode="preview"
                  onUpdate={(data) => handleFrameUpdate(frame.id, data)}
                  onAction={(action, data) => handleFrameAction(frame.id, action, data)}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCanvasMode = (frames: typeof board.frames) => (
    <div className="canvas-container relative min-h-screen">
      {frames.map((frame) => (
        <motion.div
          key={frame.id}
          drag
          dragMomentum={false}
          className="absolute frame-canvas-item"
          style={{
            left: frame.config.config?.position?.x || 0,
            top: frame.config.config?.position?.y || 0,
          }}
        >
          <FrameRenderer
            instance={frame}
            engagementMode={board.engagementMode}
            onUpdate={(data) => handleFrameUpdate(frame.id, data)}
            onAction={(action, data) => handleFrameAction(frame.id, action, data)}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="board-renderer" data-board-type={board.type} data-engagement-mode={board.engagementMode}>
      <div className="board-header mb-6">
        <h1 className="text-2xl font-bold text-foreground">{board.name}</h1>
        {board.type && (
          <p className="text-sm text-muted-foreground capitalize">
            {board.type.replace('_', ' ')} Board
          </p>
        )}
      </div>

      <div className="board-content">
        {renderEngagementMode()}
      </div>
    </div>
  );
};