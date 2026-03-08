"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { API_BASE, apiFetch } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"
import { getLastBoardDataError } from "../../lib/debug"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import type { DiagnosticsFrameJson } from "../data/domain-frame.types"
import { defaultDiagnosticsFrame } from "../data/domain-frame.default"

export interface EnvironmentInfo {
  mode: string
  isDev: boolean
  isProd: boolean
  apiBaseUrl: string
  webBaseUrl: string
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

export interface DiagnosticsRequestDetails {
  url: string
  method: string
  status: number
  duration: number
  requestId: string | null
  ok: boolean
  responseJson?: unknown
  responseText?: string
}

export interface PipelineStepResult {
  label: string
  status: "SUCCESS" | "FAILED"
  request?: DiagnosticsRequestDetails
  error?: string
}

export interface MomentPipelineReport {
  steps: PipelineStepResult[]
  anonKeyUsed?: string
  claimTokenExpiresAt?: string | null
}

export interface KeptMomentsFeedReport {
  count: number
  sample: Array<{ id: string; keptAt: string | null; createdAt?: string }>
  response?: unknown
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

export interface DomainHomeBoardFrameSummary {
  id: string | null
  name: string | null
  role: string | null
  pattern: string | null
  frameType: string | null
  orderIndex: number | null
}

export interface DomainHomeBoardCallResult {
  status: number
  ok: boolean
  boardId: string | null
  boardType: string | null
  domainId: string | null
  frames: DomainHomeBoardFrameSummary[]
  frameCount: number
  error?: string
}

export interface DomainHomeBoardCheck {
  slug: string | null
  endpoint: string | null
  first: DomainHomeBoardCallResult | null
  second: DomainHomeBoardCallResult | null
  stable: boolean | null
  error?: string
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
  domainHomeBoardCheck?: DomainHomeBoardCheck
  agentDiagnostics?: AgentDiagnosticsSnapshot
}

export interface DiagnosticsFrameProps {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string | null
  returnPath?: string
  diagnosticsLabels?: DiagnosticsFrameJson
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
  diagnosticsLabels = defaultDiagnosticsFrame,
}: DiagnosticsFrameProps) {
  const navigate = useNavigate()
  const v0Shell = useV0ShellOptional()
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
  const resolvedApiBaseUrl = React.useMemo(() => {
    const rawBase = API_BASE || (import.meta as any)?.env?.VITE_API_URL || "https://api.ke3p.com"
    return rawBase.replace(/\/$/, "")
  }, [])
  const webBaseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const formatResponsePreview = React.useCallback((responseJson?: unknown, responseText?: string) => {
    if (responseJson != null) {
      return JSON.stringify(responseJson, null, 2)
    }
    if (responseText) {
      return responseText
    }
    return ""
  }, [])

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
        "=== DOMAIN HOME BOARD (CANONICAL) ===": "",
        domainHomeBoardCheck: diagnosticsData.domainHomeBoardCheck ?? null,
        "_spacer6": "",
        "=== AGENT DIAGNOSTICS (KIP) ===": "",
        agentDiagnostics,
        "_spacer7": "",
        "=== DIAGNOSTIC LOGS ===": "",
        logs: diagnosticsData.logs,
        "_spacer8": "",
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
        apiBaseUrl: resolvedApiBaseUrl,
        webBaseUrl,
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

      const runDiagnosticsRequest = async (options: {
        label: string
        url: string
        method: string
        headers?: Record<string, string>
        body?: string
        credentials?: RequestCredentials
      }) => {
        const startTime = Date.now()
        try {
          const response = await fetch(options.url, {
            method: options.method,
            headers: options.headers,
            body: options.body,
            credentials: options.credentials ?? "include",
          })
          const duration = Date.now() - startTime
          const requestId = response.headers.get("x-request-id")
          let responseJson: unknown
          let responseText: string | undefined
          try {
            responseJson = await response.clone().json()
          } catch {
            try {
              responseText = await response.text()
            } catch {
              responseText = undefined
            }
          }

          const details: DiagnosticsRequestDetails = {
            url: options.url,
            method: options.method,
            status: response.status,
            duration,
            requestId,
            ok: response.ok,
            responseJson,
            responseText,
          }

          return { ok: response.ok, details }
        } catch (err) {
          const duration = Date.now() - startTime
          const message = err instanceof Error ? err.message : String(err)
          const details: DiagnosticsRequestDetails = {
            url: options.url,
            method: options.method,
            status: 0,
            duration,
            requestId: null,
            ok: false,
            responseText: message,
          }
          return { ok: false, details, error: message }
        }
      }

      const toFrameSummary = (frames: unknown) => {
        if (!Array.isArray(frames)) return []
        return frames.map((frame) => ({
          id: typeof frame?.id === "string" ? frame.id : null,
          name: typeof frame?.name === "string" ? frame.name : null,
          role: typeof frame?.role === "string" ? frame.role : null,
          pattern: typeof frame?.pattern === "string" ? frame.pattern : null,
          frameType: typeof frame?.frameType === "string" ? frame.frameType : null,
          orderIndex: typeof frame?.orderIndex === "number" ? frame.orderIndex : null,
        }))
      }

      const runDomainHomeBoardRequest = async (slug: string, endpoint: string): Promise<DomainHomeBoardCallResult> => {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          })
          let responseJson: any
          let responseText: string | undefined
          try {
            responseJson = await response.clone().json()
          } catch {
            try {
              responseText = await response.text()
            } catch {
              responseText = undefined
            }
          }
          const board = responseJson?.data ?? null
          const frames = toFrameSummary(board?.frames)
          const errorMessage =
            response.ok
              ? undefined
              : responseJson?.error || responseJson?.message || responseText || response.statusText || "Request failed"

