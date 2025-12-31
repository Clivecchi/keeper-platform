import React, { useState } from 'react';

interface HelpTooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  content, 
  placement = 'top',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getTooltipClasses = () => {
    const baseClasses = 'absolute z-50 px-4 py-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-lg md:max-w-xl lg:max-w-2xl';
    
    switch (placement) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseArrowClasses = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';
    
    switch (placement) {
      case 'top':
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 -mt-1`;
      case 'bottom':
        return `${baseArrowClasses} bottom-full left-1/2 transform -translate-x-1/2 -mb-1`;
      case 'left':
        return `${baseArrowClasses} left-full top-1/2 transform -translate-y-1/2 -ml-1`;
      case 'right':
        return `${baseArrowClasses} right-full top-1/2 transform -translate-y-1/2 -mr-1`;
      default:
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 -mt-1`;
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Help Icon Button */}
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="Help information"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div className={getTooltipClasses()}>
          <div className={getArrowClasses()}></div>
          {content}
        </div>
      )}
    </div>
  );
};

export default HelpTooltip; 