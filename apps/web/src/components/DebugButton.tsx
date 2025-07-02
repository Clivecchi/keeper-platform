import * as React from 'react';
import { useNavigate } from 'react-router-dom';

interface DebugButtonProps {
  variant?: 'floating' | 'sidebar';
}

/**
 * Debug button for troubleshooting connection issues.
 * Can be used as a floating button or inline in the sidebar.
 */
export const DebugButton: React.FC<DebugButtonProps> = ({ variant = 'floating' }) => {
  console.log('[DebugButton] Component rendered');
  const navigate = useNavigate();

  const floatingStyles = {
    position: 'fixed' as const,
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
  };

  const sidebarStyles = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    background: 'transparent',
    color: 'var(--muted-foreground)',
    borderColor: 'var(--border)',
  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={() => navigate('/debug')}
        style={sidebarStyles}
        className="hover:bg-muted/50 hover:text-foreground"
      >
        🔧 Debug Console
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/debug')}
      style={floatingStyles}
    >
      🔧 DEBUG
    </button>
  );
};

export default DebugButton;