          return {
            status: response.status,
            ok: response.ok,
            boardId: typeof board?.id === "string" ? board.id : null,
            boardType: typeof board?.boardType === "string" ? board.boardType : null,
            domainId: typeof board?.domainId === "string" ? board.domainId : null,
            frames,
            frameCount: frames.length,
            error: errorMessage,
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          return {
            status: 0,
            ok: false,
            boardId: null,
            boardType: null,
            domainId: null,
            frames: [],
            frameCount: 0,
            error: errorMessage || "Request failed",
          }
        }
      }

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

      const domainHomeBoardCheck: DomainHomeBoardCheck = {
        slug: domainContext.domainSlug ?? domainSlug ?? null,
        endpoint: null,
        first: null,
        second: null,
        stable: null,
      }

      const homeBoardSlug = domainHomeBoardCheck.slug
      if (!homeBoardSlug) {
        domainHomeBoardCheck.error = "Missing domain slug for domain home board diagnostics."
        diagnostics.tests.domainHomeBoard = {
          status: "ERROR",
          error: domainHomeBoardCheck.error,
        }
      } else {
        const endpoint = `${baseUrl}/api/domains/by-slug/${homeBoardSlug}/home-board`
        domainHomeBoardCheck.endpoint = endpoint
        addLog("🏠 Checking canonical domain home board...")
        const first = await runDomainHomeBoardRequest(homeBoardSlug, endpoint)
        const second = await runDomainHomeBoardRequest(homeBoardSlug, endpoint)
        const stable = !!(first.boardId && second.boardId && first.boardId === second.boardId)
        domainHomeBoardCheck.first = first
        domainHomeBoardCheck.second = second
        domainHomeBoardCheck.stable = stable

        const authBlocked = [401, 403].includes(first.status) || [401, 403].includes(second.status)
        if (authBlocked) {
          diagnostics.tests.domainHomeBoard = {
            status: "ERROR",
            error: "Not signed in",
            data: domainHomeBoardCheck,
          }
        } else if (first.ok && second.ok && first.boardType === "domain-home" && stable) {
          diagnostics.tests.domainHomeBoard = {
            status: "SUCCESS",
            data: domainHomeBoardCheck,
          }
        } else {
          diagnostics.tests.domainHomeBoard = {
            status: "FAILED",
            data: domainHomeBoardCheck,
            error: first.error || second.error || "Domain home board check failed",
          }
        }
      }

      diagnostics.domainHomeBoardCheck = domainHomeBoardCheck

      addLog("🧭 Running Moment Pipeline diagnostics...")
      const momentPipelineSteps: PipelineStepResult[] = []
      const domainSlugValue = domainContext.domainSlug
      const describeFailure = (details: DiagnosticsRequestDetails, fallback: string) => {
        if (details.responseJson != null) return JSON.stringify(details.responseJson)
        if (details.responseText) return details.responseText
        if (details.status) return `HTTP ${details.status}`
        return fallback
      }
      const extractData = (payload: unknown) => {
        if (payload && typeof payload === "object" && "data" in payload) {
          return (payload as { data?: unknown }).data
        }
        return payload
      }
      const extractStringField = (payload: unknown, field: string) => {
        if (!payload || typeof payload !== "object" || !(field in payload)) return null
        const value = (payload as Record<string, unknown>)[field]
        return typeof value === "string" ? value : null
      }

      if (!domainSlugValue) {
        const errorMessage = "Missing domain slug for domain-scoped moment diagnostics."
        diagnostics.tests.momentPipeline = {
          status: "FAILED",
          error: errorMessage,
          data: { steps: momentPipelineSteps },
        }
        addLog(`❌ Moment pipeline skipped: ${errorMessage}`, "error")
      } else {
        const timestampLabel = new Date().toISOString()

        const authCreate = await runDiagnosticsRequest({
          label: "A1 Create Draft (Authenticated)",
          url: `${baseUrl}/api/v0/moments/drafts`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-domain-slug": domainSlugValue,
          },
          body: JSON.stringify({
            themeSlug: "neutral",
            title: "Diagnostics draft",
            body: "",
          }),
        })
        const authCreateData = extractData(authCreate.details.responseJson)
        const authDraftId = extractStringField(authCreateData, "id")
        const authCreateStatus = authCreate.ok && authDraftId ? "SUCCESS" : "FAILED"
        momentPipelineSteps.push({
          label: "A1 Create Draft (Authenticated)",
          status: authCreateStatus,
          request: authCreate.details,
          error:
            authCreateStatus === "FAILED"
              ? authCreate.ok
                ? "Draft id missing from response."
                : describeFailure(authCreate.details, "Failed to create draft.")
              : undefined,
        })
        if (authCreateStatus === "FAILED") {
          addLog("❌ Authenticated draft creation failed", "error")
        } else {
          addLog(`✅ Authenticated draft created (${authDraftId})`, "success")
        }

        let authUpdatedAt: string | null = null
        if (authCreateStatus === "SUCCESS" && authDraftId) {
          const authUpdate = await runDiagnosticsRequest({
            label: "A2 Update Draft (Authenticated)",
            url: `${baseUrl}/api/v0/moments/drafts/${authDraftId}`,
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-domain-slug": domainSlugValue,
            },
            body: JSON.stringify({
              body: `diagnostics test ${timestampLabel}`,
            }),
          })
          const authUpdateData = extractData(authUpdate.details.responseJson)
          authUpdatedAt = extractStringField(authUpdateData, "updatedAt")
          const authUpdateStatus = authUpdate.ok && authUpdatedAt ? "SUCCESS" : "FAILED"
          momentPipelineSteps.push({
            label: "A2 Update Draft (Authenticated)",
            status: authUpdateStatus,
            request: authUpdate.details,
            error:
              authUpdateStatus === "FAILED"
                ? authUpdate.ok
                  ? "updatedAt missing from response."
                  : describeFailure(authUpdate.details, "Failed to update draft.")
                : undefined,
          })
          if (authUpdateStatus === "FAILED") {
            addLog("❌ Authenticated draft update failed", "error")
          } else {
            addLog("✅ Authenticated draft updated", "success")
          }
        } else {
          momentPipelineSteps.push({
            label: "A2 Update Draft (Authenticated)",
            status: "FAILED",
            error: "Skipped because draft creation failed.",
          })
        }

        let authKeptAt: string | null = null
        if (authCreateStatus === "SUCCESS" && authDraftId) {
          const authKeep = await runDiagnosticsRequest({
            label: "A3 Keep Draft (Authenticated)",
            url: `${baseUrl}/api/v0/moments/${authDraftId}/keep`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-domain-slug": domainSlugValue,
            },
          })
          const authKeepData = extractData(authKeep.details.responseJson)
          authKeptAt = extractStringField(authKeepData, "keptAt")
          const authKeepStatus = authKeep.ok && authKeptAt ? "SUCCESS" : "FAILED"
          momentPipelineSteps.push({
            label: "A3 Keep Draft (Authenticated)",
            status: authKeepStatus,
            request: authKeep.details,
            error:
              authKeepStatus === "FAILED"
                ? authKeep.ok
                  ? "keptAt missing from response."
                  : describeFailure(authKeep.details, "Failed to keep draft.")
                : undefined,
          })
          if (authKeepStatus === "FAILED") {
            addLog("❌ Authenticated keep failed", "error")
          } else {
            addLog("✅ Authenticated draft kept", "success")
          }
        } else {
          momentPipelineSteps.push({
            label: "A3 Keep Draft (Authenticated)",
            status: "FAILED",
            error: "Skipped because draft creation failed.",
          })
        }

        const anonKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
        const anonCreate = await runDiagnosticsRequest({
          label: "B1 Create Draft (Anonymous)",
          url: `${baseUrl}/api/v0/moments/drafts`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-domain-slug": domainSlugValue,
            "x-anon-key": anonKey,
          },
          body: JSON.stringify({
            themeSlug: "neutral",
            title: "Diagnostics anonymous draft",
            body: "",
          }),
          credentials: "omit",
        })
        const anonCreateData = extractData(anonCreate.details.responseJson)
        const anonDraftId = extractStringField(anonCreateData, "id")
        const anonCreateStatus = anonCreate.ok && anonDraftId ? "SUCCESS" : "FAILED"
        momentPipelineSteps.push({
          label: "B1 Create Draft (Anonymous)",
          status: anonCreateStatus,
          request: anonCreate.details,
          error:
            anonCreateStatus === "FAILED"
              ? anonCreate.ok
                ? "Draft id missing from response."
                : describeFailure(anonCreate.details, "Failed to create anonymous draft.")
              : undefined,
        })
        if (anonCreateStatus === "FAILED") {
          addLog("❌ Anonymous draft creation failed", "error")
        } else {
          addLog(`✅ Anonymous draft created (${anonDraftId})`, "success")
        }

        let claimToken: string | null = null
        let claimExpiresAt: string | null = null
        if (anonCreateStatus === "SUCCESS" && anonDraftId) {
          const anonKeep = await runDiagnosticsRequest({
            label: "B2 Keep Draft (Anonymous)",
            url: `${baseUrl}/api/v0/moments/${anonDraftId}/keep`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-domain-slug": domainSlugValue,
              "x-anon-key": anonKey,
            },
            credentials: "omit",
          })
          const anonKeepPayload = anonKeep.details.responseJson as Record<string, unknown> | undefined
          const claimFromResponse = anonKeepPayload?.claim as Record<string, unknown> | undefined
          claimToken =
            (claimFromResponse && typeof claimFromResponse.token === "string" ? claimFromResponse.token : null) ||
            (typeof anonKeepPayload?.claimToken === "string" ? (anonKeepPayload.claimToken as string) : null)
          claimExpiresAt =
            (claimFromResponse && typeof claimFromResponse.expiresAt === "string" ? claimFromResponse.expiresAt : null) ||
            (typeof anonKeepPayload?.claimTokenExpiresAt === "string"
              ? (anonKeepPayload.claimTokenExpiresAt as string)
              : null)
          const anonKeepStatus = anonKeep.ok && claimToken ? "SUCCESS" : "FAILED"
          momentPipelineSteps.push({
            label: "B2 Keep Draft (Anonymous)",
            status: anonKeepStatus,
            request: anonKeep.details,
            error:
              anonKeepStatus === "FAILED"
                ? anonKeep.ok
                  ? "claimToken missing from response."
                  : describeFailure(anonKeep.details, "Failed to keep anonymous draft.")
                : undefined,
          })
          if (anonKeepStatus === "FAILED") {
            addLog("❌ Anonymous keep failed", "error")
          } else {
            addLog("✅ Anonymous draft kept with claim token", "success")
          }
        } else {
          momentPipelineSteps.push({
            label: "B2 Keep Draft (Anonymous)",
            status: "FAILED",
            error: "Skipped because anonymous draft creation failed.",
          })
        }

        if (claimToken) {
          const claimResult = await runDiagnosticsRequest({
            label: "C1 Claim Anonymous Draft",
            url: `${baseUrl}/api/v0/moments/claim`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-domain-slug": domainSlugValue,
            },
            body: JSON.stringify({ token: claimToken }),
          })
          const claimData = extractData(claimResult.details.responseJson)
          const ownerId = extractStringField(claimData, "ownerId")
          const claimStatus = claimResult.ok && ownerId ? "SUCCESS" : "FAILED"
          momentPipelineSteps.push({
            label: "C1 Claim Anonymous Draft",
            status: claimStatus,
            request: claimResult.details,
            error:
              claimStatus === "FAILED"
                ? claimResult.ok
                  ? "ownerId missing from response."
                  : describeFailure(claimResult.details, "Failed to claim anonymous draft.")
                : undefined,
          })
          if (claimStatus === "FAILED") {
            addLog("❌ Claim draft failed", "error")
          } else {
            addLog("✅ Anonymous draft claimed", "success")
          }
        } else {
          momentPipelineSteps.push({
            label: "C1 Claim Anonymous Draft",
            status: "FAILED",
            error: "Skipped because claim token was missing.",
          })
        }

        const pipelineFailed = momentPipelineSteps.some((step) => step.status === "FAILED")
        diagnostics.tests.momentPipeline = {
          status: pipelineFailed ? "FAILED" : "SUCCESS",
          data: {
            steps: momentPipelineSteps,
            claimTokenExpiresAt: claimExpiresAt,
            anonKeyUsed: anonKey,
          },
        }
      }

      addLog("📰 Testing kept moments feed...")
      if (!domainSlugValue) {
        const errorMessage = "Missing domain slug for kept moments feed test."
        diagnostics.tests.keptMomentsFeed = {
          status: "FAILED",
          error: errorMessage,
        }
        addLog(`❌ Kept moments feed skipped: ${errorMessage}`, "error")
      } else {
        const feedUrl = new URL(`${baseUrl}/api/v0/moments`)
        feedUrl.searchParams.set("status", "kept")
        feedUrl.searchParams.set("limit", "10")
        feedUrl.searchParams.set("domainSlug", domainSlugValue)
        const feedResult = await runDiagnosticsRequest({
          label: "Kept Moments Feed",
          url: feedUrl.toString(),
          method: "GET",
          headers: {
            "x-domain-slug": domainSlugValue,
          },
        })
        const feedData = extractData(feedResult.details.responseJson)
        const feedList = Array.isArray(feedData) ? feedData : []
        const sample = feedList.slice(0, 3).map((item) => ({
          id: typeof item?.id === "string" ? item.id : "unknown",
          keptAt: typeof item?.keptAt === "string" ? item.keptAt : null,
          createdAt: typeof item?.createdAt === "string" ? item.createdAt : undefined,
        }))
        const feedStatus = feedResult.ok && Array.isArray(feedData) ? "SUCCESS" : "FAILED"
        diagnostics.tests.keptMomentsFeed = {
          status: feedStatus,
          data: {
            count: feedList.length,
            sample,
            response: feedResult.details.responseJson,
          } satisfies KeptMomentsFeedReport,
          error:
            feedStatus === "FAILED"
              ? feedResult.ok
                ? "Feed response was not an array."
                : describeFailure(feedResult.details, "Failed to fetch kept moments feed.")
              : undefined,
        }
        if (feedStatus === "FAILED") {
          addLog("❌ Kept moments feed check failed", "error")
        } else {
          addLog(`✅ Kept moments feed returned ${feedList.length} items`, "success")
        }
      }

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
          baseUrl: baseUrl,
          currentOrigin: webBaseUrl,
          apiBaseUrl: baseUrl,
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
          new URL("api/debug/fix-kip-provider", `${baseUrl}/`).toString(),
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
    if (v0Shell) {
      v0Shell.closeToBoard()
      return
    }
    if (returnPath) {
      navigate(returnPath)
      return
    }
    if (domainSlug) {
      navigate(`/d/${domainSlug}/board`)
      return
    }
    navigate("/")
  }, [domainSlug, navigate, returnPath, v0Shell])

  const lastBoardDataError = getLastBoardDataError()
  const momentPipelineData = results?.tests?.momentPipeline?.data as MomentPipelineReport | undefined
  const momentPipelineStatus = results?.tests?.momentPipeline?.status
  const keptMomentsFeedData = results?.tests?.keptMomentsFeed?.data as KeptMomentsFeedReport | undefined
  const domainHomeBoardCheck = results?.domainHomeBoardCheck
  const homeBoardFirst = domainHomeBoardCheck?.first
  const homeBoardSecond = domainHomeBoardCheck?.second
  const homeBoardFrames = homeBoardFirst?.frames ?? []
  const homeBoardAuthBlocked =
    [homeBoardFirst?.status, homeBoardSecond?.status].some((status) => status === 401 || status === 403) || false

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={diagnosticsLabels.labels.frameTitle}
      subtitle={diagnosticsLabels.labels.frameSubtitle}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label={diagnosticsLabels.labels.closeAriaLabel}
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background px-2 py-1 text-xs shadow-sm"
        >
          {diagnosticsLabels.labels.closeButton}
        </button>
      }
      onClose={handleClose}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{diagnosticsLabels.run_diagnostics.labels.heading}</h2>
              <p className="text-sm text-gray-600">
                {diagnosticsLabels.run_diagnostics.messaging.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-[#C96E59] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#B85D4A] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={runComprehensiveDiagnostics}
                disabled={loading}
              >
                {loading ? diagnosticsLabels.run_diagnostics.labels.runningButton : diagnosticsLabels.run_diagnostics.labels.runButton}
              </button>
              <button
                type="button"
                className="rounded-full border border-[#C96E59]/30 px-6 py-3 text-sm font-semibold text-[#C96E59] hover:border-[#C96E59] hover:bg-[#C96E59]/10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => results && copyDiagnosticsToClipboard(results)}
                disabled={!results}
              >
                {diagnosticsLabels.run_diagnostics.labels.copyButton}
              </button>
            </div>
          </div>
          {copied && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {diagnosticsLabels.run_diagnostics.messaging.copySuccess}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{diagnosticsLabels.context.labels.heading}</h3>
          <div className="mt-3 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.context.labels.domainSlug}</div>
              <div className="font-medium">{domainContext.domainSlug || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.context.labels.domainId}</div>
              <div className="font-medium">{domainContext.domainId || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.context.labels.xDomainSlug}</div>
              <div className="font-medium">{domainContext.headerExpectation.value || diagnosticsLabels.context.labels.notSet}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{diagnosticsLabels.domain_home_board.labels.heading}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {diagnosticsLabels.domain_home_board.messaging.description}
          </p>
          <div className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.domainSlug}</div>
              <div className="font-medium">{domainHomeBoardCheck?.slug || domainContext.domainSlug || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.endpoint}</div>
              <div className="font-medium">{domainHomeBoardCheck?.endpoint || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.stability}</div>
              <div className="font-medium">
                {domainHomeBoardCheck?.stable == null
                  ? "—"
                  : domainHomeBoardCheck.stable
                  ? diagnosticsLabels.domain_home_board.labels.stabilityPass
                  : diagnosticsLabels.domain_home_board.labels.stabilityFail}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.httpStatus1}</div>
              <div className="font-medium">{homeBoardFirst?.status ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.httpStatus2}</div>
              <div className="font-medium">{homeBoardSecond?.status ?? "—"}</div>
            </div>
          </div>

          {homeBoardAuthBlocked && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {diagnosticsLabels.domain_home_board.messaging.authBlocked}
            </div>
          )}

          {homeBoardFirst ? (
            <>
              <div className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.boardId}</div>
                  <div className="font-medium">{homeBoardFirst.boardId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.boardType}</div>
                  <div className="font-medium">{homeBoardFirst.boardType || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.domainId}</div>
                  <div className="font-medium">{homeBoardFirst.domainId || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.frames}</div>
                  <div className="font-medium">{homeBoardFirst.frameCount}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.domain_home_board.labels.framesDetail}</div>
                {homeBoardFrames.length === 0 ? (
                  <div className="text-sm text-gray-600">{diagnosticsLabels.domain_home_board.messaging.noFrames}</div>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {homeBoardFrames.map((frame, index) => (
                      <li key={frame.id ?? `${frame.name}-${index}`}>
                        {frame.role ? `${frame.role} • ` : ""}
                        {frame.name || frame.id || "Untitled"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {homeBoardFirst.error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                  {homeBoardFirst.error}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 text-sm text-gray-600">{diagnosticsLabels.domain_home_board.messaging.emptyState}</div>
          )}
        </section>

        {logs.length > 0 && (
          <section className="rounded-2xl border border-black/10 bg-black/90 p-4 text-green-200 shadow-sm">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold">{diagnosticsLabels.live_progress.labels.heading}</span>
              <span className="text-xs text-green-300">{logs.length} entries</span>
            </div>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">{logs.join("\n")}</pre>
          </section>
        )}

        {results?.summary && (
          <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{diagnosticsLabels.summary.labels.heading}</h3>
              <span className="text-sm text-gray-500">{results.summary.score} tests</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
                <div className="text-2xl font-semibold text-gray-900">{results.summary.total}</div>
                <div className="text-xs text-gray-500">{diagnosticsLabels.summary.labels.total}</div>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50/70 p-4">
                <div className="text-2xl font-semibold text-green-700">{results.summary.passed}</div>
                <div className="text-xs text-green-700">{diagnosticsLabels.summary.labels.passed}</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                <div className="text-2xl font-semibold text-red-600">{results.summary.failed}</div>
                <div className="text-xs text-red-600">{diagnosticsLabels.summary.labels.failed}</div>
              </div>
              <div className="rounded-xl border border-[#C96E59]/20 bg-[#C96E59]/10 p-4">
                <div className="text-2xl font-semibold text-[#C96E59]">{results.summary.percentage}%</div>
                <div className="text-xs text-[#C96E59]">{diagnosticsLabels.summary.labels.success}</div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{diagnosticsLabels.agent_diagnostics.labels.heading}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {diagnosticsLabels.agent_diagnostics.messaging.description}
          </p>
          <div className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.agent_diagnostics.labels.authStatus}</div>
              <div className="font-medium">{isAuthenticated ? diagnosticsLabels.agent_diagnostics.labels.authAuthenticated : diagnosticsLabels.agent_diagnostics.labels.authGuest}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.agent_diagnostics.labels.userId}</div>
              <div className="font-medium">{user?.id || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.agent_diagnostics.labels.domainResolution}</div>
              <div className="font-medium">
                {domainContext.domainSlug ? `${domainContext.domainSlug} (${domainContext.domainId || "unresolved"})` : "—"}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.agent_diagnostics.labels.consoleLogs}</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                {consoleLogs.length === 0
                  ? diagnosticsLabels.agent_diagnostics.messaging.noConsoleLogs
                  : consoleLogs
                      .slice(-MAX_AGENT_LOGS)
                      .map((entry) => `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}`)
                      .join("\n")}
              </pre>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.agent_diagnostics.labels.networkRequests}</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-700">
                {networkLogs.length === 0
                  ? diagnosticsLabels.agent_diagnostics.messaging.noNetworkRequests
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
            <h3 className="text-base font-semibold text-gray-900">{diagnosticsLabels.board_error.labels.heading}</h3>
            <div className="mt-3 grid gap-2 text-sm text-gray-700">
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.board_error.labels.reqId}</span>
                <div className="font-medium">{lastBoardDataError.reqId || "—"}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.board_error.labels.url}</span>
                <div className="font-medium">{lastBoardDataError.url}</div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.board_error.labels.status}</span>
                  <div className="font-medium">{lastBoardDataError.status ?? "—"}</div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.board_error.labels.boardId}</span>
                  <div className="font-medium">{lastBoardDataError.boardId ?? "—"}</div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">{diagnosticsLabels.board_error.labels.at}</span>
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
                {diagnosticsLabels.run_diagnostics.labels.viewDetailedJson}
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-gray-100 bg-white/80 p-4 text-xs text-gray-700">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <div className="font-semibold">{diagnosticsLabels.critical_error.labels.heading}</div>
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
            {diagnosticsLabels.run_diagnostics.labels.clearButton}
          </button>
          <span>{diagnosticsLabels.run_diagnostics.messaging.footerNote}</span>
        </div>
      </div>
    </DesignFrame>
  )
}

