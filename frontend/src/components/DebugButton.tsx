import { useState } from 'react';
import { Bug } from 'lucide-react';

interface DiagnosticInfo {
  timestamp: string;
  userAgent: string;
  url: string;
  apiBaseUrl: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: string;
  networkInfo: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  language: string;
}

export function DebugButton() {
  const [isCopied, setIsCopied] = useState(false);

  const collectDiagnostics = (): DiagnosticInfo => {
    const connection = (navigator as any).connection;
    const networkInfo = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };

    const screenInfo = {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
    };

    const localStore: Record<string, string> = {};
    const sessionStore: Record<string, string> = {};

    try {
      Object.keys(window.localStorage).forEach(key => {
        localStore[key] = window.localStorage.getItem(key) || '';
      });
      Object.keys(window.sessionStorage).forEach(key => {
        sessionStore[key] = window.sessionStorage.getItem(key) || '';
      });
    } catch (error) {
      console.error('Error accessing storage:', error);
    }

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'not set',
      localStorage: localStore,
      sessionStorage: sessionStore,
      cookies: document.cookie,
      networkInfo,
      screenInfo,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  };

  const handleCopy = async () => {
    try {
      const diagnostics = collectDiagnostics();
      const formatted = JSON.stringify(diagnostics, null, 2);

      await navigator.clipboard.writeText(formatted);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      // Send to backend for logging
      fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnostics),
      }).catch(err => console.error('Failed to post debug payload', err));
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
      >
        <Bug className="w-4 h-4" />
        <span>{isCopied ? 'Copied!' : 'Copy Debug Info'}</span>
      </button>
    </div>
  );
} 