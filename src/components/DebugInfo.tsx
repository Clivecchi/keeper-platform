import React from 'react';

export const DebugInfo: React.FC = () => {
  const [themeVars, setThemeVars] = React.useState<Record<string, string>>({});
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const vars: Record<string, string> = {};
    
    // Get all CSS custom properties
    const computedStyle = getComputedStyle(root);
    const cssVars = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--button',
      '--button-foreground',
    ];

    cssVars.forEach(varName => {
      const value = computedStyle.getPropertyValue(varName);
      if (value) {
        vars[varName] = value;
      }
    });

    setThemeVars(vars);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-red-500 text-white px-2 py-1 rounded text-xs z-50"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded text-xs z-50 max-w-md max-h-96 overflow-auto">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-white"
      >
        ×
      </button>
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div>Theme Variables:</div>
        {Object.entries(themeVars).map(([key, value]) => (
          <div key={key} className="text-xs">
            {key}: {value}
          </div>
        ))}
        <div className="mt-2">
          <div>Tailwind Classes Test:</div>
          <div className="bg-background text-foreground p-2 border border-border rounded">
            This should be styled
          </div>
        </div>
      </div>
    </div>
  );
};
