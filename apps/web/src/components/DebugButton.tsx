import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Floating debug button for troubleshooting connection issues.
 * Shows in both development and production for debugging purposes.
 */
export const DebugButton: React.FC = () => {
  const navigate = useNavigate();

  console.log('[DebugButton] Component rendered in environment:', import.meta.env.MODE);
  console.log('[DebugButton] Is production:', import.meta.env.PROD);
  console.log('[DebugButton] Is development:', import.meta.env.DEV);

  // Show in both dev and production for debugging connection issues
  // TODO: Remove or make conditional once issues are resolved
  
  return (
    <button
      type="button"
      aria-label="Debug"
      onClick={() => {
        console.log('[DebugButton] Button clicked, navigating to debug page');
        navigate('/debug');
      }}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 999999,
        background: import.meta.env.PROD ? '#059669' : '#dc2626', // Green in prod, red in dev
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        border: '2px solid white',
        cursor: 'pointer'
      }}
      className="hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {import.meta.env.PROD ? 'DEBUG (PROD)' : 'DEBUG (DEV)'}
    </button>
  );
};

export default DebugButton;