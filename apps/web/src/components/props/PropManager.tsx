import React, { useMemo, useCallback, useState } from 'react';
import PropDropZone from './PropDropZone';
import { TrashIcon, GripVerticalIcon } from '@heroicons/react/24/outline';

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

  // Render individual prop with editing chrome
  const renderProp = (prop: PropData, index: number) => {
    return (
      <div
        key={prop.id || index}
        className="group relative border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
      >
        {/* Drag handle (if draggable) */}
        {isDraggable && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-move">
            <GripVerticalIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        
        {/* Prop content preview */}
        <div className={isDraggable ? 'pl-6' : ''}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              <span className="ml-2 text-sm font-semibold text-gray-900">{prop.type}</span>
            </div>
            <button
              onClick={() => prop.id && handleDeleteProp(prop.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-opacity"
              title="Delete prop"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Show prop config preview */}
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(prop.config || {}).slice(0, 3).map(([key, value]) => (
              <div key={key} className="truncate">
                <span className="font-medium text-gray-700">{key}:</span>{' '}
                <span className="text-gray-600">
                  {typeof value === 'string' ? (
                    value.substring(0, 50) + (value.length > 50 ? '...' : '')
                  ) : (
                    JSON.stringify(value).substring(0, 50)
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
            <div className="mt-2 text-xs text-amber-600 font-medium">
              Draft
            </div>
          )}
        </div>
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


