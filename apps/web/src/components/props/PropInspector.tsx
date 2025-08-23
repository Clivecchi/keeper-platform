/**
 * Prop Inspector
 * ==============
 * 
 * Component for inspecting and editing individual prop blocks.
 * Provides detailed view and editing capabilities for prop data and schema.
 */

import React, { useState } from 'react';
import { 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { PropBlock as PropBlockType } from '../../types/keeper';

interface PropInspectorProps {
  propBlock: PropBlockType;
  onUpdate: (updates: Partial<PropBlockType>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  className?: string;
}

const PropInspector: React.FC<PropInspectorProps> = ({
  propBlock,
  onUpdate,
  onDelete,
  onDuplicate,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(propBlock.data);

  const handleSave = () => {
    onUpdate({ data: editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(propBlock.data);
    setIsEditing(false);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Prop Inspector</h3>
          <p className="text-sm text-gray-500">Type: {propBlock.type}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-lg transition-colors ${
              isEditing 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={isEditing ? 'Cancel editing' : 'Edit prop'}
          >
            {isEditing ? <EyeIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onDuplicate}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Duplicate prop"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete prop"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Position & Size */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Position & Size</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Position</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={propBlock.position?.x || 0}
                  onChange={(e) => onUpdate({
                    position: { ...propBlock.position, x: Number(e.target.value), y: propBlock.position?.y || 0 }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={propBlock.position?.y || 0}
                  onChange={(e) => onUpdate({
                    position: { x: propBlock.position?.x || 0, ...propBlock.position, y: Number(e.target.value) }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="Y"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-1">Size</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={propBlock.size?.width || ''}
                  onChange={(e) => onUpdate({
                    size: { ...propBlock.size, width: Number(e.target.value) || undefined }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="W"
                />
                <input
                  type="number"
                  value={propBlock.size?.height || ''}
                  onChange={(e) => onUpdate({
                    size: { ...propBlock.size, height: Number(e.target.value) || undefined }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="H"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Data</h4>
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={JSON.stringify(editData, null, 2)}
                onChange={(e) => {
                  try {
                    setEditData(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, keep as is for now
                  }
                }}
                rows={8}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <pre className="text-sm bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
              {JSON.stringify(propBlock.data, null, 2)}
            </pre>
          )}
        </div>

        {/* Schema */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Schema</h4>
          <pre className="text-sm bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
            {JSON.stringify(propBlock.schema, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PropInspector;