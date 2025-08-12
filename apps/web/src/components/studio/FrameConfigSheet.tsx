import React from 'react';
// Prefer the .tsx variant when bundling
import { patternRegistry, PatternId } from '../../patterns/registry.tsx';

interface FrameConfigSheetProps {
  frameId: string;
  name: string;
  slug?: string;
  pattern: PatternId;
  onClose: () => void;
  onSave: (updates: { name?: string; slug?: string; pattern?: PatternId; options?: Record<string, unknown> }) => void;
}

export const FrameConfigSheet: React.FC<FrameConfigSheetProps> = ({ frameId, name, slug, pattern, onClose, onSave }) => {
  const patternMeta = patternRegistry[pattern];

  return (
    <div className="fixed inset-0 bg-black/40 z-[10000] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full md:max-w-2xl md:rounded-xl md:shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Frame Settings</h2>
          <p className="text-sm text-slate-500">Configure how this frame behaves and appears.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frame Name</label>
              <input defaultValue={name} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input defaultValue={slug} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Engagement Pattern</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(patternRegistry).map(p => (
                <button key={p.id} className={`border rounded p-3 text-left hover:bg-slate-50 ${p.id===pattern?'border-blue-500 ring-1 ring-blue-500':''}`}>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.summary}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pattern Preview</label>
            <patternMeta.Preview />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI Assist</label>
            <div className="text-sm text-slate-600">{patternMeta.whenToUse.join(' • ')}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={() => onSave({})} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
};

export default FrameConfigSheet;


