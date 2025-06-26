import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Floating debug button for troubleshooting connection issues.
 * Shows in both development and production for debugging purposes.
 */
export const DebugButton: React.FC = () => {
  console.log('[DebugButton] Component rendered');
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/debug')}
      style={{
        position: 'fixed',
        bottom: '20px', 
        right: '20px',
        zIndex: 999999,
        background: import.meta.env.PROD ? 'red' : 'blue',
        color: 'white',
        padding: '15px',
        fontSize: '16px',
        border: '3px solid yellow',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}
    >
      🔧 DEBUG
    </button>
  );
};

export default DebugButton;