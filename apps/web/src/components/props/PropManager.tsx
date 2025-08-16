/**
 * PropManager Component
 * =====================
 * 
 * Main orchestrator component that manages prop drop behavior, stacking,
 * and persistence. Combines PropDropZone, PropBlock, and PropInspector
 * to create the complete prop management experience.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import PropDropZone from './PropDropZone';
import PropBlock from './PropBlock';
import PropInspector from './PropInspector';
import { cn } from '../../features/board-studio/v0/lib/utils';

interface PropData {
  id: string;
  type: string;
  config: Record<string, any>;
  isVisible: boolean;
  isDraft: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PropManagerProps {
  /** Frame ID this prop manager belongs to */
  frameId: string;
  /** Initial props data */
  initialProps?: PropData[];
  /** Whether the frame is currently active/selected */
  isActive?: boolean;
  /** Frame pattern for contextual messaging */
  framePattern?: string;
  /** Whether to show draft/published toggles */
  showDraftToggle?: boolean;
  /** Whether drag reordering is enabled */
  isDraggable?: boolean;
  /** Whether edit mode is active */
  isEditMode?: boolean;
  /** Callback when props are updated (for persistence) */
  onPropsUpdate?: (frameId: string, props: PropData[]) => Promise<void>;
  /** Custom className */
  className?: string;
}

