import React, { useEffect, useState } from 'react';
import FramePicker from './FramePicker';
import { useBoard } from '../../context/BoardContext';

export const BoardToolbar: React.FC = () => {
  const { activeBoard } = useBoard();
  const [showPicker, setShowPicker] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!showApply) return;
    (async () => {
      try {
        const res = await fetch('/api/board-templates', { credentials: 'include' });
        const json = await res.json();
        setTemplates(json?.data || []);
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    })();
  }, [showApply]);

  const saveTemplate = async () => {
    if (!activeBoard) return;
    try {
      const frames = (activeBoard.data?.frames ?? []).map((f) => ({ id: f.id, key: f.key, title: f.title, visible: f.visible ?? true, props: f.props, region: f.region }));
      const layoutPrefs = (activeBoard.data as any)?.layoutPrefs;
      await fetch('/api/board-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name, description, frames, layoutPrefs })
      });
      setShowSave(false);
      setName(''); setDescription('');
    } catch (e) {
      console.error('Save template failed', e);
    }
  };

  const applyTemplate = async (templateId: string) => {
    if (!activeBoard) return;
    try {
      await fetch(`/api/board-templates/${templateId}/apply?boardId=${activeBoard.id}`, { method: 'POST', credentials: 'include' });
      setShowApply(false);
    } catch (e) {
      console.error('Apply template failed', e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-1 rounded border" onClick={() => setShowPicker(true)}>Add Frame</button>
      <button className="px-3 py-1 rounded border" onClick={() => setShowSave(true)}>Save as Template</button>
      <button className="px-3 py-1 rounded border" onClick={() => setShowApply(true)}>Apply Template</button>

      {showPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded shadow w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <FramePicker onClose={() => setShowPicker(false)} />
          </div>
        </div>
      )}

      {showSave && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={() => setShowSave(false)}>
          <div className="bg-white rounded shadow w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Save as Template</h3>
            <input className="border rounded w-full p-2 mb-2" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="border rounded w-full p-2 mb-2" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => setShowSave(false)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveTemplate} disabled={!name.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showApply && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={() => setShowApply(false)}>
          <div className="bg-white rounded shadow w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">Apply Template</h3>
            <div className="space-y-2 max-h-80 overflow-auto">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                  </div>
                  <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => applyTemplate(t.id)}>Apply</button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <button className="px-3 py-1 rounded border" onClick={() => setShowApply(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardToolbar;

