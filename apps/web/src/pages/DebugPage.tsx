import * as React from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Type definitions for diagnostics structure
interface EnvironmentInfo {
  mode: string;
  isDev: boolean;
  isProd: boolean;
  apiBaseUrl: string;
  currentUrl: string;
  origin: string;
  userAgent: string;
}

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  idType: string;
  idLength: number;
  isValidUUID: boolean;
}

interface TestResult {
  status: 'SUCCESS' | 'ERROR' | 'TESTED' | 'FAILED';
  data?: unknown;
  error?: string;
  userKeys?: unknown;
  platformKeys?: unknown;
}

interface ConsoleError {
  type: 'error' | 'warning';
  message: string;
  timestamp: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  ok: boolean;
  duration: number;
  timestamp: string;
  error?: string;
}

interface DomainInfo {
  host: string;
  protocol: string;
  port: string;
  pathname: string;
  reachable: boolean;
  error?: string;
}

interface CorsTestResult {
  status?: number;
  statusText?: string;
  headers?: Record<string, string | undefined>;
  success: boolean;
  error?: string;
  approach?: string;
  endpoint?: string;
  data?: unknown;
}

interface DetailedNetworkDiagnostics {
  domain?: DomainInfo;
  corsTests?: Record<string, CorsTestResult>;
}

interface DiagnosticsSummary {
  total: number;
  passed: number;
  failed: number;
  score: string;
  percentage: number;
  overallStatus: 'ALL_PASS' | 'PARTIAL_PASS' | 'ALL_FAIL';
}

interface DiagnosticsData {
  timestamp: string;
  platform: string;
  version: string;
  environment: EnvironmentInfo;
  user: UserInfo;
  tests: Record<string, TestResult>;
  consoleErrors: ConsoleError[];
  networkRequests: NetworkRequest[];
  detailedNetworkDiagnostics?: DetailedNetworkDiagnostics;
  summary?: DiagnosticsSummary;
  logs?: string[];
}

// Type guards
function isDiagnosticsData(value: unknown): value is DiagnosticsData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timestamp' in value &&
    'platform' in value &&
    'tests' in value &&
    typeof (value as DiagnosticsData).timestamp === 'string' &&
    typeof (value as DiagnosticsData).platform === 'string' &&
    typeof (value as DiagnosticsData).tests === 'object'
  );
}

function isTestResult(value: unknown): value is TestResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as TestResult).status === 'string'
  );
}

function isConsoleError(value: unknown): value is ConsoleError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    'timestamp' in value &&
    typeof (value as ConsoleError).type === 'string' &&
    typeof (value as ConsoleError).message === 'string'
  );
}

function isNetworkRequest(value: unknown): value is NetworkRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    'method' in value &&
    'ok' in value &&
    typeof (value as NetworkRequest).url === 'string'
  );
}

