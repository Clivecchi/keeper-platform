import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Floating debug button for troubleshooting connection issues.
 * Shows in both development and production for debugging purposes.
 */
export const DebugButton: React.FC = () => {
  const navigate = useNavigate();

  console.debug('[DebugButton] rendered');

  // Show in both dev and production for debugging connection issues
  // TODO: Remove or make conditional once issues are resolved
  
  return (
    <button
      type="button"
      aria-label="Debug"
      onClick={() => navigate('/debug')}
      style={{position:'fixed',bottom:'16px',right:'16px',zIndex:99999,background:'#dc2626',color:'#fff',padding:'8px 16px',borderRadius:'9999px',fontSize:'0.875rem',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}
      className="hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-300"
    >
      {import.meta.env.PROD ? 'Debug (PROD)' : 'Debug'}
    </button>
  );
};

export default DebugButton;