export const PropManager: React.FC<PropManagerProps> = ({
  frameId,
  initialProps = [],
  isActive = false,
  framePattern = 'default',
  showDraftToggle = false,
  isDraggable = true,
  isEditMode = false,
  onPropsUpdate,
  className
}) => {
  const [props, setProps] = useState<PropData[]>(initialProps);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [dragPlaceholderIndex, setDragPlaceholderIndex] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [propSaveStatus, setPropSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'failed'>>({});

  // Sort props by order index
  const sortedProps = [...props].sort((a, b) => a.orderIndex - b.orderIndex);
  const selectedProp = selectedPropId ? props.find(p => p.id === selectedPropId) : null;

  // Update props when initialProps changes
  useEffect(() => {
    setProps(initialProps);
  }, [initialProps]);

  // Persist props changes with optimistic updates and save status tracking
  const persistProps = useCallback(async (newProps: PropData[], propId?: string) => {
    if (onPropsUpdate) {
      if (propId) {
        setPropSaveStatus(prev => ({ ...prev, [propId]: 'saving' }));
      } else {
        setIsUpdating(true);
      }
      
      try {
        await onPropsUpdate(frameId, newProps);
        
        if (propId) {
          setPropSaveStatus(prev => ({ ...prev, [propId]: 'saved' }));
          // Clear saved status after 2 seconds
          setTimeout(() => {
            setPropSaveStatus(prev => ({ ...prev, [propId]: 'idle' }));
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to persist props:', error);
        
        if (propId) {
          setPropSaveStatus(prev => ({ ...prev, [propId]: 'failed' }));
          // Clear failed status after 5 seconds
          setTimeout(() => {
            setPropSaveStatus(prev => ({ ...prev, [propId]: 'idle' }));
          }, 5000);
        }
        
        // Revert optimistic update on error
        setProps(props);
      } finally {
        if (!propId) {
          setIsUpdating(false);
        }
      }
    }
  }, [frameId, props, onPropsUpdate]);

  // Handle prop drop from library
  const handlePropDrop = useCallback(async (
    propType: string,
    propConfig: any,
    position?: { x: number; y: number }
  ) => {
    const newProp: PropData = {
      id: uuidv4(),
      type: propType,
      config: {
        ...propConfig,
        // Add position if dropped in canvas mode
        ...(framePattern === 'canvas' && position ? { position } : {})
      },
      isVisible: true,
      isDraft: false,
      orderIndex: props.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newProps = [...props, newProp];
    setProps(newProps);
    
    // Optimistic update
    await persistProps(newProps);
  }, [props, framePattern, persistProps]);

  // Handle prop selection
  const handlePropSelect = useCallback((propId: string) => {
    setSelectedPropId(propId);
  }, []);

  // Handle prop edit
  const handlePropEdit = useCallback((propId: string) => {
    setSelectedPropId(propId);
    setInspectorOpen(true);
  }, []);

  // Handle prop duplicate
  const handlePropDuplicate = useCallback(async (propId: string) => {
    const propToDuplicate = props.find(p => p.id === propId);
    if (!propToDuplicate) return;

    const duplicatedProp: PropData = {
      ...propToDuplicate,
      id: uuidv4(),
      config: {
        ...propToDuplicate.config,
        // Add "Copy" to name if it exists
        ...(propToDuplicate.config.name ? {
          name: `${propToDuplicate.config.name} Copy`
        } : {})
      },
      orderIndex: props.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newProps = [...props, duplicatedProp];
    setProps(newProps);
    
    await persistProps(newProps);
  }, [props, persistProps]);

  // Handle prop delete
  const handlePropDelete = useCallback(async (propId: string) => {
    const newProps = props.filter(p => p.id !== propId);
    
    // Reorder remaining props
    const reorderedProps = newProps.map((prop, index) => ({
      ...prop,
      orderIndex: index,
      updatedAt: new Date()
    }));

    setProps(reorderedProps);
    
    // Clear selection if deleted prop was selected
    if (selectedPropId === propId) {
      setSelectedPropId(null);
      setInspectorOpen(false);
    }
    
    await persistProps(reorderedProps);
  }, [props, selectedPropId, persistProps]);

  // Handle visibility toggle
  const handleToggleVisibility = useCallback(async (propId: string, isVisible: boolean) => {
    const newProps = props.map(prop =>
      prop.id === propId
        ? { ...prop, isVisible, updatedAt: new Date() }
        : prop
    );
    
    setProps(newProps);
    await persistProps(newProps);
  }, [props, persistProps]);

  // Handle draft toggle
  const handleToggleDraft = useCallback(async (propId: string, isDraft: boolean) => {
    const newProps = props.map(prop =>
      prop.id === propId
        ? { ...prop, isDraft, updatedAt: new Date() }
        : prop
    );
    
    setProps(newProps);
    await persistProps(newProps);
  }, [props, persistProps]);

  // Handle prop config update from inspector
  const handlePropUpdate = useCallback(async (propId: string, config: Record<string, any>) => {
    const newProps = props.map(prop =>
      prop.id === propId
        ? { ...prop, config, updatedAt: new Date() }
        : prop
    );
    
    setProps(newProps);
    await persistProps(newProps, propId);
  }, [props, persistProps]);

  // Handle inline edits
  const handleInlineEdit = useCallback(async (propId: string, field: string, value: any) => {
    const newProps = props.map(prop =>
      prop.id === propId
        ? { 
            ...prop, 
            config: { ...prop.config, [field]: value },
            updatedAt: new Date() 
          }
        : prop
    );
    
    setProps(newProps);
    await persistProps(newProps, propId);
  }, [props, persistProps]);

  // Handle prop reordering
  const handleReorder = useCallback(async (newOrder: PropData[]) => {
    const reorderedProps = newOrder.map((prop, index) => ({
      ...prop,
      orderIndex: index,
      updatedAt: new Date()
    }));
    
    setProps(reorderedProps);
    await persistProps(reorderedProps);
  }, [persistProps]);

  // Close inspector
  const handleCloseInspector = useCallback(() => {
    setInspectorOpen(false);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Props Container */}
      <div className="min-h-[200px]">
        {sortedProps.length === 0 ? (
          // Empty State - Show Drop Zone
          <PropDropZone
            onPropDrop={handlePropDrop}
            isActive={isActive}
            framePattern={framePattern}
          />
        ) : (
          // Populated State - Show Stacked Props
          <div className="space-y-2 p-4">
            <Reorder.Group
              axis="y"
              values={sortedProps}
              onReorder={handleReorder}
              className="space-y-2"
            >
              <AnimatePresence>
                {sortedProps.map((prop) => (
                  <motion.div
                    key={prop.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PropBlock
                      prop={prop}
                      isSelected={selectedPropId === prop.id}
                      isDraggable={isDraggable}
                      showDraftToggle={showDraftToggle}
                      isEditMode={isEditMode}
                      saveStatus={propSaveStatus[prop.id] || 'idle'}
                      onSelect={handlePropSelect}
                      onEdit={handlePropEdit}
                      onDuplicate={handlePropDuplicate}
                      onDelete={handlePropDelete}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleDraft={handleToggleDraft}
                      onInlineEdit={handleInlineEdit}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {/* Drop Zone for Additional Props */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500 hover:border-gray-300 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  try {
                    const propData = e.dataTransfer.getData('application/json');
                    if (propData) {
                      const { type, config } = JSON.parse(propData);
                      handlePropDrop(type, config);
                    }
                  } catch (error) {
                    console.error('Failed to parse dropped prop data:', error);
                  }
                }}
              >
                Drop additional props here
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
              <span className="text-sm text-gray-600">Saving...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prop Inspector */}
      <PropInspector
        prop={selectedProp}
        isOpen={inspectorOpen}
        onClose={handleCloseInspector}
        onUpdate={handlePropUpdate}
      />
    </div>
  );
};

export default PropManager;
