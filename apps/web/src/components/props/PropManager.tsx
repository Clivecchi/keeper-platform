import React, { useMemo, useCallback, useState } from 'react';
import PropDropZone from './PropDropZone';
import { TrashIcon, Bars3Icon, PencilIcon } from '@heroicons/react/24/outline';
import {
  TextPropEditor,
  HeadingPropEditor,
  QuotePropEditor,
  ImagePropEditor,
  GalleryPropEditor,
  ButtonPropEditor,
  FormPropEditor,
  AIAssistantPropEditor,
  MediaPropEditor,
  GenericPropEditor,
} from './editors/PropEditors';

type PropData = {
  id?: string;
  type: string;
  config: Record<string, unknown>;
  orderIndex?: number;
  isVisible?: boolean;
  isDraft?: boolean;
};

interface PropManagerProps {
  frameId: string;
  initialProps: PropData[] | Record<string, PropData>;
  isActive?: boolean;
  framePattern?: string;
  showDraftToggle?: boolean;
  isDraggable?: boolean;
  isEditMode?: boolean;
  onPropsUpdate?: (frameId: string, props: PropData[]) => Promise<void> | void;
}

/**
 * PropManager - Displays and manages props in Edit/Layout mode
 * 
 * Renders all existing props with editing affordances (delete, reorder)
 * Plus shows drop zone at the bottom for adding new props
 */
