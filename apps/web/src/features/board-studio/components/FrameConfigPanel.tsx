/**
 * Frame Configuration Panel
 * 
 * Right-side inspector for frame settings and content management.
 * Provides clean interface for renaming, pattern selection, and prop management.
 */

import React from 'react';
import { Input } from '../v0/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../v0/components/ui/select';
import { Bars3Icon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

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
  const propsCount = framePropsList.length;
  
  // Get first letter for avatar fallback
  const firstLetter = frame.name.charAt(0).toUpperCase() || 'F';
  
  // Get preview thumb URL (first image prop if exists)
  const thumbUrl = frame.previewThumbUrl || (() => {
    const firstImageProp = Object.values(frame.props || {}).find(
      (p: any) => p && typeof p === 'object' && (p.type === 'image' || p.type === 'gallery')
    ) as any;
    return firstImageProp?.config?.url || null;
  })();

  return (
    <div className="flex flex-col border-l bg-background h-full w-[360px] shrink-0 overflow-y-auto">
      {/* Section A: Frame Basics */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3 mb-4">
          {/* Frame Avatar/Thumbnail */}
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={frame.name}
              className="w-8 h-8 rounded object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border border-border flex-shrink-0">
              {firstLetter}
            </div>
          )}
          
          {/* Frame Name Input */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
              Frame Name
            </label>
            <Input
              value={frame.name}
              onChange={(e) => onRenameFrame(frame.id, e.target.value)}
              onBlur={(e) => onRenameFrame(frame.id, e.target.value)}
              className="text-sm h-8 w-full bg-background"
              placeholder="Frame name"
            />
          </div>
        </div>
        
        {/* Metadata Line */}
        <div className="text-[10px] text-muted-foreground mb-3 truncate">
          ID: {frame.id.substring(0, 8)}... · {frame.pattern}
        </div>
        
        {/* Pattern Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground block">
            Engagement Pattern
          </label>
          <Select
            value={frame.pattern}
            onValueChange={(value) => onChangePattern(frame.id, value)}
          >
            <SelectTrigger className="h-8 text-sm w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dialogic">
                <div>
                  <div className="font-medium text-sm">Dialogic</div>
                  <div className="text-[10px] text-muted-foreground">Conversation flow</div>
                </div>
              </SelectItem>
              <SelectItem value="wizard">
                <div>
                  <div className="font-medium text-sm">Wizard</div>
                  <div className="text-[10px] text-muted-foreground">Step-by-step</div>
                </div>
              </SelectItem>
              <SelectItem value="focus">
                <div>
                  <div className="font-medium text-sm">Focus</div>
                  <div className="text-[10px] text-muted-foreground">Single element</div>
                </div>
              </SelectItem>
              <SelectItem value="canvas">
                <div>
                  <div className="font-medium text-sm">Canvas</div>
                  <div className="text-[10px] text-muted-foreground">Freeform</div>
                </div>
              </SelectItem>
              <SelectItem value="gallery">
                <div>
                  <div className="font-medium text-sm">Gallery</div>
                  <div className="text-[10px] text-muted-foreground">Image grid</div>
                </div>
              </SelectItem>
              <SelectItem value="form">
                <div>
                  <div className="font-medium text-sm">Form</div>
                  <div className="text-[10px] text-muted-foreground">Data entry</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[10px] text-muted-foreground">
            Autosave enabled
          </div>
        </div>
      </div>
      
      {/* Section B: Props in this Frame */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Props in this frame
          </h3>
          <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
            {propsCount}
          </div>
        </div>
        
        {propsCount === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center">
            <div className="text-2xl mb-1.5">📝</div>
            <p className="text-xs font-medium text-foreground mb-0.5">No props yet</p>
            <p className="text-[10px] text-muted-foreground">
              Add props below
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {framePropsList.map((prop, index) => (
              <div
                key={prop.id}
                className="rounded-md border border-border bg-card p-3 hover:border-gray-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-2">
                  <Bars3Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {prop.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {prop.summary}
                    </div>
                  </div>
                  {/* Edit icon - for future integration with prop editor */}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity flex-shrink-0"
                    title="Edit prop"
                  >
                    <PencilIcon className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-[10px] text-blue-600 mt-3 flex items-center gap-1">
          ✎ Switch to Studio mode to edit props inline
        </p>
      </div>
      
      {/* Section C: Add to Frame */}
      <div className="p-4">
        <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Add to frame
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {propLibraryItems.map((item) => (
            <button
              key={item.type}
              onClick={() => onAddPropToFrame(frame.id, item.type)}
              className="group relative rounded-md border border-border bg-card p-3 hover:border-blue-400 hover:shadow-sm transition-all text-left"
            >
              <div className="flex flex-col items-center text-center gap-1">
                {item.icon && (
                  <div className="text-gray-500 group-hover:text-blue-600 transition-colors">
                    {item.icon}
                  </div>
                )}
                <div className="text-xs font-medium text-foreground">
                  {item.label}
                </div>
                {item.description && (
                  <div className="text-[10px] text-muted-foreground">
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
  );
}

export default FrameConfigPanel;

