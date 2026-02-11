/**
 * useWorkspaceMode
 * Generic hook for URL-driven workspace mode state.
 *
 * Manages a "mode" value persisted in a URL search param. The hook reads
 * the current mode, validates it against a list of allowed modes, falls
 * back to a default, and provides a setter that updates the URL.
 *
 * Each frame brings its own mode list — this hook only provides the
 * mechanism, not the specific modes.
 *
 * @example
 * // Domain Commons
 * const MODES = ["observe", "focus", "build", "reflect"] as const
 * type Mode = (typeof MODES)[number]
 * const [mode, setMode] = useWorkspaceMode<Mode>(MODES, "observe")
 *
 * @example
 * // Agent workspace
 * const MODES = ["dialogue", "review", "history"] as const
 * type Mode = (typeof MODES)[number]
 * const [mode, setMode] = useWorkspaceMode<Mode>(MODES, "dialogue")
 */

import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * @param allowedModes  — readonly tuple of valid mode strings
 * @param defaultMode   — mode to use when the URL param is missing or invalid
 * @param paramName     — URL search param name (defaults to "experience")
 * @returns [currentMode, setMode] — current resolved mode and a setter
 */
export function useWorkspaceMode<T extends string>(
  allowedModes: readonly T[],
  defaultMode: T,
  paramName = "experience",
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(paramName)?.toLowerCase() ?? ""
  const currentMode: T = (allowedModes as readonly string[]).includes(raw)
    ? (raw as T)
    : defaultMode

  const setMode = useCallback(
    (next: T) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set(paramName, next)
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams, paramName],
  )

  return [currentMode, setMode]
}

export default useWorkspaceMode