const PropManager: React.FC<PropManagerProps> = ({
  frameId,
  initialProps,
  isActive = true,
  framePattern = 'canvas',
  isEditMode = true,
  isDraggable = false,
  onPropsUpdate,
}) => {
  const propsArray = useMemo<PropData[]>(() => {
    if (Array.isArray(initialProps)) return initialProps;
    if (initialProps && typeof initialProps === 'object') {
      return Object.values(initialProps).filter(
        (p): p is PropData => !!p && typeof p === 'object' && 'type' in p
      );
    }
    return [];
  }, [initialProps]);

  const [localProps, setLocalProps] = useState(propsArray);
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, any>>({});
  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [dragOverPropId, setDragOverPropId] = useState<string | null>(null);

  // Update local props when initialProps changes
  React.useEffect(() => {
    setLocalProps(propsArray);
  }, [propsArray]);

  const handlePropDrop = useCallback(
    (type: string, config: any) => {
      const next: PropData[] = [
        ...localProps,
        {
          id: `prop_${Date.now()}`,
          type,
          config,
          orderIndex: localProps.length,
          isVisible: true,
          isDraft: isEditMode,
        },
      ];
      setLocalProps(next);
      onPropsUpdate?.(frameId, next);
    },
    [frameId, isEditMode, onPropsUpdate, localProps]
  );

  const handleDeleteProp = useCallback(
    (propId: string) => {
      const next = localProps.filter(p => p.id !== propId);
      setLocalProps(next);
      onPropsUpdate?.(frameId, next);
    },
    [frameId, localProps, onPropsUpdate]
  );

  const handleEditProp = useCallback((propId: string, config: Record<string, any>) => {
    setEditingPropId(propId);
    setEditingConfig({ ...config });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPropId(null);
    setEditingConfig({});
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingPropId) return;
    
    const next = localProps.map(p => 
      p.id === editingPropId 
        ? { ...p, config: editingConfig }
        : p
    );
    setLocalProps(next);
    onPropsUpdate?.(frameId, next);
    setEditingPropId(null);
    setEditingConfig({});
  }, [editingPropId, editingConfig, localProps, frameId, onPropsUpdate]);

  const handleConfigChange = useCallback((updates: Record<string, any>) => {
    setEditingConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, propId: string) => {
    setDraggedPropId(propId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', propId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, propId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPropId && draggedPropId !== propId) {
      setDragOverPropId(propId);
    }
  }, [draggedPropId]);

  const handleDragLeave = useCallback(() => {
    setDragOverPropId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropPropId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedPropId || draggedPropId === dropPropId) {
      setDraggedPropId(null);
      setDragOverPropId(null);
      return;
    }
    
    // Find indices
    const draggedIndex = localProps.findIndex(p => p.id === draggedPropId);
    const dropIndex = localProps.findIndex(p => p.id === dropPropId);
    
    if (draggedIndex === -1 || dropIndex === -1) return;
    
    // Reorder array
    const reordered = [...localProps];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    // Update order indices
    const withNewIndices = reordered.map((p, idx) => ({ ...p, orderIndex: idx }));
    
    setLocalProps(withNewIndices);
    onPropsUpdate?.(frameId, withNewIndices);
    setDraggedPropId(null);
    setDragOverPropId(null);
    
    console.log('✅ Props reordered');
  }, [draggedPropId, localProps, frameId, onPropsUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedPropId(null);
    setDragOverPropId(null);
  }, []);

  // Get the appropriate editor component for a prop type
  const getPropEditor = (propType: string) => {
    switch (propType) {
      case 'text':
        return TextPropEditor;
      case 'heading':
        return HeadingPropEditor;
      case 'quote':
        return QuotePropEditor;
      case 'image':
        return ImagePropEditor;
      case 'gallery':
        return GalleryPropEditor;
      case 'button':
        return ButtonPropEditor;
      case 'form':
        return FormPropEditor;
      case 'ai-assistant':
        return AIAssistantPropEditor;
      case 'media':
        return MediaPropEditor;
      default:
        return GenericPropEditor;
    }
  };

  // Render individual prop with editing chrome
  const renderProp = (prop: PropData, index: number) => {
    const isEditing = editingPropId === prop.id;
    const isDragging = draggedPropId === prop.id;
    const isDragOver = dragOverPropId === prop.id;
    const EditorComponent = getPropEditor(prop.type);
    
    return (
      <div
        key={prop.id || index}
        draggable={isDraggable && !isEditing}
        onDragStart={(e) => prop.id && handleDragStart(e, prop.id)}
        onDragOver={(e) => prop.id && handleDragOver(e, prop.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => prop.id && handleDrop(e, prop.id)}
        onDragEnd={handleDragEnd}
        className={`group relative border rounded-lg bg-white transition-all ${
          isEditing ? 'border-blue-400 shadow-md' : 
          isDragging ? 'opacity-50 border-blue-300' :
          isDragOver ? 'border-blue-500 border-2 shadow-lg' :
          'border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }`}
      >
        {/* Drag handle (if draggable and not editing) */}
        {isDraggable && !isEditing && (
          <div className="absolute left-2 top-4 cursor-move text-gray-500 hover:text-gray-700">
            <Bars3Icon className="w-4 h-4" />
          </div>
        )}
        
        {isEditing ? (
          // Editing mode - show inline editor
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <div>
                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                <span className="ml-2 text-sm font-semibold text-gray-900">{prop.type}</span>
                <span className="ml-2 text-xs text-blue-600">Editing...</span>
              </div>
            </div>
            <EditorComponent
              config={editingConfig}
              onChange={handleConfigChange}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          </div>
        ) : (
          // Preview mode - show summary with action buttons
          <div className={`p-4 ${isDraggable ? 'pl-8' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                <span className="ml-2 text-sm font-semibold text-gray-900">{prop.type}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => prop.id && handleEditProp(prop.id, prop.config)}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Edit prop"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => prop.id && handleDeleteProp(prop.id)}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Delete prop"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Show prop config preview */}
            <div className="text-xs text-gray-600 space-y-1">
              {Object.entries(prop.config || {}).slice(0, 3).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-medium text-gray-700">{key}:</span>{' '}
                  <span className="text-gray-600">
                    {typeof value === 'string' ? (
                      value.substring(0, 50) + (value.length > 50 ? '...' : '')
                    ) : Array.isArray(value) ? (
                      `[${value.length} items]`
                    ) : typeof value === 'object' ? (
                      '{...}'
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
              {Object.keys(prop.config || {}).length > 3 && (
                <div className="text-gray-500 italic">
                  +{Object.keys(prop.config).length - 3} more fields...
                </div>
              )}
            </div>
            
            {prop.isDraft && (
              <div className="mt-2 inline-block px-2 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
                Draft
              </div>
            )}
            
            {/* Click to edit hint */}
            <div className="mt-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Click ✎ to edit
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      {/* Render existing props */}
      {localProps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Props ({localProps.length})
            </h4>
            {isEditMode && (
              <span className="text-xs text-gray-500">
                {isDraggable ? 'Drag to reorder' : 'Edit mode'}
              </span>
            )}
          </div>
          {localProps
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map((prop, index) => renderProp(prop, index))}
        </div>
      )}
      
      {/* Drop zone for adding new props */}
      <div>
        {localProps.length > 0 && (
          <div className="text-xs text-gray-500 mb-2 text-center">
            + Add more props
          </div>
        )}
        <PropDropZone
          onPropDrop={handlePropDrop}
          isActive={isActive}
          framePattern={framePattern}
        />
      </div>
    </div>
  );
};

export default PropManager;