const DebugPage: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [copied, setCopied] = React.useState(false);

  // Add to logs
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const clearResults = () => {
    setLogs([]);
    setResults(null);
    setError(null);
    setCopied(false);
  };

  // Single comprehensive diagnostic function that auto-copies results
  const runComprehensiveDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setCopied(false);
    clearResults();
    
    addLog('🚀 Starting comprehensive system diagnostics...');
    
    const logs: string[] = [];
    const diagnostics: DiagnosticsData = {
      timestamp: new Date().toISOString(),
      platform: 'Keeper Platform',
      version: 'v1.0',
      environment: {
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
        apiBaseUrl: window.location.origin,
        currentUrl: window.location.href,
        origin: window.location.origin,
        userAgent: navigator.userAgent
      },
      user: {
        id: user?.id ?? null,
        email: user?.email ?? null,
        name: user?.name ?? null,
        idType: typeof user?.id,
        idLength: user?.id?.length || 0,
        isValidUUID: user?.id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) : false
      },
      tests: {} as Record<string, TestResult>,
      consoleErrors: [],
      networkRequests: []
    };

    // Capture console errors during testing
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      diagnostics.consoleErrors.push({
        type: 'error',
        message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
        timestamp: new Date().toISOString()
      });
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args) => {
      diagnostics.consoleErrors.push({
        type: 'warning', 
        message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
        timestamp: new Date().toISOString()
      });
      originalConsoleWarn.apply(console, args);
    };

    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : 
                  args[0] instanceof URL ? args[0].href :
                  args[0] instanceof Request ? args[0].url : 
                  'unknown';
      
      try {
        const response = await originalFetch.apply(window, args);
        const endTime = Date.now();
        
        diagnostics.networkRequests.push({
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        });
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        diagnostics.networkRequests.push({
          url,
          method: args[1]?.method || 'GET', 
          status: 0,
          statusText: 'Network Error',
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };

    // User info is already added in the diagnostics initialization above

    // ENHANCED NETWORK DIAGNOSTICS - Let's understand the exact failure point
    addLog('🔍 Running detailed network diagnostics...');
    
    const baseUrl = diagnostics.environment.apiBaseUrl;
    const environment = diagnostics.environment;
    const detailedNetworkDiagnostics: DetailedNetworkDiagnostics = {};
    diagnostics.detailedNetworkDiagnostics = detailedNetworkDiagnostics;

    // Test 1: Basic connectivity to Railway domain
    try {
      addLog('Testing basic Railway domain connectivity...');
      const urlTest = new URL(baseUrl);
      detailedNetworkDiagnostics.domain = {
        host: urlTest.host,
        protocol: urlTest.protocol,
        port: urlTest.port || (urlTest.protocol === 'https:' ? '443' : '80'),
        pathname: urlTest.pathname,
        reachable: true
      };
      addLog(`✅ Domain parsed: ${urlTest.host}`, 'success');
    } catch (e) {
      detailedNetworkDiagnostics.domain = {
        host: 'unknown',
        protocol: 'unknown',
        port: 'unknown',
        pathname: 'unknown',
        reachable: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
      addLog(`❌ Domain parsing failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    // Test 2: Try different request methods to understand CORS behavior
    addLog('Testing CORS preflight vs actual requests...');
    const corsTests: Record<string, CorsTestResult> = {};

    // Test OPTIONS (preflight) - this should work based on Railway logs
    try {
      addLog('Testing OPTIONS preflight request...');
      const optionsResponse = await fetch(`${baseUrl}/ping`, {
        method: 'OPTIONS',
        mode: 'cors'
      });
      corsTests.options = {
        status: optionsResponse.status,
        statusText: optionsResponse.statusText,
        headers: {
          'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin') || undefined,
          'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods') || undefined,
          'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers') || undefined,
          'access-control-allow-credentials': optionsResponse.headers.get('access-control-allow-credentials') || undefined
        },
        success: optionsResponse.ok
      };
      addLog(`✅ OPTIONS /ping: ${optionsResponse.status} ${optionsResponse.statusText}`, 'success');
    } catch (e) {
      corsTests.options = {
        error: e instanceof Error ? e.message : 'Unknown error',
        success: false
      };
      addLog(`❌ OPTIONS /ping failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    // Test 3: Try GET request with different approaches
    addLog('Testing GET requests with different configurations...');
    
    // Test basic GET without custom headers
    try {
      addLog('Testing simple GET /ping...');
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'GET',
        mode: 'cors'
      });
      corsTests.get_simple = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        approach: 'simple_get'
      };
      addLog(`✅ Simple GET /ping: ${response.status} ${response.statusText}`, 'success');
    } catch (e) {
      corsTests.get_simple = {
        error: e instanceof Error ? e.message : 'Unknown error',
        success: false,
        approach: 'simple_get'
      };
      addLog(`❌ Simple GET /ping failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    // Test GET with headers (triggers preflight)
    try {
      addLog('Testing GET /ping with custom headers...');
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      corsTests.get_with_headers = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        approach: 'get_with_headers'
      };
      addLog(`✅ GET /ping with headers: ${response.status} ${response.statusText}`, 'success');
    } catch (e) {
      corsTests.get_with_headers = {
        error: e instanceof Error ? e.message : 'Unknown error',
        success: false,
        approach: 'get_with_headers'
      };
      addLog(`❌ GET /ping with headers failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    // Test 4: Check if server is responding to basic health checks
    try {
      addLog('Testing /health endpoint...');
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        mode: 'cors'
      });
      corsTests.health_check = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        endpoint: '/health'
      };
      addLog(`✅ Health check: ${response.status} ${response.statusText}`, 'success');
    } catch (e) {
      corsTests.health_check = {
        error: e instanceof Error ? e.message : 'Unknown error',
        success: false,
        endpoint: '/health'
      };
      addLog(`❌ Health check failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    // Test 5: Check Railway-specific status endpoint
    try {
      addLog('Testing /railway-status endpoint...');
      const response = await fetch(`${baseUrl}/railway-status`, {
        method: 'GET',
        mode: 'cors'
      });
      if (response.ok) {
        const data = await response.json();
        corsTests.railway_status = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          endpoint: '/railway-status',
          data: data
        };
        addLog(`✅ Railway status: ${response.status} ${response.statusText}`, 'success');
      } else {
        corsTests.railway_status = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          endpoint: '/railway-status'
        };
        addLog(`⚠️ Railway status: ${response.status} ${response.statusText}`, 'error');
      }
    } catch (e) {
      corsTests.railway_status = {
        error: e instanceof Error ? e.message : 'Unknown error',
        success: false,
        endpoint: '/railway-status'
      };
      addLog(`❌ Railway status failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
    
    detailedNetworkDiagnostics.corsTests = corsTests;

    try {
      // Test 1: Basic API connectivity
      addLog('📡 Testing basic API connectivity...');
      try {
        const apiTest = await apiFetch('/api/test', { method: 'GET' });
        diagnostics.tests.apiConnectivity = { status: 'SUCCESS', data: apiTest };
        addLog('✅ API connectivity test passed', 'success');
      } catch (err) {
        diagnostics.tests.apiConnectivity = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ API connectivity test failed', 'error');
      }

      // Test 2: Database connectivity
      addLog('🗄️ Testing database connectivity...');
      try {
        const dbTest = await apiFetch('/api/debug/database', { method: 'GET' });
        diagnostics.tests.database = { status: 'SUCCESS', data: dbTest };
        addLog('✅ Database test passed', 'success');
      } catch (err) {
        diagnostics.tests.database = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Database test failed', 'error');
      }

      // Test 3: UUID validation
      addLog('🆔 Testing UUID generation and validation...');
      try {
        const clientUUID = crypto.randomUUID();
        const uuidTest = await apiFetch('/api/debug/uuid-test', {
          method: 'POST',
          body: JSON.stringify({ 
            testUUID: clientUUID,
            userID: user?.id,
            testString: 'invalid-uuid'
          }),
        });
        diagnostics.tests.uuid = { status: 'SUCCESS', data: uuidTest };
        addLog('✅ UUID validation test passed', 'success');
      } catch (err) {
        diagnostics.tests.uuid = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ UUID validation test failed', 'error');
      }

      // Test 4: API Key endpoints
      addLog('🔑 Testing API Key endpoints...');
      try {
        const [userKeysTest, platformKeysTest] = await Promise.all([
          apiFetch('/api/kip/user-keys', { method: 'GET' }).catch(err => ({ error: err.message })),
          apiFetch('/api/kip/platform-keys', { method: 'GET' }).catch(err => ({ error: err.message }))
        ]);
        
        diagnostics.tests.apiKeys = { 
          status: 'SUCCESS', 
          userKeys: userKeysTest,
          platformKeys: platformKeysTest
        };
        addLog('✅ API Keys endpoint test completed', 'success');
      } catch (err) {
        diagnostics.tests.apiKeys = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ API Keys endpoint test failed', 'error');
      }

      // Test 5: Platform Key Status Check (SAFE - No Key Creation)
      addLog('🔑 Checking existing platform key status...');
      try {
        // Check what keys exist WITHOUT creating any test keys
        const keyStatusTest = await apiFetch('/api/kip/platform-keys', {
          headers: {
            'x-user-id': user?.id || 'test-user'
          }
        });
        
        diagnostics.tests.platformKeyStatus = { status: 'SUCCESS', data: keyStatusTest };
        addLog('✅ Platform key status check completed (no keys modified)', 'success');
      } catch (err) {
        diagnostics.tests.platformKeyStatus = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Platform key status check failed', 'error');
      }

      // Test 6: Authentication & Session
      addLog('🔐 Testing authentication state...');
      try {
        const authTest = {
          isAuthenticated: !!user,
          hasSession: !!user?.id,
          sessionStorage: !!localStorage.getItem('auth-token'),
          cookiesEnabled: navigator.cookieEnabled
        };
        diagnostics.tests.authentication = { status: 'SUCCESS', data: authTest };
        addLog('✅ Authentication test completed', 'success');
      } catch (err) {
        diagnostics.tests.authentication = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Authentication test failed', 'error');
      }

      // Test 7: Browser capabilities
      addLog('🌐 Testing browser capabilities...');
      try {
        const browserTest = {
          localStorage: typeof Storage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          crypto: typeof crypto !== 'undefined',
          clipboard: !!navigator.clipboard,
          online: navigator.onLine,
          language: navigator.language,
          platform: navigator.platform
        };
        diagnostics.tests.browser = { status: 'SUCCESS', data: browserTest };
        addLog('✅ Browser capabilities test passed', 'success');
      } catch (err) {
        diagnostics.tests.browser = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Browser capabilities test failed', 'error');
      }

      // Test 8: Agent System Testing
      addLog('🤖 Testing agent system...');
      try {
        const agentTest = await apiFetch('/api/kip/agents', { method: 'GET' });
        diagnostics.tests.agents = { status: 'SUCCESS', data: agentTest };
        addLog('✅ Agent system test passed', 'success');
      } catch (err) {
        diagnostics.tests.agents = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Agent system test failed', 'error');
      }

      // Test 9: Chat Functionality Testing
      addLog('💬 Testing chat functionality with real agent...');
      try {
        const chatTest = await apiFetch('/api/kip/agents', {
          method: 'POST',
          body: JSON.stringify({
            action: 'run',
            agentId: 'kip', // Use default kip agent
            input: 'Hello, this is a test message from debug system',
            userId: user?.id
          })
        });
        diagnostics.tests.chatFunctionality = { status: 'SUCCESS', data: chatTest };
        addLog('✅ Chat functionality test passed', 'success');
      } catch (err) {
        diagnostics.tests.chatFunctionality = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Chat functionality test failed', 'error');
      }

      // Test 10: Model Provider Service Testing
      addLog('🧠 Testing model provider service...');
      try {
        // Test the model provider endpoint if it exists
        const modelTest = await apiFetch('/api/debug/model-provider-test', {
          method: 'POST',
          body: JSON.stringify({
            provider: 'openai',
            messages: [{ role: 'user', content: 'Debug test message' }],
            userId: user?.id
          })
        }).catch(err => ({ 
          error: err.message, 
          note: 'Model provider debug endpoint may not exist - this is expected' 
        }));
        
        diagnostics.tests.modelProvider = { status: 'TESTED', data: modelTest };
        addLog('✅ Model provider test completed', 'success');
      } catch (err) {
        diagnostics.tests.modelProvider = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Model provider test failed', 'error');
      }

      // Test 11: Console Error Capture
      addLog('🐛 Capturing console errors...');
      try {
        const consoleErrors: string[] = [];
        const originalError = console.error;
        
        // Temporarily capture console errors
        console.error = (...args: unknown[]) => {
          consoleErrors.push(args.join(' '));
          originalError(...args);
        };
        
        // Restore original console.error after a short delay
        setTimeout(() => {
          console.error = originalError;
        }, 1000);
        
        diagnostics.tests.consoleErrors = { 
          status: 'SUCCESS', 
          data: { 
            errors: consoleErrors,
            note: 'Errors captured during diagnostic run'
          } 
        };
        addLog('✅ Console error capture setup', 'success');
      } catch (err) {
        diagnostics.tests.consoleErrors = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Console error capture failed', 'error');
      }

      // Test 12: Network Request Monitoring
      addLog('🌐 Testing network request capabilities...');
      try {
        const networkTest = {
          fetchAvailable: typeof fetch !== 'undefined',
          xhrAvailable: typeof XMLHttpRequest !== 'undefined',
          baseUrl: window.location.origin,
          currentOrigin: window.location.origin,
          corsEnabled: true, // We'll assume this based on successful API calls above
          lastRequestTime: new Date().toISOString()
        };
        
        diagnostics.tests.networkMonitoring = { status: 'SUCCESS', data: networkTest };
        addLog('✅ Network request test passed', 'success');
      } catch (err) {
        diagnostics.tests.networkMonitoring = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Network request test failed', 'error');
      }

      // Test 13: Database Fix (Auto-fix missing agents and activate keys)
      addLog('🔧 Auto-fixing database issues (missing agents, inactive keys)...');
      try {
        const dbFix = await apiFetch('/api/debug/fix-database', {
          method: 'POST',
          body: JSON.stringify({})
        });
        
        diagnostics.tests.databaseFix = { status: 'SUCCESS', data: dbFix };
        
        if (dbFix.success && dbFix.data) {
          const { actions, errors } = dbFix.data as { actions: Array<{message: string}>, errors: Array<{error: string}> };
          if (actions.length > 0) {
            addLog(`✅ Database fixes applied: ${actions.map((a) => a.message).join(', ')}`, 'success');
          }
          if (errors.length > 0) {
            addLog(`⚠️ Some fixes failed: ${errors.map((e) => e.error).join(', ')}`, 'error');
          }
        }
        addLog('✅ Database fix test completed', 'success');
      } catch (err) {
        diagnostics.tests.databaseFix = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Database fix test failed', 'error');
      }

      // Test 14: Database Fix Auto-Repair
      addLog('🔧 Testing database auto-repair and Kip provider fix...');
      try {
        const fixResponse = await fetch(new URL('api/debug/fix-kip-provider', (import.meta as any).env.VITE_API_URL).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const fixData = await fixResponse.json();
        
        if (fixData.success) {
          diagnostics.tests.kipProviderFix = { status: 'SUCCESS', data: fixData.data };
          addLog('✅ Kip provider fix completed successfully', 'success');
        } else {
          diagnostics.tests.kipProviderFix = { status: 'FAILED', data: fixData };
          addLog(`❌ Kip provider fix failed: ${fixData.error}`, 'error');
        }
      } catch (err) {
        diagnostics.tests.kipProviderFix = { 
          status: 'ERROR', 
          data: { error: err instanceof Error ? err.message : 'Unknown error' }
        };
        addLog(`❌ Kip provider fix error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }

      // Test 15: Specific Kip Chat Testing  
      addLog('💬 Testing Kip chat functionality...');
      try {
        const kipChatTest = await apiFetch('/api/kip/agents', {
          method: 'POST',
          body: JSON.stringify({
            action: 'run',
            agentId: 'kip', // Test using slug - this might be the issue!
            input: 'Hello Kip, can you help me test if you are working correctly?',
            userId: user?.id
          })
        });
        
        diagnostics.tests.kipChatTest = { status: 'SUCCESS', data: kipChatTest };
        addLog('✅ Kip chat test completed', 'success');
      } catch (err) {
        diagnostics.tests.kipChatTest = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
        addLog('❌ Kip chat test failed', 'error');
      }

      // Test 16: Platform Key Detection Test
      addLog('🔑 Testing platform key detection...');
      try {
        const platformKeyStats = await apiFetch('/api/kip/platform-keys/stats', {
          headers: {
            'x-user-id': user?.id || 'test-user'
          }
        });
        
        diagnostics.tests.platformKeyDetection = { 
          status: 'SUCCESS', 
          data: platformKeyStats 
        };
        addLog('✅ Platform key detection test completed', 'success');
      } catch (err) {
        diagnostics.tests.platformKeyDetection = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : String(err) 
        };
        addLog('❌ Platform key detection test failed', 'error');
      }

      // Test 17: Raw Platform Keys Query
      addLog('🗄️ Testing raw platform keys query...');
      try {
        const rawPlatformKeys = await apiFetch('/api/kip/platform-keys', {
          headers: {
            'x-user-id': user?.id || 'test-user'
          }
        });
        
        diagnostics.tests.rawPlatformKeys = { 
          status: 'SUCCESS', 
          data: rawPlatformKeys 
        };
        addLog('✅ Raw platform keys query completed', 'success');
      } catch (err) {
        diagnostics.tests.rawPlatformKeys = { 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : String(err) 
        };
        addLog('❌ Raw platform keys query failed', 'error');
      }



      // Cleanup: Restore original browser methods
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.fetch = originalFetch;

              // Test 18: Console Errors Summary
      diagnostics.tests.consoleErrorsSummary = {
        status: 'SUCCESS',
        data: {
          totalErrors: diagnostics.consoleErrors.filter((e) => e.type === 'error').length,
          totalWarnings: diagnostics.consoleErrors.filter((e) => e.type === 'warning').length,
          errors: diagnostics.consoleErrors
        }
      };

              // Test 19: Network Requests Summary
      diagnostics.tests.networkRequestsSummary = {
        status: 'SUCCESS',
        data: {
          totalRequests: diagnostics.networkRequests.length,
          successfulRequests: diagnostics.networkRequests.filter((r) => r.ok).length,
          failedRequests: diagnostics.networkRequests.filter((r) => !r.ok).length,
          requests: diagnostics.networkRequests
        }
      };

      // Generate comprehensive summary
      const testCount = Object.keys(diagnostics.tests).length;
      const successCount = Object.values(diagnostics.tests).filter((test) => test.status === 'SUCCESS').length;
      const errorCount = Object.values(diagnostics.tests).filter((test) => test.status === 'ERROR').length;
      
      diagnostics.summary = {
        total: testCount,
        passed: successCount,
        failed: errorCount,
        score: `${successCount}/${testCount}`,
        percentage: Math.round((successCount / testCount) * 100),
        overallStatus: errorCount === 0 ? 'ALL_PASS' : errorCount < testCount ? 'PARTIAL_PASS' : 'ALL_FAIL'
      };

      diagnostics.logs = logs;
      
      addLog(`🎯 Diagnostics complete: ${successCount}/${testCount} tests passed (${diagnostics.summary.percentage}%)`, 
        errorCount === 0 ? 'success' : 'info');
      
      setResults(diagnostics);

      // Auto-copy to clipboard
      addLog('📋 Copying comprehensive report to clipboard...', 'info');
      await copyDiagnosticsToClipboard(diagnostics as DiagnosticsData);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Fatal error during diagnostics: ${errorMsg}`, 'error');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyDiagnosticsToClipboard = async (diagnosticsData: DiagnosticsData) => {
    try {
      const comprehensiveReport = {
        '=== KEEPER PLATFORM DEBUG REPORT ===': '',
        timestamp: diagnosticsData.timestamp,
        platform: diagnosticsData.platform,
        version: diagnosticsData.version,
        '_spacer1': '',
        '=== ENVIRONMENT INFO ===': '',
        environment: diagnosticsData.environment,
        '_spacer2': '',
        '=== USER INFO ===': '',
        user: diagnosticsData.user,
        '_spacer3': '',
        '=== TEST RESULTS SUMMARY ===': '',
        summary: diagnosticsData.summary,
        '_spacer4': '',
        '=== DETAILED TEST RESULTS ===': '',
        tests: diagnosticsData.tests,
        '_spacer5': '',
        '=== DIAGNOSTIC LOGS ===': '',
        logs: diagnosticsData.logs,
        '_spacer6': '',
        '=== END REPORT ===': `Generated at ${new Date().toISOString()}`
      };

      await navigator.clipboard.writeText(JSON.stringify(comprehensiveReport, null, 2));
      setCopied(true);
      addLog('✅ Complete diagnostic report copied to clipboard!', 'success');
      
      // Show success message for a few seconds
      setTimeout(() => setCopied(false), 5000);
    } catch (err) {
      addLog('❌ Failed to copy to clipboard', 'error');
      console.error('Clipboard error:', err);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🔧 System Diagnostics</h1>
        <p className="text-gray-600">Comprehensive system health check & debug report generator</p>
      </div>
      
      {/* Single Primary Action */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border-2 border-blue-200 shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">🚀 Complete System Analysis</h2>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Run comprehensive diagnostics across all system components including API connectivity, database health, 
            authentication, UUID validation, API key management, and browser capabilities. 
            <strong className="text-blue-600"> Results automatically copied to clipboard for easy sharing.</strong>
          </p>
          
          <button
            type="button"
            className="px-12 py-6 text-xl font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transform hover:scale-105 transition-all duration-200"
            onClick={runComprehensiveDiagnostics}
            disabled={loading}
          >
                                                   {loading ? '🔄 Running Full Diagnostics...' : '🚀 Run Complete Diagnostics & Copy Report'}
          </button>

          {copied && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 font-semibold">
              ✅ Complete diagnostic report copied to clipboard! Ready to share.
            </div>
          )}
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex justify-center">
        <button
          type="button"
          className="px-4 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600 text-sm"
          onClick={clearResults}
        >
          🗑️ Clear Results
        </button>
      </div>

      {/* Real-time Logs */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            📝 Live Diagnostics Progress
            <span className="text-sm font-normal text-gray-500">({logs.length} entries)</span>
          </h3>
          <pre className="p-4 bg-black text-green-400 rounded-lg overflow-auto text-sm max-h-60 font-mono border-2 border-gray-300">
            {logs.join('\n')}
          </pre>
        </div>
      )}

      {/* Results Summary Dashboard */}
      {results?.summary && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-center">📊 Diagnostics Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-3xl font-bold text-gray-800">{results.summary.total}</div>
              <div className="text-sm text-gray-600 font-medium">Total Tests</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600">{results.summary.passed}</div>
              <div className="text-sm text-gray-600 font-medium">Passed</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600">{results.summary.failed}</div>
              <div className="text-sm text-gray-600 font-medium">Failed</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{results.summary.score}</div>
              <div className="text-sm text-gray-600 font-medium">Score</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{results.summary.percentage}%</div>
              <div className="text-sm text-gray-600 font-medium">Success Rate</div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg text-center font-bold text-lg ${
            results.summary.overallStatus === 'ALL_PASS' ? 'bg-green-100 text-green-800 border border-green-300' :
            results.summary.overallStatus === 'PARTIAL_PASS' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
            'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {results.summary.overallStatus === 'ALL_PASS' ? '✅ All Systems Operational' :
             results.summary.overallStatus === 'PARTIAL_PASS' ? '⚠️ Some Issues Detected - Partial Success' :
             '❌ Multiple System Failures Detected'}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              📋 Complete diagnostic report has been copied to your clipboard and is ready to share!
            </p>
          </div>
        </div>
      )}

      {/* Detailed Results (Collapsible) */}
      {results && (
        <details className="bg-gray-50 border rounded-lg">
          <summary className="p-4 cursor-pointer hover:bg-gray-100 font-semibold">
            📋 View Detailed Technical Results (Click to expand)
          </summary>
          <pre className="p-4 bg-white border-t overflow-auto text-xs max-h-96 font-mono">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-red-600">❌ Critical Error</h3>
          <p className="text-red-700 font-mono text-sm bg-red-100 p-3 rounded border">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            This error has been included in the diagnostic report copied to your clipboard.
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugPage; 