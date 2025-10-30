/**
 * Frame Configuration Panel
 * 
 * Right-side inspector for frame settings and content management.
 * Provides clean interface for renaming, pattern selection, and prop management.
 */

import React, { useState, useEffect } from 'react';
import { Input } from '../v0/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../v0/components/ui/select';
import { Bars3Icon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface FrameConfigPanelProps {
  frame: {
    id: string;
    name: string;
    pattern: string;
    role?: string;
    props: Record<string, any>;
    previewThumbUrl?: string | null;
  };
  
  onRenameFrame: (frameId: string, newName: string) => void;
  onChangePattern: (frameId: string, newPattern: string) => void;
  
  propLibraryItems: Array<{
    type: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
  
  onAddPropToFrame: (frameId: string, propType: string) => void;
  
  framePropsList: Array<{
    id: string;
    type: string;
    summary: string;
  }>;
}

export function FrameConfigPanel({
  frame,
  onRenameFrame,
  onChangePattern,
  propLibraryItems,
  onAddPropToFrame,
  framePropsList
}: FrameConfigPanelProps) {
  // LOCAL STATE for frame name - only PATCH on blur, not every keystroke
  const [frameNameDraft, setFrameNameDraft] = useState(frame.name);
  
  // Sync frameNameDraft when active frame changes
  useEffect(() => {
    console.log("🔎 Active frame switch", frame.id);
    setFrameNameDraft(frame.name);
  }, [frame.id, frame.name]);
  
  const propsCount = framePropsList.length;
  
  // Get first letter for avatar fallback
  const firstLetter = (frameNameDraft || 'F').charAt(0).toUpperCase();
  
  // Get preview thumb URL (first image prop if exists)
  const thumbUrl = frame.previewThumbUrl || (() => {
    const firstImageProp = Object.values(frame.props || {}).find(
      (p: any) => p && typeof p === 'object' && (p.type === 'image' || p.type === 'gallery')
    ) as any;
    return firstImageProp?.config?.url || null;
  })();
  
  // Save frame name on blur or Enter
  const saveFrameName = () => {
    if (frameNameDraft !== frame.name) {
      console.log("💾 Saving frame name", { frameId: frame.id, frameNameDraft });
      onRenameFrame(frame.id, frameNameDraft);
      console.log("✅ Saved frame name to server");
    }
  };
  
  const handleFrameNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("✏️ Draft name", newValue);
    setFrameNameDraft(newValue);
  };
  
  const handleFrameNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="w-[320px] shrink-0 bg-white text-gray-900 border-l border-gray-200 flex flex-col h-full">
      {/* HEADER SECTION - Fixed, non-scrolling */}
      <div className="flex-none p-4 border-b border-gray-200">
        <div className="flex items-start gap-3 mb-4">
          {/* Frame Avatar/Thumbnail */}
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={frameNameDraft}
              className="w-8 h-8 rounded object-cover border border-gray-300 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border border-gray-300 flex-shrink-0">
              {firstLetter}
            </div>
          )}
          
          {/* Frame Name Input - LOCAL STATE, only saves on blur */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1 block">
              Frame Name
            </label>
            <Input
              value={frameNameDraft}
              onChange={handleFrameNameChange}
              onBlur={saveFrameName}
              onKeyDown={handleFrameNameKeyDown}
              className="text-sm h-8 w-full bg-white text-gray-900 border border-gray-300 rounded px-2 shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Frame name"
            />
          </div>
        </div>
        
        {/* Metadata Line */}
        <div className="text-[10px] text-gray-500 mb-3 truncate">
          ID: {frame.id.substring(0, 8)}... · {frame.pattern}
        </div>
        
        {/* Pattern Selector - HARD-CODED WHITE BACKGROUNDS */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500 block">
            Engagement Pattern
          </label>
          <Select
            value={frame.pattern}
            onValueChange={(value) => {
              console.log("✏️ Update frame", { frameId: frame.id, field: 'pattern', value });
              onChangePattern(frame.id, value);
            }}
          >
            <SelectTrigger className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-900 border border-gray-300 shadow-md z-50">
              <SelectItem value="dialogic" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Dialogic</div>
                  <div className="text-[10px] text-gray-500">Conversation flow</div>
                </div>
              </SelectItem>
              <SelectItem value="wizard" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Wizard</div>
                  <div className="text-[10px] text-gray-500">Step-by-step</div>
                </div>
              </SelectItem>
              <SelectItem value="focus" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Focus</div>
                  <div className="text-[10px] text-gray-500">Single element</div>
                </div>
              </SelectItem>
              <SelectItem value="canvas" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Canvas</div>
                  <div className="text-[10px] text-gray-500">Freeform</div>
                </div>
              </SelectItem>
              <SelectItem value="gallery" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Gallery</div>
                  <div className="text-[10px] text-gray-500">Image grid</div>
                </div>
              </SelectItem>
              <SelectItem value="form" className="text-gray-900">
                <div>
                  <div className="font-medium text-sm">Form</div>
                  <div className="text-[10px] text-gray-500">Data entry</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[10px] text-gray-500">
            Autosave on blur
          </div>
        </div>
      </div>
      
      {/* BODY SECTION - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section B: Props in this Frame */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Props in this frame
            </h3>
            <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
              {propsCount}
            </div>
          </div>
          
          {propsCount === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <div className="text-2xl mb-1.5">📝</div>
              <p className="text-xs font-medium text-gray-900 mb-0.5">No props yet</p>
              <p className="text-[10px] text-gray-500">
                Add props below
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {framePropsList.map((prop, index) => (
                <div
                  key={prop.id}
                  className="border border-gray-300 rounded p-2 text-sm text-gray-800 flex flex-col gap-1 overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <Bars3Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{prop.type || 'Untitled Prop'}</div>
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">#{index + 1}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate pl-5">{prop.id}</div>
                  <div className="text-[11px] text-gray-600 truncate pl-5">{prop.summary}</div>
                  <div className="flex gap-2 pl-5">
                    <button 
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Edit prop", prop.id);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Delete prop", prop.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-[10px] text-blue-600 mt-3 flex items-center gap-1">
            ✎ Click Edit to modify prop values
          </p>
        </div>
        
        {/* Section C: Add to Frame */}
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-3">
            Add to frame
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {propLibraryItems.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  console.log("Adding prop to frame", { frameId: frame.id, propType: item.type });
                  onAddPropToFrame(frame.id, item.type);
                }}
                className="group relative rounded-md border border-gray-300 bg-white p-3 hover:border-blue-400 hover:shadow-sm transition-all text-left overflow-hidden"
              >
                <div className="flex flex-col items-center text-center gap-1">
                  {item.icon && (
                    <div className="text-gray-500 group-hover:text-blue-600 transition-colors">
                      {item.icon}
                    </div>
                  )}
                  <div className="text-xs font-medium text-gray-900 truncate w-full">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-gray-500 truncate w-full">
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <PlusIcon className="w-2.5 h-2.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FrameConfigPanel;
