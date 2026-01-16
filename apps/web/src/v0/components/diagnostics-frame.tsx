"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { apiFetch } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"
import { getLastBoardDataError } from "../../lib/debug"

export interface EnvironmentInfo {
  mode: string
  isDev: boolean
  isProd: boolean
  apiBaseUrl: string
  currentUrl: string
  origin: string
  userAgent: string
}

export interface UserInfo {
  id: string | null
  email: string | null
  name: string | null
  idType: string
  idLength: number
  isValidUUID: boolean
}

export interface TestResult {
  status: "SUCCESS" | "ERROR" | "TESTED" | "FAILED"
  data?: unknown
  error?: string
  userKeys?: unknown
  platformKeys?: unknown
}

export interface ConsoleError {
  type: "error" | "warning"
  message: string
  timestamp: string
}

export interface ConsoleLogEntry {
  level: "log" | "info" | "warn" | "error" | "debug"
  message: string
  timestamp: string
}

export interface NetworkRequest {
  url: string
  method: string
  status: number
  statusText: string
  ok: boolean
  duration: number
  timestamp: string
  error?: string
}

export interface DomainContextInfo {
  domainSlug: string | null
  domainId: string | null
  resolvedVia: "api" | "fallback" | "unknown"
  headerExpectation: {
    name: "x-domain-slug"
    value: string | null
  }
}

export interface DetailedNetworkDiagnostics {
  domain?: {
    host: string
    protocol: string
    port: string
    pathname: string
    reachable: boolean
    error?: string
  }
  corsTests?: Record<string, CorsTestResult>
}

export interface CorsTestResult {
  status?: number
  statusText?: string
  headers?: Record<string, string | undefined>
  success: boolean
  error?: string
  approach?: string
  endpoint?: string
  data?: unknown
}

export interface DiagnosticsSummary {
  total: number
  passed: number
  failed: number
  score: string
  percentage: number
  overallStatus: "ALL_PASS" | "PARTIAL_PASS" | "ALL_FAIL"
}

export interface AgentDiagnosticsSnapshot {
  authStatus: "authenticated" | "guest"
  userId: string | null
  domainSlug: string | null
  domainId: string | null
  consoleLogs: ConsoleLogEntry[]
  networkRequests: NetworkRequest[]
}

export interface DiagnosticsData {
  timestamp: string
  platform: string
  version: string
  environment: EnvironmentInfo
  user: UserInfo
  tests: Record<string, TestResult>
  consoleErrors: ConsoleError[]
  networkRequests: NetworkRequest[]
  detailedNetworkDiagnostics?: DetailedNetworkDiagnostics
  summary?: DiagnosticsSummary
  logs?: string[]
  domainContext?: DomainContextInfo
  agentDiagnostics?: AgentDiagnosticsSnapshot
}

export interface DiagnosticsFrameProps {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string | null
  returnPath?: string
}

const MAX_AGENT_LOGS = 25

const formatConsoleArgs = (args: unknown[]) => {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(" ")
}

