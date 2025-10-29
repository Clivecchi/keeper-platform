/**
 * Frame Configuration Panel
 * 
 * Right-side inspector for frame settings and content management.
 * Provides clean interface for renaming, pattern selection, and prop management.
 */

import React from 'react';
import { Input } from '../v0/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../v0/components/ui/select';
import { ScrollArea } from '../v0/components/ui/scroll-area';
import { Bars3Icon, PlusIcon } from '@heroicons/react/24/outline';

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
    <aside className="w-80 bg-background border-l border-border flex flex-col h-full">
      {/* Header Section */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-start gap-3 mb-4">
          {/* Frame Avatar/Thumbnail */}
          <div className="flex-shrink-0">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={frame.name}
                className="w-12 h-12 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border border-border">
                {firstLetter}
              </div>
            )}
          </div>
          
          {/* Frame Name */}
          <div className="flex-1 min-w-0">
            <Input
              value={frame.name}
              onChange={(e) => onRenameFrame(frame.id, e.target.value)}
              className="font-medium text-base h-9 mb-1"
              placeholder="Frame name"
            />
            <div className="text-[10px] text-muted-foreground truncate">
              ID: {frame.id.substring(0, 8)}... · {frame.role || 'Custom'}
            </div>
          </div>
        </div>
        
        {/* Pattern Selector */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            Engagement Pattern
          </label>
          <Select
            value={frame.pattern}
            onValueChange={(value) => onChangePattern(frame.id, value)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dialogic">
                <div className="py-1">
                  <div className="font-medium text-sm">Dialogic</div>
                  <div className="text-[10px] text-muted-foreground">Conversation flow</div>
                </div>
              </SelectItem>
              <SelectItem value="wizard">
                <div className="py-1">
                  <div className="font-medium text-sm">Wizard</div>
                  <div className="text-[10px] text-muted-foreground">Step-by-step</div>
                </div>
              </SelectItem>
              <SelectItem value="focus">
                <div className="py-1">
                  <div className="font-medium text-sm">Focus</div>
                  <div className="text-[10px] text-muted-foreground">Single element</div>
                </div>
              </SelectItem>
              <SelectItem value="canvas">
                <div className="py-1">
                  <div className="font-medium text-sm">Canvas</div>
                  <div className="text-[10px] text-muted-foreground">Freeform</div>
                </div>
              </SelectItem>
              <SelectItem value="gallery">
                <div className="py-1">
                  <div className="font-medium text-sm">Gallery</div>
                  <div className="text-[10px] text-muted-foreground">Image grid</div>
                </div>
              </SelectItem>
              <SelectItem value="form">
                <div className="py-1">
                  <div className="font-medium text-sm">Form</div>
                  <div className="text-[10px] text-muted-foreground">Data entry</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[10px] text-muted-foreground">
            Auto-save enabled
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Props in this Frame */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                Props in this frame
              </h3>
              <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                {propsCount}
              </div>
            </div>
            
            {propsCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-xs font-medium text-foreground mb-1">No props yet</p>
                <p className="text-[10px] text-muted-foreground">
                  Add props below to build your frame
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {framePropsList.map((prop, index) => (
                  <div
                    key={prop.id}
                    className="group rounded-md border border-border bg-card p-3 hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Bars3Icon className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {prop.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {prop.summary}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-[10px] text-primary flex items-center gap-1">
              ✎ Switch to Edit mode to manage props
            </p>
          </div>
          
          {/* Add New Content */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Add to frame
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {propLibraryItems.map((item) => (
                <button
                  key={item.type}
                  onClick={() => onAddPropToFrame(frame.id, item.type)}
                  className="group relative rounded-lg border border-border bg-card p-3 hover:border-primary hover:bg-accent/10 transition-all text-left"
                >
                  <div className="flex flex-col items-center text-center gap-1.5">
                    {item.icon && (
                      <div className="text-muted-foreground group-hover:text-primary transition-colors">
                        {item.icon}
                      </div>
                    )}
                    <div className="text-xs font-medium text-foreground">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-muted-foreground line-clamp-2">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <PlusIcon className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

export default FrameConfigPanel;

