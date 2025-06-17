import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

export function DebugButton() {
  console.log('🧭 DEBUG: DebugButton component rendering');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const collectDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'not set',
      deploymentInfo: {
        vercel: {
          env: import.meta.env.VITE_VERCEL_ENV || 'not set',
          url: import.meta.env.VITE_VERCEL_URL || 'not set'
        },
        railway: {
          env: import.meta.env.VITE_RAILWAY_ENV || 'not set',
          url: import.meta.env.VITE_RAILWAY_URL || 'not set'
        }
      },
      corsInfo: {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      },
      localStorage: Object.fromEntries(
        Object.entries(localStorage).filter(([key]) => key.startsWith('keeper_'))
      ),
      sessionStorage: Object.fromEntries(
        Object.entries(sessionStorage).filter(([key]) => key.startsWith('keeper_'))
      ),
      cookies: document.cookie,
      networkInfo: {
        online: navigator.onLine,
        effectiveType: (navigator as any).connection?.effectiveType,
        downlink: (navigator as any).connection?.downlink,
        rtt: (navigator as any).connection?.rtt
      },
      screenInfo: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      recentErrors: (window as any).__RECENT_ERRORS__ || [],
      apiStatus: {
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        corsEnabled: true,
        credentials: 'include',
        allowedOrigins: import.meta.env.VITE_ALLOWED_ORIGINS?.split(',') || []
      }
    };
    setDebugInfo(info);
  };

  const copyToClipboard = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={collectDebugInfo}
        >
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Debug Information</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <pre className="p-4 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </ScrollArea>
        <Button 
          onClick={copyToClipboard} 
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          Copy to Clipboard
        </Button>
      </DialogContent>
    </Dialog>
  );
} 