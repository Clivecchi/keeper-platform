/**
 * EditableProp - Inline editing wrapper for domain board props
 * 
 * Wraps any prop and makes it editable in place when in edit mode.
 * Shows edit affordances on hover and opens inline editor on click.
 */

import React, { useState } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

interface EditablePropProps {
  propId: string;
  propType: string;
  currentValue: any;
  isEditMode: boolean;
  onUpdate: (propId: string, newValue: any) => void;
  children: React.ReactNode;
}

export function EditableProp({
  propId,
  propType,
  currentValue,
  isEditMode,
  onUpdate,
  children
}: EditablePropProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentValue);
  const [isHovering, setIsHovering] = useState(false);

  if (!isEditMode) {
    // View mode - just render children
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(currentValue);
  };

  const handleSave = () => {
    onUpdate(propId, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(currentValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative">
        {renderEditor()}
      </div>
    );
  }

  // Edit mode but not actively editing - show hover affordance
  return (
    <div
      className="relative group cursor-pointer"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`
        relative
        ${isHovering ? 'ring-2 ring-blue-400 ring-opacity-50 rounded' : ''}
        transition-all duration-150
      `}>
        {children}
        
        {/* Edit affordance overlay */}
        {isHovering && (
          <div className="absolute top-0 right-0 m-2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 shadow-lg pointer-events-none">
            <PencilIcon className="w-3 h-3" />
            <span>Click to edit</span>
          </div>
        )}
      </div>
    </div>
  );

  function renderEditor() {
    switch (propType) {
      case 'heading':
      case 'text':
        return (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {propType === 'heading' ? 'Heading Text' : 'Text Content'}
            </label>
            {propType === 'heading' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            ) : (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'button':
        const buttonLabel = typeof editValue === 'object' ? editValue.label : editValue;
        const buttonUrl = typeof editValue === 'object' ? editValue.url : '';
        
        return (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Label
            </label>
            <input
              type="text"
              value={buttonLabel || ''}
              onChange={(e) => setEditValue(
                typeof editValue === 'object' 
                  ? { ...editValue, label: e.target.value }
                  : { label: e.target.value, url: buttonUrl }
              )}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              autoFocus
              placeholder="Button text"
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel();
              }}
            />
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button URL (optional)
            </label>
            <input
              type="text"
              value={buttonUrl || ''}
              onChange={(e) => setEditValue(
                typeof editValue === 'object'
                  ? { ...editValue, url: e.target.value }
                  : { label: buttonLabel, url: e.target.value }
              )}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://... or mailto:..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use engagement template
            </p>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="text"
              value={editValue?.url || editValue}
              onChange={(e) => setEditValue(
                typeof editValue === 'object'
                  ? { ...editValue, url: e.target.value }
                  : e.target.value
              )}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              autoFocus
              placeholder="https://example.com/image.jpg"
            />
            
            {typeof editValue === 'object' && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={editValue?.alt || ''}
                  onChange={(e) => setEditValue({ ...editValue, alt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Image description"
                />
              </>
            )}
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edit {propType}
            </label>
            <textarea
              value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue, null, 2)}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={5}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        );
    }
  }
}

