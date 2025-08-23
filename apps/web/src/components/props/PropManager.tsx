import React, { useMemo, useCallback } from 'react';
import PropDropZone from './PropDropZone';

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

const PropManager: React.FC<PropManagerProps> = ({
  frameId,
  initialProps,
  isActive = true,
  framePattern = 'canvas',
  isEditMode = true,
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

  const handlePropDrop = useCallback(
    (type: string, config: any) => {
      const next: PropData[] = [
        ...propsArray,
        {
          id: `prop_${Date.now()}`,
          type,
          config,
          orderIndex: propsArray.length,
          isVisible: true,
          isDraft: isEditMode,
        },
      ];
      onPropsUpdate?.(frameId, next);
    },
    [frameId, isEditMode, onPropsUpdate, propsArray]
  );

  return (
    <PropDropZone
      onPropDrop={handlePropDrop}
      isActive={isActive}
      framePattern={framePattern}
    />
  );
};

export default PropManager;


