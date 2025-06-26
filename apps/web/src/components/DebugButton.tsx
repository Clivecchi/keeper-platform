import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Floating debug button for troubleshooting connection issues.
 * Shows in both development and production for debugging purposes.
 */
export const DebugButton: React.FC = () => {
  console.log('[DebugButton] Component rendered - HARDCODED VERSION');

  return (
    <button
      type="button"
      onClick={() => window.location.href = '/debug'}
      style={{
        position: 'fixed',
        bottom: '20px', 
        right: '20px',
        zIndex: 999999,
        background: 'red',
        color: 'white',
        padding: '20px',
        fontSize: '20px',
        border: '5px solid yellow',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}
    >
      DEBUG BUTTON
    </button>
  );
};

export default DebugButton;