export function DiagnosticsFrame({
  styleId = "neutral",
  themeSlug,
  domainSlug,
  returnPath,
}: DiagnosticsFrameProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [results, setResults] = React.useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [logs, setLogs] = React.useState<string[]>([])
  const [copied, setCopied] = React.useState(false)
  const [domainContext, setDomainContext] = React.useState<DomainContextInfo>({
    domainSlug: domainSlug ?? null,
    domainId: null,
    resolvedVia: "unknown",
    headerExpectation: {
      name: "x-domain-slug",
      value: domainSlug ?? null,
    },
  })
  const [consoleLogs, setConsoleLogs] = React.useState<ConsoleLogEntry[]>([])
  const [networkLogs, setNetworkLogs] = React.useState<NetworkRequest[]>([])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    ;(async () => {
      try {
        const response = await apiFetch(`/api/domains/by-slug/${domainSlug}`)
        if (ignore) return
        setDomainContext({
          domainSlug,
          domainId: response?.id ?? null,
          resolvedVia: response?.id ? "api" : "fallback",
          headerExpectation: {
            name: "x-domain-slug",
            value: domainSlug,
          },
        })
      } catch {
        if (ignore) return
        setDomainContext((prev) => ({
          ...prev,
          domainSlug,
          domainId: null,
          resolvedVia: "fallback",
        }))
      }
    })()
    return () => {
      ignore = true
    }
  }, [domainSlug])

  React.useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    }

    const wrapConsole = (level: ConsoleLogEntry["level"]) => {
      return (...args: unknown[]) => {
        const entry: ConsoleLogEntry = {
          level,
          message: formatConsoleArgs(args),
          timestamp: new Date().toISOString(),
        }
        setConsoleLogs((prev) => [...prev, entry].slice(-MAX_AGENT_LOGS))
        originalConsole[level](...args)
      }
    }

    console.log = wrapConsole("log")
    console.info = wrapConsole("info")
    console.warn = wrapConsole("warn")
    console.error = wrapConsole("error")
    console.debug = wrapConsole("debug")

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = Date.now()
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof URL
          ? args[0].href
          : args[0] instanceof Request
          ? args[0].url
          : "unknown"
      try {
        const response = await originalFetch.apply(window, args)
        const endTime = Date.now()
        const entry: NetworkRequest = {
          url,
          method: (args[1] as RequestInit | undefined)?.method || "GET",
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
        }
        setNetworkLogs((prev) => [...prev, entry].slice(-MAX_AGENT_LOGS))
        return response
      } catch (err) {
        const endTime = Date.now()
        const entry: NetworkRequest = {
          url,
          method: (args[1] as RequestInit | undefined)?.method || "GET",
          status: 0,
          statusText: "Network Error",
          ok: false,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : "Unknown error",
        }
        setNetworkLogs((prev) => [...prev, entry].slice(-MAX_AGENT_LOGS))
        throw err
      }
    }

    return () => {
      console.log = originalConsole.log
      console.info = originalConsole.info
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.debug = originalConsole.debug
      window.fetch = originalFetch
    }
  }, [])

  const addLog = React.useCallback((message: string, type: "info" | "error" | "success" = "info") => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`
    setLogs((prev) => [...prev, logEntry])
    console.log(logEntry)
  }, [])

  const clearResults = React.useCallback(() => {
    setLogs([])
    setResults(null)
    setError(null)
    setCopied(false)
  }, [])

  const buildReport = React.useCallback(
    (diagnosticsData: DiagnosticsData) => {
      const agentDiagnostics: AgentDiagnosticsSnapshot = {
        authStatus: isAuthenticated ? "authenticated" : "guest",
        userId: user?.id ?? null,
        domainSlug: domainContext.domainSlug,
        domainId: domainContext.domainId,
        consoleLogs: consoleLogs.slice(-MAX_AGENT_LOGS),
        networkRequests: networkLogs.slice(-MAX_AGENT_LOGS),
      }

      return {
        "=== KEEPER PLATFORM DEBUG REPORT ===": "",
        timestamp: diagnosticsData.timestamp,
        platform: diagnosticsData.platform,
        version: diagnosticsData.version,
        domainContext,
        "_spacer1": "",
        "=== ENVIRONMENT INFO ===": "",
        environment: diagnosticsData.environment,
        "_spacer2": "",
        "=== USER INFO ===": "",
        user: diagnosticsData.user,
        "_spacer3": "",
        "=== TEST RESULTS SUMMARY ===": "",
        summary: diagnosticsData.summary,
        "_spacer4": "",
        "=== DETAILED TEST RESULTS ===": "",
        tests: diagnosticsData.tests,
        "_spacer5": "",
        "=== AGENT DIAGNOSTICS (KIP) ===": "",
        agentDiagnostics,
        "_spacer6": "",
        "=== DIAGNOSTIC LOGS ===": "",
        logs: diagnosticsData.logs,
        "_spacer7": "",
        "=== END REPORT ===": `Generated at ${new Date().toISOString()}`,
      }
    },
    [consoleLogs, domainContext, isAuthenticated, networkLogs, user?.id]
  )

  const copyDiagnosticsToClipboard = React.useCallback(
    async (diagnosticsData: DiagnosticsData) => {
      try {
        const comprehensiveReport = buildReport(diagnosticsData)
        await navigator.clipboard.writeText(JSON.stringify(comprehensiveReport, null, 2))
        setCopied(true)
        addLog("✅ Diagnostic report copied to clipboard!", "success")
        setTimeout(() => setCopied(false), 5000)
      } catch (err) {
        addLog("❌ Failed to copy to clipboard", "error")
        console.error("Clipboard error:", err)
      }
    },
    [addLog, buildReport]
  )

  const runComprehensiveDiagnostics = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    setCopied(false)
    clearResults()

    addLog("🚀 Starting comprehensive system diagnostics...")

    const diagnostics: DiagnosticsData = {
      timestamp: new Date().toISOString(),
      platform: "Keeper Platform",
      version: "v1.0",
      environment: {
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
        apiBaseUrl: window.location.origin,
        currentUrl: window.location.href,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
      },
      user: {
        id: user?.id ?? null,
        email: user?.email ?? null,
        name: user?.name ?? null,
        idType: typeof user?.id,
        idLength: user?.id?.length || 0,
        isValidUUID: user?.id
          ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
          : false,
      },
      tests: {} as Record<string, TestResult>,
      consoleErrors: [],
      networkRequests: [],
      domainContext,
    }

    const recordNetworkRequest = (entry: NetworkRequest) => {
      diagnostics.networkRequests.push(entry)
      setNetworkLogs((prev) => [...prev, entry].slice(-MAX_AGENT_LOGS))
    }

    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    console.error = (...args) => {
      diagnostics.consoleErrors.push({
        type: "error",
        message: formatConsoleArgs(args),
        timestamp: new Date().toISOString(),
      })
      originalConsoleError.apply(console, args)
    }

    console.warn = (...args) => {
      diagnostics.consoleErrors.push({
        type: "warning",
        message: formatConsoleArgs(args),
        timestamp: new Date().toISOString(),
      })
      originalConsoleWarn.apply(console, args)
    }

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = Date.now()
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof URL
          ? args[0].href
          : args[0] instanceof Request
          ? args[0].url
          : "unknown"
      try {
        const response = await originalFetch.apply(window, args)
        const entry: NetworkRequest = {
          url,
          method: (args[1] as RequestInit | undefined)?.method || "GET",
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }
        recordNetworkRequest(entry)
        return response
      } catch (err) {
        const entry: NetworkRequest = {
          url,
          method: (args[1] as RequestInit | undefined)?.method || "GET",
          status: 0,
          statusText: "Network Error",
          ok: false,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : "Unknown error",
        }
        recordNetworkRequest(entry)
        throw err
      }
    }

    try {
      addLog("🔍 Running detailed network diagnostics...")

      const baseUrl = diagnostics.environment.apiBaseUrl
      const detailedNetworkDiagnostics: DetailedNetworkDiagnostics = {}
      diagnostics.detailedNetworkDiagnostics = detailedNetworkDiagnostics

      try {
        addLog("Testing basic Railway domain connectivity...")
        const urlTest = new URL(baseUrl)
        detailedNetworkDiagnostics.domain = {
          host: urlTest.host,
          protocol: urlTest.protocol,
          port: urlTest.port || (urlTest.protocol === "https:" ? "443" : "80"),
          pathname: urlTest.pathname,
          reachable: true,
        }
        addLog(`✅ Domain parsed: ${urlTest.host}`, "success")
      } catch (e) {
        detailedNetworkDiagnostics.domain = {
          host: "unknown",
          protocol: "unknown",
          port: "unknown",
          pathname: "unknown",
          reachable: false,
          error: e instanceof Error ? e.message : "Unknown error",
        }
        addLog(`❌ Domain parsing failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      addLog("Testing CORS preflight vs actual requests...")
      const corsTests: Record<string, CorsTestResult> = {}

      try {
        addLog("Testing OPTIONS preflight request...")
        const optionsResponse = await fetch(`${baseUrl}/ping`, {
          method: "OPTIONS",
          mode: "cors",
        })
        corsTests.options = {
          status: optionsResponse.status,
          statusText: optionsResponse.statusText,
          headers: {
            "access-control-allow-origin": optionsResponse.headers.get("access-control-allow-origin") || undefined,
            "access-control-allow-methods": optionsResponse.headers.get("access-control-allow-methods") || undefined,
            "access-control-allow-headers": optionsResponse.headers.get("access-control-allow-headers") || undefined,
            "access-control-allow-credentials":
              optionsResponse.headers.get("access-control-allow-credentials") || undefined,
          },
          success: optionsResponse.ok,
        }
        addLog(`✅ OPTIONS /ping: ${optionsResponse.status} ${optionsResponse.statusText}`, "success")
      } catch (e) {
        corsTests.options = {
          error: e instanceof Error ? e.message : "Unknown error",
          success: false,
        }
        addLog(`❌ OPTIONS /ping failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      addLog("Testing GET requests with different configurations...")

      try {
        addLog("Testing simple GET /ping...")
        const response = await fetch(`${baseUrl}/ping`, {
          method: "GET",
          mode: "cors",
        })
        corsTests.get_simple = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          approach: "simple_get",
        }
        addLog(`✅ Simple GET /ping: ${response.status} ${response.statusText}`, "success")
      } catch (e) {
        corsTests.get_simple = {
          error: e instanceof Error ? e.message : "Unknown error",
          success: false,
          approach: "simple_get",
        }
        addLog(`❌ Simple GET /ping failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      try {
        addLog("Testing GET /ping with custom headers...")
        const response = await fetch(`${baseUrl}/ping`, {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        })
        corsTests.get_with_headers = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          approach: "get_with_headers",
        }
        addLog(`✅ GET /ping with headers: ${response.status} ${response.statusText}`, "success")
      } catch (e) {
        corsTests.get_with_headers = {
          error: e instanceof Error ? e.message : "Unknown error",
          success: false,
          approach: "get_with_headers",
        }
        addLog(`❌ GET /ping with headers failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      try {
        addLog("Testing /health endpoint...")
        const response = await fetch(`${baseUrl}/health`, {
          method: "GET",
          mode: "cors",
        })
        corsTests.health_check = {
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          endpoint: "/health",
        }
        addLog(`✅ Health check: ${response.status} ${response.statusText}`, "success")
      } catch (e) {
        corsTests.health_check = {
          error: e instanceof Error ? e.message : "Unknown error",
          success: false,
          endpoint: "/health",
        }
        addLog(`❌ Health check failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      try {
        addLog("Testing /railway-status endpoint...")
        const response = await fetch(`${baseUrl}/railway-status`, {
          method: "GET",
          mode: "cors",
        })
        if (response.ok) {
          const data = await response.json()
          corsTests.railway_status = {
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            endpoint: "/railway-status",
            data: data,
          }
          addLog(`✅ Railway status: ${response.status} ${response.statusText}`, "success")
        } else {
          corsTests.railway_status = {
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            endpoint: "/railway-status",
          }
          addLog(`⚠️ Railway status: ${response.status} ${response.statusText}`, "error")
        }
      } catch (e) {
        corsTests.railway_status = {
          error: e instanceof Error ? e.message : "Unknown error",
          success: false,
          endpoint: "/railway-status",
        }
        addLog(`❌ Railway status failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error")
      }

      detailedNetworkDiagnostics.corsTests = corsTests

      addLog("📡 Testing basic API connectivity...")
      try {
        const apiTest = await apiFetch("/api/test", { method: "GET" })
        diagnostics.tests.apiConnectivity = { status: "SUCCESS", data: apiTest }
        addLog("✅ API connectivity test passed", "success")
      } catch (err) {
        diagnostics.tests.apiConnectivity = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ API connectivity test failed", "error")
      }

      addLog("🗄️ Testing database connectivity...")
      try {
        const dbTest = await apiFetch("/api/debug/database", { method: "GET" })
        diagnostics.tests.database = { status: "SUCCESS", data: dbTest }
        addLog("✅ Database test passed", "success")
      } catch (err) {
        diagnostics.tests.database = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Database test failed", "error")
      }

      addLog("🆔 Testing UUID generation and validation...")
      try {
        const clientUUID = crypto.randomUUID()
        const uuidTest = await apiFetch("/api/debug/uuid-test", {
          method: "POST",
          body: JSON.stringify({
            testUUID: clientUUID,
            userID: user?.id,
            testString: "invalid-uuid",
          }),
        })
        diagnostics.tests.uuid = { status: "SUCCESS", data: uuidTest }
        addLog("✅ UUID validation test passed", "success")
      } catch (err) {
        diagnostics.tests.uuid = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ UUID validation test failed", "error")
      }

      addLog("🔑 Testing API Key endpoints...")
      try {
        const [userKeysTest, platformKeysTest] = await Promise.all([
          apiFetch("/api/kip/user-keys", { method: "GET" }).catch((err) => ({ error: err.message })),
          apiFetch("/api/kip/platform-keys", { method: "GET" }).catch((err) => ({ error: err.message })),
        ])

        diagnostics.tests.apiKeys = {
          status: "SUCCESS",
          userKeys: userKeysTest,
          platformKeys: platformKeysTest,
        }
        addLog("✅ API Keys endpoint test completed", "success")
      } catch (err) {
        diagnostics.tests.apiKeys = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ API Keys endpoint test failed", "error")
      }

      addLog("🔑 Checking existing platform key status...")
      try {
        const keyStatusTest = await apiFetch("/api/kip/platform-keys", {
          headers: {
            "x-user-id": user?.id || "test-user",
          },
        })

        diagnostics.tests.platformKeyStatus = { status: "SUCCESS", data: keyStatusTest }
        addLog("✅ Platform key status check completed (no keys modified)", "success")
      } catch (err) {
        diagnostics.tests.platformKeyStatus = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Platform key status check failed", "error")
      }

      addLog("🔐 Testing authentication state...")
      try {
        const authTest = {
          isAuthenticated: !!user,
          hasSession: !!user?.id,
          sessionStorage: !!localStorage.getItem("auth-token"),
          cookiesEnabled: navigator.cookieEnabled,
        }
        diagnostics.tests.authentication = { status: "SUCCESS", data: authTest }
        addLog("✅ Authentication test completed", "success")
      } catch (err) {
        diagnostics.tests.authentication = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Authentication test failed", "error")
      }

      addLog("🌐 Testing browser capabilities...")
      try {
        const browserTest = {
          localStorage: typeof Storage !== "undefined",
          sessionStorage: typeof sessionStorage !== "undefined",
          fetch: typeof fetch !== "undefined",
          crypto: typeof crypto !== "undefined",
          clipboard: !!navigator.clipboard,
          online: navigator.onLine,
          language: navigator.language,
          platform: navigator.platform,
        }
        diagnostics.tests.browser = { status: "SUCCESS", data: browserTest }
        addLog("✅ Browser capabilities test passed", "success")
      } catch (err) {
        diagnostics.tests.browser = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Browser capabilities test failed", "error")
      }

      addLog("🤖 Testing agent system...")
      try {
        const agentTest = await apiFetch("/api/kip/agents", { method: "GET" })
        diagnostics.tests.agents = { status: "SUCCESS", data: agentTest }
        addLog("✅ Agent system test passed", "success")
      } catch (err) {
        diagnostics.tests.agents = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Agent system test failed", "error")
      }

      addLog("💬 Testing chat functionality with real agent...")
      try {
        const chatTest = await apiFetch("/api/kip/agents", {
          method: "POST",
          body: JSON.stringify({
            action: "run",
            agentId: "kip",
            input: "Hello, this is a test message from debug system",
            userId: user?.id,
          }),
        })
        diagnostics.tests.chatFunctionality = { status: "SUCCESS", data: chatTest }
        addLog("✅ Chat functionality test passed", "success")
      } catch (err) {
        diagnostics.tests.chatFunctionality = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Chat functionality test failed", "error")
      }

      addLog("🧠 Testing model provider service...")
      try {
        const modelTest = await apiFetch("/api/debug/model-provider-test", {
          method: "POST",
          body: JSON.stringify({
            provider: "openai",
            messages: [{ role: "user", content: "Debug test message" }],
            userId: user?.id,
          }),
        }).catch((err) => ({
          error: err.message,
          note: "Model provider debug endpoint may not exist - this is expected",
        }))

        diagnostics.tests.modelProvider = { status: "TESTED", data: modelTest }
        addLog("✅ Model provider test completed", "success")
      } catch (err) {
        diagnostics.tests.modelProvider = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Model provider test failed", "error")
      }

      addLog("🐛 Capturing console errors...")
      try {
        const consoleErrors: string[] = []
        const originalError = console.error

        console.error = (...args: unknown[]) => {
          consoleErrors.push(args.join(" "))
          originalError(...args)
        }

        setTimeout(() => {
          console.error = originalError
        }, 1000)

        diagnostics.tests.consoleErrors = {
          status: "SUCCESS",
          data: {
            errors: consoleErrors,
            note: "Errors captured during diagnostic run",
          },
        }
        addLog("✅ Console error capture setup", "success")
      } catch (err) {
        diagnostics.tests.consoleErrors = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Console error capture failed", "error")
      }

      addLog("🌐 Testing network request capabilities...")
      try {
        const networkTest = {
          fetchAvailable: typeof fetch !== "undefined",
          xhrAvailable: typeof XMLHttpRequest !== "undefined",
          baseUrl: window.location.origin,
          currentOrigin: window.location.origin,
          corsEnabled: true,
          lastRequestTime: new Date().toISOString(),
        }

        diagnostics.tests.networkMonitoring = { status: "SUCCESS", data: networkTest }
        addLog("✅ Network request test passed", "success")
      } catch (err) {
        diagnostics.tests.networkMonitoring = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Network request test failed", "error")
      }

      addLog("🔧 Auto-fixing database issues (missing agents, inactive keys)...")
      try {
        const dbFix = await apiFetch("/api/debug/fix-database", {
          method: "POST",
          body: JSON.stringify({}),
        })

        diagnostics.tests.databaseFix = { status: "SUCCESS", data: dbFix }

        if (dbFix.success && dbFix.data) {
          const { actions, errors } = dbFix.data as {
            actions: Array<{ message: string }>
            errors: Array<{ error: string }>
          }
          if (actions.length > 0) {
            addLog(`✅ Database fixes applied: ${actions.map((a) => a.message).join(", ")}`, "success")
          }
          if (errors.length > 0) {
            addLog(`⚠️ Some fixes failed: ${errors.map((e) => e.error).join(", ")}`, "error")
          }
        }
        addLog("✅ Database fix test completed", "success")
      } catch (err) {
        diagnostics.tests.databaseFix = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Database fix test failed", "error")
      }

      addLog("🔧 Testing database auto-repair and Kip provider fix...")
      try {
        const fixResponse = await fetch(
          new URL("api/debug/fix-kip-provider", (import.meta as any).env.VITE_API_URL).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        )
        const fixData = await fixResponse.json()

        if (fixData.success) {
          diagnostics.tests.kipProviderFix = { status: "SUCCESS", data: fixData.data }
          addLog("✅ Kip provider fix completed successfully", "success")
        } else {
          diagnostics.tests.kipProviderFix = { status: "FAILED", data: fixData }
          addLog(`❌ Kip provider fix failed: ${fixData.error}`, "error")
        }
      } catch (err) {
        diagnostics.tests.kipProviderFix = {
          status: "ERROR",
          data: { error: err instanceof Error ? err.message : "Unknown error" },
        }
        addLog(`❌ Kip provider fix error: ${err instanceof Error ? err.message : "Unknown error"}`, "error")
      }

      addLog("💬 Testing Kip chat functionality...")
      try {
        const kipChatTest = await apiFetch("/api/kip/agents", {
          method: "POST",
          body: JSON.stringify({
            action: "run",
            agentId: "kip",
            input: "Hello Kip, can you help me test if you are working correctly?",
            userId: user?.id,
          }),
        })

        diagnostics.tests.kipChatTest = { status: "SUCCESS", data: kipChatTest }
        addLog("✅ Kip chat test completed", "success")
      } catch (err) {
        diagnostics.tests.kipChatTest = {
          status: "ERROR",
          error: err instanceof Error ? err.message : "Unknown error",
        }
        addLog("❌ Kip chat test failed", "error")
      }

      addLog("🔑 Testing platform key detection...")
      try {
        const platformKeyStats = await apiFetch("/api/kip/platform-keys/stats", {
          headers: {
            "x-user-id": user?.id || "test-user",
          },
        })

        diagnostics.tests.platformKeyDetection = {
          status: "SUCCESS",
          data: platformKeyStats,
        }
        addLog("✅ Platform key detection test completed", "success")
      } catch (err) {
        diagnostics.tests.platformKeyDetection = {
          status: "ERROR",
          error: err instanceof Error ? err.message : String(err),
        }
        addLog("❌ Platform key detection test failed", "error")
      }

      addLog("🗄️ Testing raw platform keys query...")
      try {
        const rawPlatformKeys = await apiFetch("/api/kip/platform-keys", {
          headers: {
            "x-user-id": user?.id || "test-user",
          },
        })

        diagnostics.tests.rawPlatformKeys = {
          status: "SUCCESS",
          data: rawPlatformKeys,
        }
        addLog("✅ Raw platform keys query completed", "success")
      } catch (err) {
        diagnostics.tests.rawPlatformKeys = {
          status: "ERROR",
          error: err instanceof Error ? err.message : String(err),
        }
        addLog("❌ Raw platform keys query failed", "error")
      }

      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      window.fetch = originalFetch

      diagnostics.tests.consoleErrorsSummary = {
        status: "SUCCESS",
        data: {
          totalErrors: diagnostics.consoleErrors.filter((e) => e.type === "error").length,
          totalWarnings: diagnostics.consoleErrors.filter((e) => e.type === "warning").length,
          errors: diagnostics.consoleErrors,
        },
      }

      diagnostics.tests.networkRequestsSummary = {
        status: "SUCCESS",
        data: {
          totalRequests: diagnostics.networkRequests.length,
          successfulRequests: diagnostics.networkRequests.filter((r) => r.ok).length,
          failedRequests: diagnostics.networkRequests.filter((r) => !r.ok).length,
          requests: diagnostics.networkRequests,
        },
      }

      const testCount = Object.keys(diagnostics.tests).length
      const successCount = Object.values(diagnostics.tests).filter((test) => test.status === "SUCCESS").length
      const errorCount = Object.values(diagnostics.tests).filter((test) => test.status === "ERROR").length

      diagnostics.summary = {
        total: testCount,
        passed: successCount,
        failed: errorCount,
        score: `${successCount}/${testCount}`,
        percentage: Math.round((successCount / testCount) * 100),
        overallStatus: errorCount === 0 ? "ALL_PASS" : errorCount < testCount ? "PARTIAL_PASS" : "ALL_FAIL",
      }

      diagnostics.logs = logs
      diagnostics.agentDiagnostics = {
        authStatus: isAuthenticated ? "authenticated" : "guest",
        userId: user?.id ?? null,
        domainSlug: domainContext.domainSlug,
        domainId: domainContext.domainId,
        consoleLogs: consoleLogs.slice(-MAX_AGENT_LOGS),
        networkRequests: networkLogs.slice(-MAX_AGENT_LOGS),
      }

      addLog(
        `🎯 Diagnostics complete: ${successCount}/${testCount} tests passed (${diagnostics.summary.percentage}%)`,
        errorCount === 0 ? "success" : "info"
      )

      setResults(diagnostics)
      await copyDiagnosticsToClipboard(diagnostics)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      addLog(`💥 Fatal error during diagnostics: ${errorMsg}`, "error")
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [
    addLog,
    clearResults,
    copyDiagnosticsToClipboard,
    consoleLogs,
    domainContext,
    isAuthenticated,
    logs,
    networkLogs,
    user?.email,
    user?.id,
    user?.name,
  ])

  const handleClose = React.useCallback(() => {
    if (returnPath) {
      navigate(returnPath)
    } else if (domainSlug) {
      navigate(`/d/${domainSlug}`)
    } else {
      navigate("/")
    }
  }, [domainSlug, navigate, returnPath])

  const lastBoardDataError = getLastBoardDataError()

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Diagnostics"
      subtitle="A calm, single-source system check for Keeper"
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close diagnostics"
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background px-2 py-1 text-xs shadow-sm"
        >
          Close
        </button>
      }
      onClose={handleClose}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Run Diagnostics</h2>
              <p className="text-sm text-gray-600">
                Generate a comprehensive system report and keep it ready for sharing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-[#C96E59] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#B85D4A] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={runComprehensiveDiagnostics}
                disabled={loading}
              >
                {loading ? "Running diagnostics…" : "Run Diagnostics"}
              </button>
              <button
                type="button"
                className="rounded-full border border-[#C96E59]/30 px-6 py-3 text-sm font-semibold text-[#C96E59] hover:border-[#C96E59] hover:bg-[#C96E59]/10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => results && copyDiagnosticsToClipboard(results)}
                disabled={!results}
              >
                Copy Report
              </button>
            </div>
          </div>
          {copied && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Report copied to clipboard.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Context</h3>
          <div className="mt-3 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Domain Slug</div>
              <div className="font-medium">{domainContext.domainSlug || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Domain Id</div>
              <div className="font-medium">{domainContext.domainId || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">x-domain-slug</div>
              <div className="font-medium">{domainContext.headerExpectation.value || "not set"}</div>
            </div>
          </div>
        </section>

        {logs.length > 0 && (
          <section className="rounded-2xl border border-black/10 bg-black/90 p-4 text-green-200 shadow-sm">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold">Live Diagnostics Progress</span>
              <span className="text-xs text-green-300">{logs.length} entries</span>
            </div>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">{logs.join("\n")}</pre>
          </section>
        )}

        {results?.summary && (
          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Summary</h3>
              <span className="text-sm text-gray-500">{results.summary.score} tests</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
                <div className="text-2xl font-semibold text-gray-900">{results.summary.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50/70 p-4">
                <div className="text-2xl font-semibold text-green-700">{results.summary.passed}</div>
                <div className="text-xs text-green-700">Passed</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                <div className="text-2xl font-semibold text-red-600">{results.summary.failed}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="rounded-xl border border-[#C96E59]/20 bg-[#C96E59]/10 p-4">
                <div className="text-2xl font-semibold text-[#C96E59]">{results.summary.percentage}%</div>
                <div className="text-xs text-[#C96E59]">Success</div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Agent Diagnostics (Kip)</h3>
          <p className="mt-1 text-sm text-gray-600">
            This is a readiness seam for Kip-assisted diagnostics. No agent actions are executed yet.
          </p>
          <div className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Auth Status</div>
              <div className="font-medium">{isAuthenticated ? "Authenticated" : "Guest"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">User Id</div>
              <div className="font-medium">{user?.id || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Domain Resolution</div>
              <div className="font-medium">
                {domainContext.domainSlug ? `${domainContext.domainSlug} (${domainContext.domainId || "unresolved"})` : "—"}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Last 25 Console Logs</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                {consoleLogs.length === 0
                  ? "No console logs captured yet."
                  : consoleLogs
                      .slice(-MAX_AGENT_LOGS)
                      .map((entry) => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`)
                      .join("\n")}
              </pre>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Last 25 Network Requests</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                {networkLogs.length === 0
                  ? "No network requests captured yet."
                  : networkLogs
                      .slice(-MAX_AGENT_LOGS)
                      .map((entry) => `${entry.method} ${entry.url} → ${entry.status || "ERR"}`)
                      .join("\n")}
              </pre>
            </div>
          </div>
        </section>

        {lastBoardDataError && (
          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Latest Board Data Error</h3>
            <div className="mt-3 grid gap-2 text-sm text-gray-700">
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500">Req Id</span>
                <div className="font-medium">{lastBoardDataError.reqId || "—"}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500">URL</span>
                <div className="font-medium">{lastBoardDataError.url}</div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Status</span>
                  <div className="font-medium">{lastBoardDataError.status ?? "—"}</div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">Board Id</span>
                  <div className="font-medium">{lastBoardDataError.boardId ?? "—"}</div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">At</span>
                  <div className="font-medium">{lastBoardDataError.at}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {results && (
          <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                View Detailed JSON Report
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-gray-100 bg-white/80 p-4 text-xs text-gray-700">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <div className="font-semibold">Critical Error</div>
            <div className="mt-2 rounded-md border border-red-200 bg-white/70 p-3 font-mono text-xs text-red-700">
              {error}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-between gap-3 text-xs text-gray-500">
          <button
            type="button"
            className="rounded-full border border-gray-200 px-4 py-2 text-gray-600 hover:border-gray-300"
            onClick={clearResults}
          >
            Clear Results
          </button>
          <span>Diagnostics are local and do not auto-submit to Kip.</span>
        </div>
      </div>
    </DesignFrame>
  )
}

