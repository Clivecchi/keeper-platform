import React, { useMemo, useState } from 'react';
import { listFrameDefs } from '../../components/frames/registry';
import { useBoard } from '../../context/BoardContext';

interface FramePickerProps {
  onClose: () => void;
}

export const FramePicker: React.FC<FramePickerProps> = ({ onClose }) => {
  const { activeBoard } = useBoard();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const registry = useMemo(() => listFrameDefs(), []);

  const handleAdd = async (key: string) => {
    if (!activeBoard) return;
    try {
      setSubmitting(key);
      await fetch(`/api/board-data/${activeBoard.id}/frames-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, visible: true })
      });
      onClose();
    } catch (e) {
      console.error('Failed to add frame', e);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-3"><h3 className="text-base font-semibold">Add a frame</h3></div>
      <div className="space-y-2">
        {registry.map((def) => (
          <div key={def.type} className="flex items-center justify-between border rounded p-2 bg-white">
            <div>
              <div className="text-sm font-medium">{def.title}</div>
              <div className="text-xs text-gray-500">{def.type}</div>
            </div>
            <button
              onClick={() => handleAdd(def.type)}
              className="text-sm px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!!submitting}
            >
              {submitting === def.type ? 'Adding...' : 'Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FramePicker;

