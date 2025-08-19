/**
 * PropBlock Component
 * ===================
 * 
 * Individual prop component that displays within frames when populated.
 * Includes label, quick-action buttons (reorder, edit, duplicate, delete, visibility),
 * and optional draft/published toggle. Supports drag-and-drop reordering.
 */

import React, { useState, useRef } from 'react';
import { motion, useDragControls, Reorder } from 'framer-motion';
import {
  Bars3Icon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { cn } from '../../features/board-studio/v0/lib/utils';

interface PropBlockConfig {
  [key: string]: any;
}

interface PropBlockData {
  id: string;
  type: string;
  config: PropBlockConfig;
  isVisible?: boolean;
  isDraft?: boolean;
  orderIndex?: number;
}

interface PropBlockProps {
  /** Prop data */
  prop: PropBlockData;
  /** Whether this prop is currently selected */
  isSelected?: boolean;
  /** Whether drag reordering is enabled */
  isDraggable?: boolean;
  /** Whether to show draft/published toggle */
  showDraftToggle?: boolean;
  /** Whether edit mode is active */
  isEditMode?: boolean;
  /** Save status for feedback */
  saveStatus?: 'idle' | 'saving' | 'saved' | 'failed';
  /** Callback when prop is clicked for selection */
  onSelect?: (propId: string) => void;
  /** Callback when edit is triggered */
  onEdit?: (propId: string) => void;
  /** Callback when duplicate is triggered */
  onDuplicate?: (propId: string) => void;
  /** Callback when delete is triggered */
  onDelete?: (propId: string) => void;
  /** Callback when visibility is toggled */
  onToggleVisibility?: (propId: string, isVisible: boolean) => void;
  /** Callback when draft status is toggled */
  onToggleDraft?: (propId: string, isDraft: boolean) => void;
  /** Callback for inline edits */
  onInlineEdit?: (propId: string, field: string, value: any) => void;
  /** Custom className */
  className?: string;
}

export const PropBlock: React.FC<PropBlockProps> = ({
  prop,
  isSelected = false,
  isDraggable = true,
  showDraftToggle = false,
  isEditMode = false,
  saveStatus = 'idle',
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleVisibility,
  onToggleDraft,
  onInlineEdit,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState('');
  const dragControls = useDragControls();
  const blockRef = useRef<HTMLDivElement>(null);

  const getPropLabel = () => {
    // Show actual content/configuration for better UX
    switch (prop.type) {
      case 'text':
        return prop.config.content || 'Text Block (empty)';
      case 'heading':
        return prop.config.content || 'Heading (empty)';
      case 'button':
        return prop.config.label || 'Button (no label)';
      case 'quote':
        return prop.config.content ? `"${prop.config.content.substring(0, 40)}${prop.config.content.length > 40 ? '...' : '}"` : 'Quote (empty)';
      case 'image':
        return prop.config.url ? `Image: ${prop.config.url.split('/').pop()}` : 'Image (no source)';
      case 'token':
        return prop.config.name || 'AI Token (unnamed)';
      case 'form':
        const fieldCount = prop.config.fields?.length || 0;
        return `Form (${fieldCount} field${fieldCount !== 1 ? 's' : ''})`;
      case 'gallery':
        const imageCount = prop.config.images?.length || 0;
        return `Gallery (${imageCount} image${imageCount !== 1 ? 's' : ''})`;
      case 'ai-assistant':
        return prop.config.greeting || 'AI Assistant (no greeting)';
      case 'smart-suggestions':
        return `Smart Suggestions (${prop.config.maxSuggestions || 3} max)`;
      case 'image-slider':
        const sliderCount = prop.config.images?.length || 0;
        return `Image Slider (${sliderCount} image${sliderCount !== 1 ? 's' : ''})`;
      default:
        // Fallback to config name or type
        return prop.config.name || prop.config.title || prop.config.label || 
               (prop.type.charAt(0).toUpperCase() + prop.type.slice(1));
    }
  };

  const getPropIcon = () => {
    // Return appropriate icon based on prop type
    switch (prop.type) {
      case 'image':
      case 'gallery':
        return '🖼️';
      case 'text':
        return '📝';
      case 'button':
        return '🔘';
      case 'token':
        return '🤖';
      case 'media':
        return '🎬';
      case 'form':
        return '📋';
      default:
        return '📦';
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Keep actions visible if selected
    if (!isSelected) {
      setShowActions(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(prop.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(prop.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(prop.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${getPropLabel()}"? This action cannot be undone.`)) {
      onDelete?.(prop.id);
    }
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility?.(prop.id, !prop.isVisible);
  };

  const handleToggleDraft = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDraft?.(prop.id, !prop.isDraft);
  };

  const handleInlineEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditMode && canInlineEdit()) {
      setIsInlineEditing(true);
      setInlineValue(getInlineEditValue());
    }
  };

  const handleInlineEditSave = () => {
    if (onInlineEdit && inlineValue !== getInlineEditValue()) {
      onInlineEdit(prop.id, getInlineEditField(), inlineValue);
    }
    setIsInlineEditing(false);
  };

  const handleInlineEditCancel = () => {
    setIsInlineEditing(false);
    setInlineValue('');
  };

  const canInlineEdit = () => {
    return prop.type === 'text' || prop.type === 'button' || prop.type === 'token';
  };

  const getInlineEditField = () => {
    switch (prop.type) {
      case 'text':
        return 'content';
      case 'button':
        return 'label';
      case 'token':
        return 'name';
      default:
        return 'name';
    }
  };

  const getInlineEditValue = () => {
    const field = getInlineEditField();
    return prop.config[field] || '';
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full"
          />
        );
      case 'saved':
        return <CheckCircleIcon className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Reorder.Item
      value={prop}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "group relative bg-white border rounded-lg transition-all duration-200",
        isSelected
          ? "border-blue-500 shadow-md ring-1 ring-blue-500/20"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm",
        isEditMode && "cursor-pointer hover:ring-2 hover:ring-blue-100",
        isEditMode && canInlineEdit() && "hover:bg-blue-50/30",
        !prop.isVisible && "opacity-50",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      ref={blockRef}
    >
      <div className="flex items-center p-3 gap-3">
        {/* Drag Handle */}
        {isDraggable && (
          <motion.button
            className={cn(
              "flex-shrink-0 p-1 rounded cursor-grab active:cursor-grabbing transition-opacity",
              showActions ? "opacity-100" : "opacity-0"
            )}
            onPointerDown={(e) => dragControls.start(e)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bars3Icon className="w-4 h-4 text-gray-400" />
          </motion.button>
        )}

        {/* Prop Icon */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-md text-sm">
          {getPropIcon()}
        </div>

        {/* Prop Label */}
        <div className="flex-1 min-w-0">
          {isInlineEditing ? (
            <div className="space-y-1">
              <input
                type="text"
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                onBlur={handleInlineEditSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInlineEditSave();
                  } else if (e.key === 'Escape') {
                    handleInlineEditCancel();
                  }
                }}
                className="w-full text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 truncate">
                {prop.type}
              </p>
            </div>
          ) : (
            <div onClick={handleInlineEditStart}>
              <h4 className={cn(
                "text-sm font-medium text-gray-900 truncate",
                isEditMode && canInlineEdit() && "hover:text-blue-600 cursor-text"
              )}>
                {getPropLabel()}
                {isEditMode && canInlineEdit() && (
                  <span className="ml-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {prop.type}
              </p>
            </div>
          )}
        </div>

        {/* Draft/Published Status */}
        {showDraftToggle && (
          <motion.button
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors"
            onClick={handleToggleDraft}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={prop.isDraft ? "Currently draft - click to publish" : "Currently published - click to make draft"}
          >
            {prop.isDraft ? (
              <>
                <ClockIcon className="w-3 h-3 text-amber-600" />
                <span className="text-amber-700 bg-amber-100">Draft</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-3 h-3 text-green-600" />
                <span className="text-green-700 bg-green-100">Live</span>
              </>
            )}
          </motion.button>
        )}

        {/* Save Status Badge */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {saveStatus !== 'idle' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1"
              title={
                saveStatus === 'saving' ? 'Saving...' :
                saveStatus === 'saved' ? 'Saved' :
                'Save failed'
              }
            >
              {getSaveStatusIcon()}
              <span className={cn(
                "text-xs font-medium",
                saveStatus === 'saving' && "text-blue-600",
                saveStatus === 'saved' && "text-green-600",
                saveStatus === 'failed' && "text-red-600"
              )}>
                {saveStatus === 'saving' ? 'Saving' :
                 saveStatus === 'saved' ? 'Saved' :
                 'Failed'}
              </span>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            className={cn(
              "flex items-center gap-1 transition-all duration-200",
              showActions ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
            )}
          >
          {/* Visibility Toggle */}
          <motion.button
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            onClick={handleToggleVisibility}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={prop.isVisible ? "Hide prop" : "Show prop"}
          >
            {prop.isVisible ? (
              <EyeIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <EyeSlashIcon className="w-4 h-4 text-gray-400" />
            )}
          </motion.button>

          {/* Edit */}
          <motion.button
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            onClick={handleEdit}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Edit prop"
          >
            <PencilIcon className="w-4 h-4 text-gray-500" />
          </motion.button>

          {/* Duplicate */}
          <motion.button
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            onClick={handleDuplicate}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Duplicate prop"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-gray-500" />
          </motion.button>

          {/* Delete */}
          <motion.button
            className="p-1 rounded hover:bg-red-100 transition-colors"
            onClick={handleDelete}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Delete prop"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-b-lg"
        />
      )}
    </Reorder.Item>
  );
};

export default PropBlock;
